import { Suspense } from "react";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { GetAllDocuments } from "db/queries";
import { DocumentsDataTable } from "./data-table";
import { columns } from "./columns";
import DocumentsTableSkeleton from "@/components/skeletons/DocumentsTableSkeleton";
import Pagination from "@/components/pagination";

export const metadata: Metadata = {
  title: "Documents",
  description: "View all documents across companies, deals, and leads",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asNumber(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(typeof value === "string" ? value : value?.[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const DocumentsPage = (props: { searchParams: SearchParams }) => {
  const sessionPromise = getSession();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8">
        <h1 className="text-4xl font-bold md:text-5xl">Documents</h1>
        <p className="mt-2 text-muted-foreground">
          All documents across companies, deals, and leads
        </p>
      </div>

      <Suspense fallback={<DocumentsTableSkeleton />}>
        <AuthedDocuments searchParams={props.searchParams} sessionPromise={sessionPromise} />
      </Suspense>
    </section>
  );
};

export default DocumentsPage;

async function AuthedDocuments(props: {
  searchParams: SearchParams;
  sessionPromise: ReturnType<typeof getSession>;
}) {
  const [resolvedSearchParams, userSession] = await Promise.all([
    props.searchParams,
    props.sessionPromise,
  ]);
  if (!userSession?.user) {
    redirect("/auth/login");
  }

  return (
    <Suspense fallback={<DocumentsTableSkeleton />}>
      <FetchAndDisplayDocuments searchParams={resolvedSearchParams} />
    </Suspense>
  );
}

async function FetchAndDisplayDocuments(props: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const searchParams = props.searchParams;
  const currentPage = Math.max(1, asNumber(searchParams.page, 1));
  const limit = Math.max(1, asNumber(searchParams.limit, 50));
  const offset = (currentPage - 1) * limit;

  return (
    <FetchAndDisplayDocumentsInner
      offset={offset}
      limit={limit}
      currentPage={currentPage}
    />
  );
}

async function FetchAndDisplayDocumentsInner({
  offset,
  limit,
  currentPage,
}: {
  offset: number;
  limit: number;
  currentPage: number;
}) {
  "use cache";
  cacheTag("documents");
  cacheLife("hours");

  const { data, totalPages } = await GetAllDocuments({ offset, limit });

  return (
    <div>
      <div className="group-has-data-pending:animate-pulse">
        <DocumentsDataTable columns={columns} data={data} />
      </div>
      <div className="mt-8 flex justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}
