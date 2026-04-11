import { db } from "..";
import {
  themes,
  theses,
  industryIntelligence,
  themePerformance,
  themeCompanyCoverage,
  companies,
} from "../schema";
import { and, eq, isNull } from "drizzle-orm";

export async function insertThemeRow(
  values: typeof themes.$inferInsert,
) {
  const [added] = await db.insert(themes).values(values).returning();
  return added ?? null;
}

export async function updateThemeById(
  id: string,
  values: Omit<Partial<typeof themes.$inferInsert>, "id">,
) {
  await db
    .update(themes)
    .set(values)
    .where(and(eq(themes.id, id), isNull(themes.deletedAt)));
}

export async function softDeleteThemeById(id: string) {
  await db
    .update(themes)
    .set({ deletedAt: new Date() })
    .where(and(eq(themes.id, id), isNull(themes.deletedAt)));
}

export async function thesisCreateVersionTx(input: {
  themeId: string;
  summary: string;
  macroDrivers: string[] | null;
  mispricingHypothesis: string | null;
  valueCreationLevers: string[] | null;
  exitLogic: string | null;
  riskFactors: string[] | null;
  version: string;
}) {
  await db.transaction(async (tx) => {
    await tx
      .update(theses)
      .set({ isActive: false })
      .where(and(eq(theses.themeId, input.themeId), eq(theses.isActive, true)));

    await tx.insert(theses).values({
      themeId: input.themeId,
      summary: input.summary,
      macroDrivers: input.macroDrivers?.length ? input.macroDrivers : null,
      mispricingHypothesis: input.mispricingHypothesis || null,
      valueCreationLevers: input.valueCreationLevers?.length
        ? input.valueCreationLevers
        : null,
      exitLogic: input.exitLogic || null,
      riskFactors: input.riskFactors?.length ? input.riskFactors : null,
      version: input.version,
      isActive: true,
    });
  });
}

export async function intelligenceCreateVersionTx(
  row: typeof industryIntelligence.$inferInsert,
) {
  const themeId = row.themeId;
  if (!themeId) throw new Error("intelligenceCreateVersionTx: themeId required");
  await db.transaction(async (tx) => {
    await tx
      .update(industryIntelligence)
      .set({ isActive: false })
      .where(
        and(
          eq(industryIntelligence.themeId, themeId),
          eq(industryIntelligence.isActive, true),
        ),
      );

    await tx.insert(industryIntelligence).values(row);
  });
}

export async function insertThemePerformanceSnapshot(
  values: typeof themePerformance.$inferInsert,
) {
  await db.insert(themePerformance).values(values);
}

export async function deleteThemePerformanceSnapshot(
  themeId: string,
  id: string,
) {
  await db
    .delete(themePerformance)
    .where(
      and(eq(themePerformance.id, id), eq(themePerformance.themeId, themeId)),
    );
}

export async function getCompanyThemeForCoverage(
  companyId: string,
  themeId: string,
) {
  const [company] = await db
    .select({ id: companies.id, themeId: companies.themeId })
    .from(companies)
    .where(and(eq(companies.id, companyId), isNull(companies.deletedAt)))
    .limit(1);
  return company ?? null;
}

export async function findThemeCoverageRow(themeId: string, companyId: string) {
  const [existing] = await db
    .select({ id: themeCompanyCoverage.id })
    .from(themeCompanyCoverage)
    .where(
      and(
        eq(themeCompanyCoverage.themeId, themeId),
        eq(themeCompanyCoverage.companyId, companyId),
      ),
    )
    .limit(1);
  return existing ?? null;
}

export async function updateThemeCoverageById(
  id: string,
  values: {
    coverageStatus: (typeof themeCompanyCoverage.$inferSelect)["coverageStatus"];
    lastOutreachAt: Date | null;
    notes: string | null;
  },
) {
  await db.update(themeCompanyCoverage).set(values).where(eq(themeCompanyCoverage.id, id));
}

export async function insertThemeCoverageRow(
  values: typeof themeCompanyCoverage.$inferInsert,
) {
  await db.insert(themeCompanyCoverage).values(values);
}

export async function deleteThemeCoverageRow(themeId: string, id: string) {
  await db
    .delete(themeCompanyCoverage)
    .where(
      and(
        eq(themeCompanyCoverage.id, id),
        eq(themeCompanyCoverage.themeId, themeId),
      ),
    );
}
