import { createFileRoute } from "@tanstack/react-router";
import { DocumentsDataTable } from "@/components/documents/data-table";
import { loadDocumentsPageData } from "@/lib/server/documents-route-data";
import { columns } from "@/components/documents/columns";
import DocumentsTableSkeleton from "@/components/skeletons/DocumentsTableSkeleton";
import Pagination from "@/components/pagination";
import { GlobalDocumentUploadDialog } from "@/components/Dialogs/global-document-upload-dialog";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";
import {
  asNumber,
  looseValidateSearch,
  paginatedListLoaderDeps,
  type LooseSearch,
} from "@/lib/route-search";

export const Route = createFileRoute("/_protected/documents")({
  validateSearch: (search: Record<string, unknown>): LooseSearch =>
    looseValidateSearch(search),
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  loaderDeps: ({ search }) => paginatedListLoaderDeps(search),
  head: () => ({
    meta: [{ title: "Documents — Dark Alpha Capital" }],
  }),
  loader: async ({ location }) => {
    const search = location.search as LooseSearch;
    const currentPage = Math.max(1, asNumber(search.page, 1));
    const limit = Math.max(1, asNumber(search.limit, 25));
    const offset = (currentPage - 1) * limit;
    const page = await loadDocumentsPageData({ data: { offset, limit } });
    return { ...page, currentPage };
  },
  pendingComponent: DocumentsTableSkeleton,
  component: DocumentsRoute,
});

function DocumentsRoute() {
  const { data, totalPages } = Route.useLoaderData();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold md:text-5xl">Documents</h1>
          <p className="text-muted-foreground mt-2">
            All documents across companies, deals, investment themes, and firm
            library
          </p>
        </div>
        <GlobalDocumentUploadDialog />
      </div>

      <div>
        <div className="group-has-data-pending:animate-pulse">
          <DocumentsDataTable columns={columns} data={data} />
        </div>
        <div className="mt-8 flex justify-center">
          <Pagination totalPages={totalPages} />
        </div>
      </div>
    </section>
  );
}
