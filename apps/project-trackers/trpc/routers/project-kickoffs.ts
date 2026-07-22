import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";
import {
  createProjectKickoff,
  createProjectKickoffRescreen,
  markProjectKickoffScreeningFailed,
  updateProjectKickoffById,
} from "@repo/db-tracker/mutations";
import {
  getProjectKickoffById,
  getProjectKickoffScreeningByJobId,
} from "@repo/db-tracker/queries";
import {
  draftToDbFields,
  draftToStructured,
  editProjectKickoffSchema,
  hasMaterialKickoffChanges,
  projectKickoffDraftSchema,
  structuredToDraft,
  type ProjectKickoffDraft,
} from "@repo/schemas";
import type { DepartmentValue } from "@repo/db-tracker/schema";
import {
  getJobStatus,
  startProjectKickoffScreenWorkflow,
} from "../../src/lib/workflow-jobs-api";

function draftToFieldValues(
  draft: ProjectKickoffDraft,
  extras?: { rawText?: string | null; structuredData?: unknown },
) {
  const fields = draftToDbFields(draft);
  return {
    ...fields,
    department: (fields.department || null) as DepartmentValue | null,
    structuredData: extras?.structuredData ?? draftToStructured(draft),
    rawText: extras?.rawText,
  };
}

function kickoffToDraft(kickoff: {
  projectName: string;
  department: string | null;
  projectOwners: string | null;
  productDirection: string | null;
  engineeringLead: string | null;
  objectives: string;
  platformEnables: string | null;
  keyDeliverables: string | null;
  risksAndBlockers: string | null;
  raciMatrix: string | null;
  timeline: string | null;
  chosenTool: string | null;
  techStack: string | null;
  definitionOfDone: string | null;
  additionalNotes: string | null;
  structuredData: unknown;
}): ProjectKickoffDraft {
  if (kickoff.structuredData && typeof kickoff.structuredData === "object") {
    return structuredToDraft(kickoff.structuredData as Record<string, unknown>);
  }
  return {
    projectName: kickoff.projectName,
    department: (kickoff.department ?? "") as ProjectKickoffDraft["department"],
    projectOwners: kickoff.projectOwners ?? "",
    productDirection: kickoff.productDirection ?? "",
    engineeringLead: kickoff.engineeringLead ?? "",
    objectives: kickoff.objectives,
    platformEnables: kickoff.platformEnables ?? "",
    keyDeliverables: kickoff.keyDeliverables ?? "",
    risksAndBlockers: kickoff.risksAndBlockers ?? "",
    raciMatrix: kickoff.raciMatrix ?? "",
    timeline: kickoff.timeline ?? "",
    chosenTool: kickoff.chosenTool ?? "",
    techStack: kickoff.techStack ?? "",
    definitionOfDone: kickoff.definitionOfDone ?? "",
    additionalNotes: kickoff.additionalNotes ?? "",
  };
}

async function startScreeningWorkflow(input: {
  jobId: string;
  kickoffId: string;
  screeningId: string;
  userId: string | null;
}) {
  try {
    await startProjectKickoffScreenWorkflow(input.jobId, {
      jobId: input.jobId,
      kickoffId: input.kickoffId,
      screeningId: input.screeningId,
      userId: input.userId,
    });
  } catch {
    await markProjectKickoffScreeningFailed(input.screeningId);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to start screening workflow",
    });
  }
}

export const projectKickoffsRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        draft: projectKickoffDraftSchema,
        rawText: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx.user?.id as string | undefined) ?? null;
      const structured = draftToStructured(input.draft);
      const created = await createProjectKickoff({
        userId,
        fields: draftToFieldValues(input.draft, {
          rawText: input.rawText,
          structuredData: structured,
        }),
      });

      await startScreeningWorkflow({
        jobId: created.jobId,
        kickoffId: created.kickoffId,
        screeningId: created.screeningId,
        userId,
      });

      return {
        projectId: created.kickoffId,
        trackerId: created.trackerId,
        jobId: created.jobId,
        screeningId: created.screeningId,
      };
    }),

  update: protectedProcedure
    .input(
      editProjectKickoffSchema.extend({
        kickoffId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id as string;
      const { kickoffId, ...draftInput } = input;
      const draft: ProjectKickoffDraft = {
        projectName: draftInput.projectName,
        department: (draftInput.department ?? "") as ProjectKickoffDraft["department"],
        projectOwners: draftInput.projectOwners ?? "",
        productDirection: draftInput.productDirection ?? "",
        engineeringLead: draftInput.engineeringLead ?? "",
        objectives: draftInput.objectives,
        platformEnables: draftInput.platformEnables ?? "",
        keyDeliverables: draftInput.keyDeliverables ?? "",
        risksAndBlockers: draftInput.risksAndBlockers ?? "",
        raciMatrix: draftInput.raciMatrix ?? "",
        timeline: draftInput.timeline ?? "",
        chosenTool: draftInput.chosenTool ?? "",
        techStack: draftInput.techStack ?? "",
        definitionOfDone: draftInput.definitionOfDone ?? "",
        additionalNotes: draftInput.additionalNotes ?? "",
      };

      const existing = await getProjectKickoffById(kickoffId);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const previousDraft = kickoffToDraft(existing.kickoff);
      const shouldRescreen = hasMaterialKickoffChanges(previousDraft, draft);

      await updateProjectKickoffById(
        kickoffId,
        draftToFieldValues(draft, {
          structuredData: draftToStructured(draft),
        }),
      );

      if (shouldRescreen) {
        const rescreen = await createProjectKickoffRescreen({
          kickoffId,
          userId,
        });
        await startScreeningWorkflow({
          jobId: rescreen.jobId,
          kickoffId,
          screeningId: rescreen.screeningId,
          userId,
        });
        return {
          kickoffId,
          rescreened: true as const,
          jobId: rescreen.jobId,
          screeningId: rescreen.screeningId,
        };
      }

      return { kickoffId, rescreened: false as const };
    }),

  rescreen: protectedProcedure
    .input(z.object({ kickoffId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id as string;
      const rescreen = await createProjectKickoffRescreen({
        kickoffId: input.kickoffId,
        userId,
      });
      await startScreeningWorkflow({
        jobId: rescreen.jobId,
        kickoffId: input.kickoffId,
        screeningId: rescreen.screeningId,
        userId,
      });
      return rescreen;
    }),

  getScreeningStatus: protectedProcedure
    .input(z.object({ jobId: z.string().min(1) }))
    .query(async ({ input }) => {
      const status = await getJobStatus("project-kickoff-screen", input.jobId);
      if (!status) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      if (status.state === "completed") {
        const screening = await getProjectKickoffScreeningByJobId(input.jobId);
        return {
          state: status.state,
          progress: status.progress ?? null,
          result: screening
            ? {
              score: screening.score,
              analysis: screening.analysis,
            }
            : null,
        };
      }

      return {
        state: status.state,
        progress: status.progress ?? null,
        result: null,
      };
    }),
});
