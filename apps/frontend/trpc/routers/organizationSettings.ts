import {
  createTRPCRouter,
  protectedProcedure,
} from "../init";
import { after } from "@/lib/after";
import { revalidatePath } from "@/lib/cache-invalidation";
import { ensureDefaultCriteriaProfile, rescreenAllDealOpportunities } from "@repo/deal-screening";
import {
  assertOrgAdmin,
  requireResolvedOrganizationId,
} from "../org-context";
import db, { asc, eq } from "@repo/db";
import { getActiveInvestmentCriteriaProfile } from "@repo/db/queries";
import { upsertActiveInvestmentCriteriaProfile } from "@repo/db/mutations";
import { updateInvestmentCriteriaProfileSchema } from "@repo/schemas";
import {
  organizationPlaybooks,
  organizationPlaybookLevers,
} from "@repo/db/schema";
import { z } from "zod";

const playbookInputSchema = z.object({
  title: z.string().trim().min(1),
  summaryMd: z.string().trim().nullable(),
  levers: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        descriptionMd: z.string().trim().nullable(),
      }),
    )
    .min(1),
});

const DEFAULT_PLAYBOOK = {
  title: "Value Creation Playbook",
  summaryMd:
    "Core levers the firm uses to underwrite and create value after investment.",
  levers: [
    { name: "Pricing", descriptionMd: "Pricing power, packaging, and commercial discipline." },
    { name: "Commercial excellence", descriptionMd: "Pipeline, conversion, and customer expansion." },
    { name: "Operational efficiency", descriptionMd: "Process simplification, SG&A, and margin improvement." },
    { name: "Bolt-ons", descriptionMd: "M&A adjacency, roll-up logic, and integration readiness." },
    { name: "Digital and AI", descriptionMd: "Automation, ERP cleanup, and workflow tooling." },
  ],
} as const;

function scheduleCriteriaRevalidation() {
  after(async () => {
    revalidatePath("/settings/investment-criteria");
  });
}

export const organizationSettingsRouter = createTRPCRouter({
  getInvestmentCriteria: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = await requireResolvedOrganizationId(ctx);
    return await ensureDefaultCriteriaProfile(organizationId);
  }),

  updateInvestmentCriteria: protectedProcedure
    .input(updateInvestmentCriteriaProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireResolvedOrganizationId(ctx);
      await assertOrgAdmin(ctx, organizationId);

      const current = await getActiveInvestmentCriteriaProfile(
        input.key,
        organizationId,
      );
      const nextVersion = String((Number(current?.version ?? input.version) || 1) + 1);

      const saved = await upsertActiveInvestmentCriteriaProfile(
        input.key,
        organizationId,
        {
          version: nextVersion,
          firmName: input.firmName,
          ebitdaMin: input.ebitdaMin,
          ebitdaMax: input.ebitdaMax,
          revenueMin: input.revenueMin,
          revenueMax: input.revenueMax,
          ebitdaMarginMin: input.ebitdaMarginMin,
          preferredIndustries: input.preferredIndustries,
          excludedIndustries: input.excludedIndustries,
          geographies: input.geographies,
          ownershipNotes: input.ownershipNotes,
          customerConcentrationIdealMax: input.customerConcentrationIdealMax,
          customerConcentrationWarnAbove: input.customerConcentrationWarnAbove,
          positiveScreensMd: input.positiveScreensMd,
          negativeScreensMd: input.negativeScreensMd,
          weightEbitdaFit: input.weightEbitdaFit,
          weightRevenue: input.weightRevenue,
          weightIndustry: input.weightIndustry,
          revenueScoreWhenMissing: input.revenueScoreWhenMissing,
          revenueScoreBands: input.revenueScoreBands,
          criteriaNarrativeMd: input.criteriaNarrativeMd,
          icRubricMd: input.icRubricMd,
        },
      );

      scheduleCriteriaRevalidation();
      return saved;
    }),

  rescreenAllDeals: protectedProcedure.mutation(async ({ ctx }) => {
    const organizationId = await requireResolvedOrganizationId(ctx);
    await assertOrgAdmin(ctx, organizationId);
    const results = await rescreenAllDealOpportunities(organizationId);
    return { rescoredCount: results.length };
  }),

  getPlaybook: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = await requireResolvedOrganizationId(ctx);

    const [playbook] = await db
      .select()
      .from(organizationPlaybooks)
      .where(eq(organizationPlaybooks.organizationId, organizationId))
      .limit(1);

    if (!playbook) {
      const [created] = await db
        .insert(organizationPlaybooks)
        .values({
          organizationId,
          title: DEFAULT_PLAYBOOK.title,
          summaryMd: DEFAULT_PLAYBOOK.summaryMd,
        })
        .returning();

      if (!created) return null;

      const levers = await db
        .insert(organizationPlaybookLevers)
        .values(
          DEFAULT_PLAYBOOK.levers.map((lever, index) => ({
            playbookId: created.id,
            name: lever.name,
            descriptionMd: lever.descriptionMd,
            sortOrder: index,
          })),
        )
        .returning();

      return { ...created, levers };
    }

    const levers = await db
      .select()
      .from(organizationPlaybookLevers)
      .where(eq(organizationPlaybookLevers.playbookId, playbook.id))
      .orderBy(
        asc(organizationPlaybookLevers.sortOrder),
        asc(organizationPlaybookLevers.name),
      );

    return { ...playbook, levers };
  }),

  updatePlaybook: protectedProcedure
    .input(playbookInputSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireResolvedOrganizationId(ctx);
      await assertOrgAdmin(ctx, organizationId);

      const [existing] = await db
        .select()
        .from(organizationPlaybooks)
        .where(eq(organizationPlaybooks.organizationId, organizationId))
        .limit(1);

      const playbook =
        existing ??
        (
          await db
            .insert(organizationPlaybooks)
            .values({
              organizationId,
              title: input.title,
              summaryMd: input.summaryMd,
            })
            .returning()
        )[0];

      if (!playbook) {
        throw new Error("Failed to save playbook");
      }

      await db
        .update(organizationPlaybooks)
        .set({
          title: input.title,
          summaryMd: input.summaryMd,
          updatedAt: new Date(),
        })
        .where(eq(organizationPlaybooks.id, playbook.id));

      await db
        .delete(organizationPlaybookLevers)
        .where(eq(organizationPlaybookLevers.playbookId, playbook.id));

      const levers = await db
        .insert(organizationPlaybookLevers)
        .values(
          input.levers.map((lever, index) => ({
            playbookId: playbook.id,
            name: lever.name,
            descriptionMd: lever.descriptionMd,
            sortOrder: index,
          })),
        )
        .returning();

      return { ...playbook, levers };
    }),
});
