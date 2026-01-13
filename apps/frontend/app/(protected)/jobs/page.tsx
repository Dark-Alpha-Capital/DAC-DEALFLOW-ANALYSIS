import React, { Suspense } from "react";
import { Metadata } from "next";
import { JobsPageSkeleton } from "@/components/skeletons/jobs-page-skeleton";
import { ShowJobsComponent } from "./show-jobs-component";

export const metadata: Metadata = {
  title: "Jobs",
  description: "Track the progress of your background jobs",
};

type SearchParams = Promise<{ [key: string]: string | undefined }>;

const JobsPage = async (props: { searchParams: SearchParams }) => {
  const searchParams = await props.searchParams;
  const focusedJobId = searchParams?.jobId || null;

  return (
    <section className="block-space-mini group container">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-4xl font-bold md:mb-6 lg:mb-8">Jobs</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Track the progress of your background jobs including deal screening,
          file uploads, and deal-to-company conversions.
        </p>
      </div>

      <Suspense fallback={<JobsPageSkeleton />}>
        <ShowJobsComponent focusedJobId={focusedJobId} />
      </Suspense>
    </section>
  );
};

export default JobsPage;
