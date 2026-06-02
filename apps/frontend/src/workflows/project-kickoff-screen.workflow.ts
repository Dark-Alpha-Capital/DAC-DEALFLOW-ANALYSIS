import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { generateObject } from "ai";
import { z } from "zod";
import db, {
  runDbWithWorkerNeonPool,
  projectKickoffs,
  screeners,
  and,
  eq,
} from "@repo/db";
import {
  PROJECT_KICKOFF_SCREENING_SYSTEM,
  buildProjectKickoffScreeningPrompt,
  getOpenAIProvider,
} from "@repo/ai-core";
import { updateWorkflowJobProgress } from "@repo/db/workflow-jobs";
import {
  markWorkflowCompleted,
  markWorkflowFailed,
  markWorkflowRunning,
} from "./progress";
import type { ProjectKickoffScreenParams, WorkflowWorkerEnv } from "./workflow-env";

const openai = getOpenAIProvider();

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
    return runDbWithWorkerNeonPool(async () => {
      const instanceId = event.instanceId;
      const { projectId } = event.payload;

      try {
        await markWorkflowRunning(instanceId);

        // ── Step 1: fetch project row + matching department screener ──────────
        const fetchPack = await step.do("fetch-data", async () => {
          await updateWorkflowJobProgress(instanceId, {
            step: "Fetching project data",
            percentage: 10,
          });

          const [project] = await db
            .select()
            .from(projectKickoffs)
            .where(eq(projectKickoffs.id, projectId))
            .limit(1);

          if (!project) {
            throw new Error(`ProjectKickoff not found: ${projectId}`);
          }

          // Mark the project row as running so the UI can reflect it
          await db
            .update(projectKickoffs)
            .set({ screeningStatus: "running", updatedAt: new Date() })
            .where(eq(projectKickoffs.id, projectId));

          await updateWorkflowJobProgress(instanceId, {
            step: "Looking up department screener",
            percentage: 20,
          });

          // Find a Project Screener whose department matches the project department
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

        // ── Step 2: AI generates score + analysis ────────────────────────────
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
            model: openai("gpt-4o-mini"),
            system: PROJECT_KICKOFF_SCREENING_SYSTEM,
            prompt,
            schema: screeningOutputSchema,
          });

          return { score: object.score, analysis: object.analysis };
        });

        // ── Step 3: write result back to project row ─────────────────────────
        await step.do("save-result", async () => {
          await updateWorkflowJobProgress(instanceId, {
            step: "Saving results",
            percentage: 90,
          });

          await db
            .update(projectKickoffs)
            .set({
              screeningScore: aiResult.score,
              screeningAnalysis: aiResult.analysis,
              screeningStatus: "completed",
              updatedAt: new Date(),
            })
            .where(eq(projectKickoffs.id, projectId));

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
        // Mark the project row as failed so the status endpoint can surface it
        await db
          .update(projectKickoffs)
          .set({ screeningStatus: "failed", updatedAt: new Date() })
          .where(eq(projectKickoffs.id, projectId))
          .catch(() => undefined);

        await markWorkflowFailed(instanceId, err);
        throw err;
      }
    });
  }
}
