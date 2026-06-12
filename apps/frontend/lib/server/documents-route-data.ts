import { createServerFn } from "@tanstack/react-start";
import { GetAllDocuments } from "@repo/db/queries";
import { assertAuthenticated } from "@/lib/server/assert-session";
import { offsetLimitSchema } from "@/lib/server/server-fn-input-schemas";

export const loadDocumentsPageData = createServerFn({ method: "GET" })
  .validator((raw: unknown) => offsetLimitSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
    const { data: rows, totalPages } = await GetAllDocuments({
      offset: data.offset,
      limit: data.limit,
    });
    return { data: rows, totalPages };
  });
