import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, {
  investors,
  investorInteractions,
  investorCompanyLinks,
  eq,
  and,
  or,
  asc,
  desc,
  ilike,
} from "@repo/db";
import { after } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

const investorInteractionTypeEnum = z.enum([
  "EMAIL",
  "CALL",
  "MEETING",
  "EVENT",
  "INTRO",
]);

const investorTypeEnum = z.enum(["HNWI", "FAMILY_OFFICE", "INSTITUTION"]);
const investorStatusEnum = z.enum([
  "PROSPECT",
  "QUALIFIED",
  "ACTIVE",
  "INACTIVE",
]);
const investorRiskProfileEnum = z.enum([
  "CONSERVATIVE",
  "MODERATE",
  "BALANCED",
  "GROWTH",
  "AGGRESSIVE",
]);

const investorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: investorTypeEnum,
  primaryContactName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  geography: z.string().optional(),
  minCheckSize: z.string().optional(),
  maxCheckSize: z.string().optional(),
  sectorFocus: z.array(z.string()).optional(),
  stagePreference: z.array(z.string()).optional(),
  riskProfile: investorRiskProfileEnum.optional(),
  status: investorStatusEnum.optional(),
});

export const investorsRouter = createTRPCRouter({
  listForSelect: protectedProcedure.query(async () => {
    return db
      .select({ id: investors.id, name: investors.name })
      .from(investors)
      .orderBy(asc(investors.name));
  }),

  searchForLink: protectedProcedure
    .input(
      z.object({
        query: z.string().trim().min(2).max(200),
        limit: z.number().int().min(1).max(50).optional().default(20),
      }),
    )
    .query(async ({ input }) => {
      const pattern = `%${input.query}%`;
      return db
        .select({
          id: investors.id,
          name: investors.name,
          email: investors.email,
        })
        .from(investors)
        .where(
          or(ilike(investors.name, pattern), ilike(investors.email, pattern)),
        )
        .orderBy(asc(investors.name))
        .limit(input.limit);
    }),

  create: protectedProcedure
    .input(investorSchema)
    .mutation(async ({ input }) => {
      const [added] = await db
        .insert(investors)
        .values({
          name: input.name,
          type: input.type,
          primaryContactName: input.primaryContactName || null,
          email: input.email || null,
          phone: input.phone || null,
          geography: input.geography || null,
          minCheckSize: input.minCheckSize || null,
          maxCheckSize: input.maxCheckSize || null,
          sectorFocus: input.sectorFocus || null,
          stagePreference: input.stagePreference || null,
          riskProfile: input.riskProfile || null,
          status: input.status ?? "PROSPECT",
        })
        .returning();

      after(async () => {
        revalidatePath("/investors");
        revalidateTag("investors", "max");
      });
      return { investorId: added?.id };
    }),

  update: protectedProcedure
    .input(investorSchema.extend({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db
        .update(investors)
        .set({
          name: data.name,
          type: data.type,
          primaryContactName: data.primaryContactName || null,
          email: data.email || null,
          phone: data.phone || null,
          geography: data.geography || null,
          minCheckSize: data.minCheckSize || null,
          maxCheckSize: data.maxCheckSize || null,
          sectorFocus: data.sectorFocus || null,
          stagePreference: data.stagePreference || null,
          riskProfile: data.riskProfile || null,
          status: data.status ?? "PROSPECT",
        })
        .where(eq(investors.id, id));

      after(async () => {
        revalidatePath("/investors");
        revalidatePath(`/investors/${id}`);
        revalidatePath(`/investors/${id}/edit`);
        revalidateTag("investors", "max");
        revalidateTag(`investor-${id}`, "max");
      });
      return { investorId: id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(investors).where(eq(investors.id, input.id));
      after(async () => {
        revalidatePath("/investors");
        revalidateTag("investors", "max");
        revalidateTag(`investor-${input.id}`, "max");
      });
      return { success: true };
    }),

  addInvestorCompanyLink: protectedProcedure
    .input(
      z.object({
        investorId: z.string(),
        companyId: z.string(),
        notes: z.string().optional(),
        status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [dup] = await db
        .select({ id: investorCompanyLinks.id })
        .from(investorCompanyLinks)
        .where(
          and(
            eq(investorCompanyLinks.investorId, input.investorId),
            eq(investorCompanyLinks.companyId, input.companyId),
          ),
        )
        .limit(1);

      if (dup) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This investor is already linked to that company.",
        });
      }

      await db.insert(investorCompanyLinks).values({
        investorId: input.investorId,
        companyId: input.companyId,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        status: input.status ?? "ACTIVE",
      });

      after(async () => {
        revalidatePath(`/investors/${input.investorId}`);
        revalidatePath(`/investors/${input.investorId}/edit`);
        revalidatePath(`/companies/${input.companyId}`);
        revalidateTag(`investor-${input.investorId}`, "max");
        revalidateTag(`company-${input.companyId}`, "max");
        revalidateTag("investors", "max");
      });

      return { success: true };
    }),

  updateInvestorCompanyLink: protectedProcedure
    .input(
      z.object({
        linkId: z.string(),
        notes: z.string().optional(),
        status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const updates: {
        notes?: string | null;
        status?: "ACTIVE" | "ARCHIVED";
      } = {};
      if (input.notes !== undefined) {
        updates.notes = input.notes.trim() ? input.notes.trim() : null;
      }
      if (input.status !== undefined) updates.status = input.status;

      if (Object.keys(updates).length === 0) {
        return { success: true as const };
      }

      const [row] = await db
        .update(investorCompanyLinks)
        .set(updates)
        .where(eq(investorCompanyLinks.id, input.linkId))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Link not found.",
        });
      }

      after(async () => {
        revalidatePath(`/investors/${row.investorId}`);
        revalidatePath(`/investors/${row.investorId}/edit`);
        revalidatePath(`/companies/${row.companyId}`);
        revalidateTag(`investor-${row.investorId}`, "max");
        revalidateTag(`company-${row.companyId}`, "max");
        revalidateTag("investors", "max");
      });

      return { success: true };
    }),

  removeInvestorCompanyLink: protectedProcedure
    .input(z.object({ linkId: z.string() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .delete(investorCompanyLinks)
        .where(eq(investorCompanyLinks.id, input.linkId))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Link not found.",
        });
      }

      after(async () => {
        revalidatePath(`/investors/${row.investorId}`);
        revalidatePath(`/investors/${row.investorId}/edit`);
        revalidatePath(`/companies/${row.companyId}`);
        revalidateTag(`investor-${row.investorId}`, "max");
        revalidateTag(`company-${row.companyId}`, "max");
        revalidateTag("investors", "max");
      });

      return { success: true };
    }),

  listInteractions: protectedProcedure
    .input(z.object({ investorId: z.string() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(investorInteractions)
        .where(eq(investorInteractions.investorId, input.investorId))
        .orderBy(desc(investorInteractions.createdAt));
    }),

  createInteraction: protectedProcedure
    .input(
      z.object({
        investorId: z.string(),
        type: investorInteractionTypeEnum,
        notes: z.string().optional(),
        outcome: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [added] = await db
        .insert(investorInteractions)
        .values({
          investorId: input.investorId,
          investorLeadId: null,
          type: input.type,
          notes: input.notes || null,
          outcome: input.outcome || null,
        })
        .returning();

      after(async () => {
        revalidatePath(`/investors/${input.investorId}`);
        revalidateTag(`investor-${input.investorId}`, "max");
      });

      return { investorInteractionId: added?.id };
    }),

  updateInteraction: protectedProcedure
    .input(
      z.object({
        investorId: z.string(),
        id: z.string(),
        type: investorInteractionTypeEnum.optional(),
        notes: z.string().optional(),
        outcome: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { investorId, id, ...data } = input;

      const updates: {
        type?: "EMAIL" | "CALL" | "MEETING" | "EVENT" | "INTRO" | null;
        notes?: string | null;
        outcome?: string | null;
      } = {};

      if (data.type !== undefined) updates.type = data.type;
      if (data.notes !== undefined) updates.notes = data.notes || null;
      if (data.outcome !== undefined) updates.outcome = data.outcome || null;

      if (Object.keys(updates).length === 0) return { investorInteractionId: id };

      await db
        .update(investorInteractions)
        .set(updates)
        .where(eq(investorInteractions.id, id));

      after(async () => {
        revalidatePath(`/investors/${investorId}`);
        revalidateTag(`investor-${investorId}`, "max");
      });

      return { investorInteractionId: id };
    }),

  deleteInteraction: protectedProcedure
    .input(z.object({ investorId: z.string(), id: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .delete(investorInteractions)
        .where(eq(investorInteractions.id, input.id));

      after(async () => {
        revalidatePath(`/investors/${input.investorId}`);
        revalidateTag(`investor-${input.investorId}`, "max");
      });

      return { success: true };
    }),
});
