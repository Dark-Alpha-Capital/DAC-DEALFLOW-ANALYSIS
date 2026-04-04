import { createServerFn } from "@tanstack/react-start";
import { getAllUserJobs } from "@/src/lib/workflow-jobs-api";
import { assertAuthenticated } from "@/lib/server/assert-session";
import type { JobWithMetadata } from "@repo/redis-queue/types";

export type JobsPageLoaderData = {
  jobs: JobWithMetadata[];
};

export const loadJobsPageData = createServerFn({ method: "GET" })
  // @ts-expect-error Start ServerFn R vs JobWithMetadata[] serialization in generics
  .handler(async () => {
    const session = await assertAuthenticated();
    const jobs = await getAllUserJobs(session.user.id);
    return { jobs };
  });
