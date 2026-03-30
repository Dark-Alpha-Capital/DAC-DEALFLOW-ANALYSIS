import { createServerFn } from "@tanstack/react-start";
import { GetAllDocuments } from "@repo/db/queries";

export const loadDocumentsPageData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { offset: number; limit: number })
  .handler(async ({ data }) => {
    const { data: rows, totalPages } = await GetAllDocuments({
      offset: data.offset,
      limit: data.limit,
    });
    return { data: rows, totalPages };
  });
