import { DealType } from "@repo/db/enums";
import { rateLimit } from "@/src/lib/rate-limit";
import { createServerFn } from "@tanstack/react-start";
import { updateTag } from "@/lib/cache-invalidation";
import { assertAuthenticated } from "@/lib/server/assert-session";
import { bulkUploadDealsInputSchema } from "@/lib/server/server-fn-input-schemas";
import type { TransformedDeal } from "@/lib/route-domain-types";

type DealValidationError = {
  index: number;
  errors: string[];
};

type ValidationResult = {
  isValid: boolean;
  errors: DealValidationError[];
};

const validateDeals = (deals: TransformedDeal[]): ValidationResult => {
  const errors: DealValidationError[] = [];

  deals.forEach((deal, index) => {
    const dealErrors: string[] = [];

    if (!deal.brokerage || deal.brokerage.trim() === "") {
      dealErrors.push("Brokerage is required");
    }
    if (!deal.dealCaption || deal.dealCaption.trim() === "") {
      dealErrors.push("Deal Caption is required");
    }
    if (!deal.industry || deal.industry.trim() === "") {
      dealErrors.push("Industry is required");
    }
    if (!deal.sourceWebsite || deal.sourceWebsite.trim() === "") {
      dealErrors.push("Source Website is required");
    }

    if (deal.revenue === undefined || deal.revenue === null || isNaN(Number(deal.revenue))) {
      dealErrors.push("Revenue must be a valid number");
    }
    if (deal.ebitda === undefined || deal.ebitda === null || isNaN(Number(deal.ebitda))) {
      dealErrors.push("EBITDA must be a valid number");
    }
    if (
      deal.ebitdaMargin === undefined ||
      deal.ebitdaMargin === null ||
      isNaN(Number(deal.ebitdaMargin))
    ) {
      dealErrors.push("EBITDA Margin must be a valid number");
    }

    if (dealErrors.length > 0) {
      errors.push({ index: index + 1, errors: dealErrors });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const bulkUploadDealsToDB = createServerFn({ method: "POST" })
  .validator((raw: unknown) => bulkUploadDealsInputSchema.parse(raw))
  .handler(async ({ data: deals }) => {
    const userSession = await assertAuthenticated();

    const { getRequestHeader } = await import("@tanstack/react-start/server");

    const ip =
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const { ok } = await rateLimit(
      `api:bulk-upload-deal:${ip}`,
      10,
      60_000,
    );

    if (!ok) {
      console.log("Rate limit exceeded for bulk upload db");

      return {
        error: "Too many requests. Please try again later.",
      };
    }

    console.log("deals received", deals.length);

    const validation = validateDeals(deals as TransformedDeal[]);
    if (!validation.isValid) {
      const errorCount = validation.errors.length;
      console.log(`Server-side validation failed for ${errorCount} deal(s)`);
      return {
        error: `Validation failed for ${errorCount} deal(s). Please fix the errors and try again.`,
        validationErrors: validation.errors,
      };
    }

    try {
      const { default: db, deals: dealsTable } = await import("@repo/db");
      await db.transaction(async (tx) => {
        await tx.insert(dealsTable).values(
          deals.map((deal) => ({
            title: deal.dealCaption || null,
            dealCaption: deal.dealCaption || "",
            firstName: deal.firstName ? String(deal.firstName) : null,
            lastName: deal.lastName ? String(deal.lastName) : null,
            email: deal.email || null,
            linkedinUrl: deal.linkedinUrl || null,
            workPhone: deal.workPhone ? String(deal.workPhone) : null,
            revenue: Number(deal.revenue) || 0,
            ebitda: Number(deal.ebitda) || 0,
            ebitdaMargin: Number(deal.ebitdaMargin) || 0,
            industry: deal.industry || "",
            sourceWebsite: deal.sourceWebsite || "",
            companyLocation: deal.companyLocation
              ? String(deal.companyLocation)
              : null,
            brokerage: deal.brokerage || "",
            dealType: DealType.MANUAL,
            userId: userSession.user.id,
          })),
        );
      });

      updateTag("deals");

      return {
        success: `${deals.length} deal(s) uploaded successfully.`,
      };
    } catch (error) {
      console.error("Bulk upload error:", error);

      if (error instanceof Error) {
        if (error.message.includes("unique") || error.message.includes("duplicate")) {
          return {
            error:
              "One or more deals already exist in the database. No deals were uploaded.",
          };
        }
        if (error.message.includes("constraint")) {
          return {
            error:
              "Database constraint violation. Please check your data and try again. No deals were uploaded.",
          };
        }
      }

      return {
        error: "Bulk upload failed due to a server error. No deals were uploaded.",
      };
    }
  });

export default bulkUploadDealsToDB;
