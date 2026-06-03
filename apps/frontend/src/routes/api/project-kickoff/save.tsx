import { createFileRoute } from "@tanstack/react-router";
import { createId } from "@paralleldrive/cuid2";
import db, { projectKickoffs, projectTrackers } from "@repo/db";
import type { DepartmentValue } from "@repo/db";
import {
  insertWorkflowJob,
  startProjectKickoffScreenWorkflow,
} from "../../../lib/workflow-jobs-api";

/** Shape of the draft sent from the frontend step-3 confirmation */
interface ReviewDraft {
  projectName: string;
  department: DepartmentValue | "";
  projectOwners: string;
  productDirection: string;
  engineeringLead: string;
  objectives: string;
  platformEnables: string;
  keyDeliverables: string;
  risksAndBlockers: string;
  raciMatrix: string;
  timeline: string;
  chosenTool: string;
  techStack: string;
  definitionOfDone: string;
  additionalNotes: string;
}

export const Route = createFileRoute("/api/project-kickoff/save")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        if (
          typeof body !== "object" ||
          body === null ||
          !("draft" in body) ||
          typeof (body as { draft: unknown }).draft !== "object"
        ) {
          return Response.json(
            { error: "Missing or invalid draft field" },
            { status: 400 },
          );
        }

        const { draft, rawText } = body as {
          draft: ReviewDraft;
          rawText?: string;
        };

        if (!draft.projectName?.trim()) {
          return Response.json(
            { error: "projectName is required" },
            { status: 400 },
          );
        }
        if (!draft.objectives?.trim()) {
          return Response.json(
            { error: "objectives is required" },
            { status: 400 },
          );
        }

        const projectId = createId();
        const jobId = createId();

        // Insert the project kickoff record
        await db.insert(projectKickoffs).values({
          id: projectId,
          projectName: draft.projectName.trim(),
          department: draft.department || null,
          projectOwners: draft.projectOwners?.trim() || null,
          productDirection: draft.productDirection?.trim() || null,
          engineeringLead: draft.engineeringLead?.trim() || null,
          objectives: draft.objectives.trim(),
          platformEnables: draft.platformEnables?.trim() || null,
          keyDeliverables: draft.keyDeliverables?.trim() || null,
          risksAndBlockers: draft.risksAndBlockers?.trim() || null,
          raciMatrix: draft.raciMatrix?.trim() || null,
          timeline: draft.timeline?.trim() || null,
          chosenTool: draft.chosenTool?.trim() || null,
          techStack: draft.techStack?.trim() || null,
          definitionOfDone: draft.definitionOfDone?.trim() || null,
          additionalNotes: draft.additionalNotes?.trim() || null,
          rawText: typeof rawText === "string" ? rawText.trim() || null : null,
          screeningStatus: "pending",
          screeningJobId: jobId,
        });

        // Register in project trackers registry
        await db.insert(projectTrackers).values({
          id: createId(),
          name: draft.projectName.trim(),
          content: JSON.stringify({ type: "project-kickoff", sourceId: projectId }),
          createdBy: null,
        });

        // Register the workflow job row (state = "waiting")
        await insertWorkflowJob({
          instanceId: jobId,
          workflowKind: "project-kickoff-screen",
          userId: null,
        });

        // Kick off the Cloudflare background workflow
        await startProjectKickoffScreenWorkflow(jobId, {
          jobId,
          projectId,
          userId: null,
        });

        return Response.json({ projectId, jobId }, { status: 200 });
      },
    },
  },
});
