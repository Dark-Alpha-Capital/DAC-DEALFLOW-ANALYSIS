import db from ".";

type BulkDeleteDealsResult =
  | { type: "success"; count: number; message: string }
  | { type: "error"; message: string; code?: string };

export const BulkDeleteDeals = async (
  dealIds: readonly string[],
  client: typeof db = db
): Promise<BulkDeleteDealsResult> => {
  if (!dealIds?.length) {
    return { type: "success", count: 0, message: "No deals to delete" };
  }

  try {
    const { count } = await client.deal.deleteMany({
      where: { id: { in: dealIds as string[] } },
    });
    return {
      type: "success",
      count,
      message: `${count} deal${count === 1 ? "" : "s"} deleted successfully`,
    };
  } catch (error: unknown) {
    console.error("Error deleting deals:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    const code =
      typeof error === "object" && error && "code" in error
        ? (error.code as string | undefined)
        : undefined;

    return {
      type: "error",
      message: `Failed to delete deals: ${message}`,
      code,
    };
  }
};

/**
 * Delete a company by id
 * @param companyId - the id of the company to delete
 * @returns { type: "success" | "error"; message: string; code?: string }
 */
export const DeleteCompanyById = async (companyId: string) => {
  try {
    await db.company.delete({
      where: { id: companyId },
    });
    return {
      type: "success",
      message: "Company deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting company:", error);
    throw error;
  }
};
