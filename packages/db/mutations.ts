import { db } from ".";
import {
  deals,
  companies,
  pocs,
  screeners,
  aiScreenings,
  questionnaires,
} from "./schema";
import { eq, inArray } from "drizzle-orm";

export const BulkDeleteDeals = async (dealIds: readonly string[]) => {
  try {
    if (!dealIds?.length) {
      throw new Error("No deals to delete");
    }

    await db.delete(deals).where(inArray(deals.id, dealIds as string[]));
  } catch (error) {
    console.error("Error deleting deals:", error);
    throw error;
  }
};

/**
 * Delete a company by id
 * @param companyId - the id of the company to delete
 * @returns { type: "success" | "error"; message: string; code?: string }
 */
export const DeleteCompanyById = async (companyId: string) => {
  try {
    await db.delete(companies).where(eq(companies.id, companyId));
    return {
      type: "success",
      message: "Company deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting company:", error);
    throw error;
  }
};

/**
 * Delete a deal by id
 * @param dealId - the id of the deal to delete
 */
export const DeleteDealById = async (dealId: string) => {
  try {
    await db.delete(deals).where(eq(deals.id, dealId));
  } catch (error) {
    console.error("Error deleting deal:", error);
    throw error;
  }
};

export const DeletePOCById = async (pocId: string) => {
  try {
    await db.delete(pocs).where(eq(pocs.id, pocId));
  } catch (error) {
    console.error("Error deleting poc:", error);
    throw error;
  }
};

export const DeleteScreenerById = async (screenerId: string) => {
  try {
    await db.delete(screeners).where(eq(screeners.id, screenerId));
  } catch (error) {
    console.error("Error deleting screener:", error);
    throw error;
  }
};

/**
 * Delete a reasoning by id
 * @param reasoningId - the id of the reasoning to delete
 */
export const DeleteReasoningById = async (reasoningId: string) => {
  try {
    await db.delete(aiScreenings).where(eq(aiScreenings.id, reasoningId));
  } catch (error) {
    console.error("Error deleting reasoning:", error);
    throw error;
  }
};

/**
 * Delete a baseline by id
 * @param questionnaireId - the id of the questionnaire to delete
 */
export const DeleteQuestionnaireById = async (questionnaireId: string) => {
  try {
    await db
      .delete(questionnaires)
      .where(eq(questionnaires.id, questionnaireId));
  } catch (error) {
    console.error("Error deleting questionnaire:", error);
    throw error;
  }
};
