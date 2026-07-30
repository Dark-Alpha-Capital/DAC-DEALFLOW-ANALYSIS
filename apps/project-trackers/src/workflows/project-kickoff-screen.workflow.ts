import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { createOpenAI } from "@ai-sdk/openai";
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
} from "@repo/ai-core";
import { updateWorkflowJobProgress } from "@repo/db-tracker/workflow-jobs";
import {
  markWorkflowCompleted,
  markWorkflowFailed,
  markWorkflowRunning,
} from "./progress";
import type {
  ProjectKickoffScreenParams,
  WorkflowWorkerEnv,
} from "./workflow-env";
import { withWorkflowDb } from "./with-workflow-db";

/** Round any 0–5 number to the nearest 0.5 step. */
function snapScore(raw: number): number {
  const clamped = Math.min(5, Math.max(0, raw));
  return Math.round(clamped * 2) / 2;
}

const screeningOutputSchema = z.object({
  score: z.number().min(0).max(5),
  analysis: z.string().min(1).max(500),
});

function resolveOpenAiKey(env: WorkflowWorkerEnv): string {
  const key =
    env.OPENAI_API_KEY ||
    env.AI_API_KEY ||
    (typeof process !== "undefined"
      ? process.env.OPENAI_API_KEY || process.env.AI_API_KEY
      : undefined);
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY (or AI_API_KEY) is not configured on the Worker",
    );
  }
  return key;
}

/**
 * Important: do NOT wrap `step.do` in a single AsyncLocalStorage / D1 scope.
 * That pattern hangs Cloudflare Workflows (runtime cancels the run).
 * Scope D1 only inside each step callback.
 */
export class ProjectKickoffScreenWorkflow extends WorkflowEntrypoint<
  WorkflowWorkerEnv,
  ProjectKickoffScreenParams
> {
  async run(
    event: WorkflowEvent<ProjectKickoffScreenParams>,
    step: WorkflowStep,
  ): Promise<{
    success: boolean;
    score?: number;
    analysis?: string;
    message?: string;
  }> {
    const instanceId = event.instanceId;
    const { kickoffId, screeningId } = event.payload;

    try {
      const fetchPack = await step.do("fetch-data", async () =>
        withWorkflowDb(this.env, async () => {
          await markWorkflowRunning(instanceId);
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
        }),
      );

      const aiResult = await step.do(
        "generate-score",
        {
          retries: { limit: 2, delay: "5 seconds", backoff: "linear" },
          timeout: "2 minutes",
        },
        async () => {
          // Progress update needs D1; AI call does not.
          await withWorkflowDb(this.env, () =>
            updateWorkflowJobProgress(instanceId, {
              step: "AI evaluating project",
              percentage: 50,
            }),
          );

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
              ? {
                  name: fetchPack.screener.name,
                  content: fetchPack.screener.content,
                }
              : null,
          );

          const openai = createOpenAI({
            apiKey: resolveOpenAiKey(this.env),
          });
          const { object } = await generateObject({
            model: openai("gpt-4o-mini"),
            instructions: PROJECT_KICKOFF_SCREENING_SYSTEM,
            prompt,
            schema: screeningOutputSchema,
          });

          return {
            score: snapScore(object.score),
            analysis: object.analysis.trim().slice(0, 500),
          };
        },
      );

      await step.do("save-result", async () =>
        withWorkflowDb(this.env, async () => {
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

          await markWorkflowCompleted(instanceId, {
            success: true,
            score: aiResult.score,
            analysis: aiResult.analysis,
          });
        }),
      );

      return {
        success: true,
        score: aiResult.score,
        analysis: aiResult.analysis,
      };
    } catch (err) {
      await withWorkflowDb(this.env, async () => {
        await db
          .update(projectKickoffScreenings)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(projectKickoffScreenings.id, screeningId));
        await markWorkflowFailed(instanceId, err);
      }).catch(() => undefined);

      throw err;
    }
  }
}
