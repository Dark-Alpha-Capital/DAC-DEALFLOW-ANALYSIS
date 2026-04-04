import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { JobsPageSkeleton } from "@/components/skeletons/jobs-page-skeleton";
import { ShowJobsComponent } from "@/components/jobs/show-jobs-component";
import { loadJobsPageData } from "@/lib/server/jobs-route-data";

export const Route = createFileRoute("/_protected/jobs")({
  validateSearch: (search: Record<string, unknown>) => ({
    jobId:
      typeof search.jobId === "string"
        ? search.jobId
        : Array.isArray(search.jobId)
          ? String(search.jobId[0])
          : undefined,
  }),
  head: () => ({
    meta: [{ title: "Jobs — Dark Alpha Capital" }],
  }),
  loader: async () => loadJobsPageData(),
  component: JobsRoute,
});

function JobsRoute() {
  const { jobId } = Route.useSearch();
  const { jobs } = Route.useLoaderData();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-4xl font-bold md:mb-6 lg:mb-8">Jobs</h1>
        <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
          Track the progress of your background jobs including deal screening
          and file uploads.
        </p>
      </div>

      <Suspense fallback={<JobsPageSkeleton />}>
        <ShowJobsComponent focusedJobId={jobId ?? null} jobs={jobs} />
      </Suspense>
    </section>
  );
}
