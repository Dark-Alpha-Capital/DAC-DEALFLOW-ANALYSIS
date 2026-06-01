import { createFileRoute } from "@tanstack/react-router";
import db, { projectKickoffs, eq } from "@repo/db";
import { getJobStatus } from "../../../lib/workflow-jobs-api";

export const Route = createFileRoute("/api/project-kickoff/status/$jobId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { jobId } = params;

        if (!jobId?.trim()) {
          return Response.json({ error: "jobId is required" }, { status: 400 });
        }

        const status = await getJobStatus("project-kickoff-screen", jobId);

        if (!status) {
          return Response.json({ error: "Job not found" }, { status: 404 });
        }

        // When the job is completed, also return the score and analysis
        // directly from the project row as the source of truth
        if (status.state === "completed") {
          const [project] = await db
            .select({
              screeningScore: projectKickoffs.screeningScore,
              screeningAnalysis: projectKickoffs.screeningAnalysis,
            })
            .from(projectKickoffs)
            .where(eq(projectKickoffs.screeningJobId, jobId))
            .limit(1);

          return Response.json({
            state: "completed",
            progress: status.progress ?? null,
            result: project
              ? {
                  score: project.screeningScore,
                  analysis: project.screeningAnalysis,
                }
              : null,
          });
        }

        return Response.json({
          state: status.state,
          progress: status.progress ?? null,
          result: null,
        });
      },
    },
  },
});
