import { createServerFn } from "@tanstack/react-start";
import { getAllUserJobs } from "@/src/lib/workflow-jobs-api";
import { fetchSession } from "@/lib/server/fetch-session-server-fn";
import type { JobWithMetadata } from "@repo/redis-queue/types";

export type JobsPageLoaderData = {
  jobs: JobWithMetadata[];
};

export const loadJobsPageData = createServerFn({ method: "GET" }).handler(
  async (): Promise<JobsPageLoaderData> => {
    const session = await fetchSession();
    if (!session?.user?.id) {
      return { jobs: [] };
    }
    const jobs = await getAllUserJobs(session.user.id);
    return { jobs };
  },
);
