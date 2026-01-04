"use server";

import { TransformedDeal } from "../../app/types";
import db, { DealType, deals as dealsTable } from "db";
import { getSession } from "@/lib/auth-server";
import { rateLimit } from "@/lib/redis";
import { headers } from "next/headers";
import { updateTag } from "next/cache";

/**
 * Validation types for server-side deal validation
 */
type DealValidationError = {
  index: number;
  errors: string[];
};

type ValidationResult = {
  isValid: boolean;
  errors: DealValidationError[];
};

/**
 * Server-side validation for deals (defense in depth)
 */
const validateDeals = (deals: TransformedDeal[]): ValidationResult => {
  const errors: DealValidationError[] = [];

  deals.forEach((deal, index) => {
    const dealErrors: string[] = [];

    // Required string fields
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

    // Required numeric fields
    if (deal.revenue === undefined || deal.revenue === null || isNaN(Number(deal.revenue))) {
      dealErrors.push("Revenue must be a valid number");
    }
    if (deal.ebitda === undefined || deal.ebitda === null || isNaN(Number(deal.ebitda))) {
      dealErrors.push("EBITDA must be a valid number");
    }
    if (deal.ebitdaMargin === undefined || deal.ebitdaMargin === null || isNaN(Number(deal.ebitdaMargin))) {
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

/**
 * Adds a list of transformed deals to the database using an atomic transaction.
 *
 * This function implements an ALL-OR-NOTHING approach:
 * - All deals are validated before any database operations
 * - If validation fails for any deal, no deals are uploaded
 * - The database insert is wrapped in a transaction to ensure atomicity
 *
 * @param {TransformedDeal[]} deals - An array of deals conforming to the `TransformedDeal` type.
 * @returns {Promise<{ success?: string; error?: string; validationErrors?: DealValidationError[] }>}
 *          Returns success message, error message, or validation errors.
 */
const BulkUploadDealsToDB = async (deals: TransformedDeal[]) => {
  const userSession = await getSession();

  if (!userSession) {
    return {
      error: "Unauthorized user",
    };
  }

  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const { ok } = await rateLimit(
    `api:bulk-upload-deal:${ip}`,
    10, // 10 requests per minute
    60_000 // 1 minute
  );

  if (!ok) {
    console.log("Rate limit exceeded for bulk upload db");

    return {
      error: "Too many requests. Please try again later.",
    };
  }

  if (!Array.isArray(deals) || deals.length === 0) {
    return {
      error: "No deals provided for bulk upload.",
    };
  }

  console.log("deals received", deals.length);

  // Server-side validation (defense in depth)
  const validation = validateDeals(deals);
  if (!validation.isValid) {
    const errorCount = validation.errors.length;
    console.log(`Server-side validation failed for ${errorCount} deal(s)`);
    return {
      error: `Validation failed for ${errorCount} deal(s). Please fix the errors and try again.`,
      validationErrors: validation.errors,
    };
  }

  try {
    // Use a transaction to ensure all-or-nothing behavior
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
          userId: userSession.user?.id,
        }))
      );
    });

    updateTag("deals");

    return {
      success: `${deals.length} deal(s) uploaded successfully.`,
    };
  } catch (error) {
    console.error("Bulk upload error:", error);

    // Check if it's a database constraint error
    if (error instanceof Error) {
      if (error.message.includes("unique") || error.message.includes("duplicate")) {
        return {
          error: "One or more deals already exist in the database. No deals were uploaded.",
        };
      }
      if (error.message.includes("constraint")) {
        return {
          error: "Database constraint violation. Please check your data and try again. No deals were uploaded.",
        };
      }
    }

    return {
      error: "Bulk upload failed due to a server error. No deals were uploaded.",
    };
  }
};

export default BulkUploadDealsToDB;
