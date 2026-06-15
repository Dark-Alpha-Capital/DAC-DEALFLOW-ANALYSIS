import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { generateObject } from "ai";
import { z } from "zod";
import db, {
  projectKickoffs,
  projectKickoffScreenings,
  screeners,
  and,
  eq,
} from "@repo/db-tracker";
import {
  PROJECT_KICKOFF_SCREENING_SYSTEM,
  buildProjectKickoffScreeningPrompt,
  getOpenAIProvider,
} from "@repo/ai-core";
import { updateWorkflowJobProgress } from "@repo/db-tracker/workflow-jobs";
import {
  markWorkflowCompleted,
  markWorkflowFailed,
  markWorkflowRunning,
} from "./progress";
import type { ProjectKickoffScreenParams, WorkflowWorkerEnv } from "./workflow-env";
import { withWorkflowDb } from "./with-workflow-db";

/** Allowed score values: 0 to 5 in 0.5 increments */
const scoreSchema = z.union([
  z.literal(0),
  z.literal(0.5),
  z.literal(1),
  z.literal(1.5),
  z.literal(2),
  z.literal(2.5),
  z.literal(3),
  z.literal(3.5),
  z.literal(4),
  z.literal(4.5),
  z.literal(5),
]);

const screeningOutputSchema = z.object({
  score: scoreSchema,
  analysis: z.string().max(500),
});

export class ProjectKickoffScreenWorkflow extends WorkflowEntrypoint<
  WorkflowWorkerEnv,
  ProjectKickoffScreenParams
> {
  async run(
    event: WorkflowEvent<ProjectKickoffScreenParams>,
    step: WorkflowStep,
  ): Promise<{ success: boolean; score?: number; analysis?: string; message?: string }> {
    return withWorkflowDb(this.env, async () => {
      const instanceId = event.instanceId;
      const { kickoffId, screeningId } = event.payload;

      try {
        await markWorkflowRunning(instanceId);

        const fetchPack = await step.do("fetch-data", async () => {
          await updateWorkflowJobProgress(instanceId, {
            step: "Fetching project data",
            percentage: 10,
          });

          const [project] = await db
            .select({
              projectName: projectKickoffs.projectName,
              department: projectKickoffs.department,
              objectives: projectKickoffs.objectives,
              projectOwners: projectKickoffs.projectOwners,
              engineeringLead: projectKickoffs.engineeringLead,
              productDirection: projectKickoffs.productDirection,
              platformEnables: projectKickoffs.platformEnables,
              keyDeliverables: projectKickoffs.keyDeliverables,
              risksAndBlockers: projectKickoffs.risksAndBlockers,
              timeline: projectKickoffs.timeline,
              chosenTool: projectKickoffs.chosenTool,
              techStack: projectKickoffs.techStack,
              definitionOfDone: projectKickoffs.definitionOfDone,
              additionalNotes: projectKickoffs.additionalNotes,
            })
            .from(projectKickoffs)
            .where(eq(projectKickoffs.id, kickoffId))
            .limit(1);

          if (!project) {
            throw new Error(`ProjectKickoff not found: ${kickoffId}`);
          }

          await db
            .update(projectKickoffScreenings)
            .set({ status: "running", updatedAt: new Date() })
            .where(eq(projectKickoffScreenings.id, screeningId));

          await updateWorkflowJobProgress(instanceId, {
            step: "Looking up department screener",
            percentage: 20,
          });

          let screener: { name: string; content: string | null } | null = null;
          if (project.department) {
            const [row] = await db
              .select({
                name: screeners.name,
                content: screeners.content,
              })
              .from(screeners)
              .where(
                and(
                  eq(screeners.category, "Project Screener"),
                  eq(screeners.department, project.department),
                ),
              )
              .limit(1);
            screener = row ?? null;
          }

          return { project, screener };
        });

        const aiResult = await step.do("generate-score", async () => {
          await updateWorkflowJobProgress(instanceId, {
            step: "AI evaluating project",
            percentage: 50,
          });

          const prompt = buildProjectKickoffScreeningPrompt(
            {
              projectName: fetchPack.project.projectName,
              department: fetchPack.project.department ?? null,
              objectives: fetchPack.project.objectives,
              projectOwners: fetchPack.project.projectOwners ?? null,
              engineeringLead: fetchPack.project.engineeringLead ?? null,
              productDirection: fetchPack.project.productDirection ?? null,
              platformEnables: fetchPack.project.platformEnables ?? null,
              keyDeliverables: fetchPack.project.keyDeliverables ?? null,
              risksAndBlockers: fetchPack.project.risksAndBlockers ?? null,
              timeline: fetchPack.project.timeline ?? null,
              chosenTool: fetchPack.project.chosenTool ?? null,
              techStack: fetchPack.project.techStack ?? null,
              definitionOfDone: fetchPack.project.definitionOfDone ?? null,
              additionalNotes: fetchPack.project.additionalNotes ?? null,
            },
            fetchPack.screener
              ? { name: fetchPack.screener.name, content: fetchPack.screener.content }
              : null,
          );

          const { object } = await generateObject({
            model: getOpenAIProvider()("gpt-4o-mini"),
            system: PROJECT_KICKOFF_SCREENING_SYSTEM,
            prompt,
            schema: screeningOutputSchema,
          });

          return { score: object.score, analysis: object.analysis };
        });

        await step.do("save-result", async () => {
          await updateWorkflowJobProgress(instanceId, {
            step: "Saving results",
            percentage: 90,
          });

          const now = new Date();
          await db
            .update(projectKickoffScreenings)
            .set({
              score: aiResult.score,
              analysis: aiResult.analysis,
              status: "completed",
              screenedAt: now,
              updatedAt: now,
            })
            .where(eq(projectKickoffScreenings.id, screeningId));

          await updateWorkflowJobProgress(instanceId, {
            step: "Completed",
            percentage: 100,
          });
        });

        const out = {
          success: true,
          score: aiResult.score,
          analysis: aiResult.analysis,
        };
        await markWorkflowCompleted(instanceId, out);
        return out;
      } catch (err) {
        await db
          .update(projectKickoffScreenings)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(projectKickoffScreenings.id, screeningId))
          .catch(() => undefined);

        await markWorkflowFailed(instanceId, err);
        throw err;
      }
    });
  }
}
