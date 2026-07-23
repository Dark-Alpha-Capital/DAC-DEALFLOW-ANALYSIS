import { useEffect, useRef, useState } from "react";
import type { ProjectKickoffExtraction } from "@repo/schemas";

export type PlaneContext = {
  workspaceSlug: string;
};

export type PlaneCreateResult = {
  type: "PLANE_EMBED_CREATE_PROJECT_RESULT";
  requestId: string;
  success: boolean;
  project?: { id: string; name: string; identifier?: string };
  results?: {
    milestones: unknown[];
    risks: unknown[];
    raci: unknown[];
    deliverables: unknown[];
    timelineItems: unknown[];
  };
  error?: string;
};

export type PlaneUpsertAiEvaluationInput = {
  projectId: string;
  score: number;
  analysis: string;
  status: "completed" | "failed";
  externalId?: string;
  screenedAt?: string;
};

export type PlaneUpsertAiEvaluationResult = {
  type: "PLANE_EMBED_UPSERT_AI_EVALUATION_RESULT";
  requestId: string;
  success: boolean;
  evaluation?: unknown;
  error?: string;
};

type PlaneInitMessage = {
  type: "PLANE_EMBED_INIT";
  workspaceSlug: string;
};

type PendingResult =
  | PlaneCreateResult
  | PlaneUpsertAiEvaluationResult;

const CREATE_TIMEOUT_MS = 30_000;
const UPSERT_TIMEOUT_MS = 30_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlaneInitMessage(data: unknown): data is PlaneInitMessage {
  return (
    isRecord(data) &&
    data.type === "PLANE_EMBED_INIT" &&
    typeof data.workspaceSlug === "string" &&
    data.workspaceSlug.length > 0
  );
}

function isPlaneCreateResult(data: unknown): data is PlaneCreateResult {
  return (
    isRecord(data) &&
    data.type === "PLANE_EMBED_CREATE_PROJECT_RESULT" &&
    typeof data.requestId === "string" &&
    typeof data.success === "boolean"
  );
}

function isPlaneUpsertAiEvaluationResult(
  data: unknown,
): data is PlaneUpsertAiEvaluationResult {
  return (
    isRecord(data) &&
    data.type === "PLANE_EMBED_UPSERT_AI_EVALUATION_RESULT" &&
    typeof data.requestId === "string" &&
    typeof data.success === "boolean"
  );
}

/** Plane project identifier: max 5 uppercase chars, unique within the workspace. */
export function buildPlaneProjectIdentifier(projectName: string): string {
  const cleaned = projectName.replace(/\s/g, "").toUpperCase();
  return cleaned.slice(0, 5) || "PROJ";
}

function readWorkspaceSlugFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get(
    "workspaceSlug",
  );
  return value?.trim() || null;
}

/** Normalize nullables so Plane bridge code can safely iterate fields. */
function toPlaneKickoff(kickoff: ProjectKickoffExtraction) {
  return {
    projectName: kickoff.projectName,
    department: kickoff.department ?? null,
    projectOwners: kickoff.projectOwners ?? [],
    productDirection: kickoff.productDirection ?? [],
    engineeringLead: kickoff.engineeringLead ?? null,
    objectives: kickoff.objectives ?? null,
    platformEnables: kickoff.platformEnables ?? [],
    keyDeliverables: kickoff.keyDeliverables ?? [],
    raciMatrix: kickoff.raciMatrix ?? [],
    risksAndBlockers: kickoff.risksAndBlockers ?? [],
    timeline: kickoff.timeline ?? [],
    chosenTool: kickoff.chosenTool ?? null,
    techStack: kickoff.techStack ?? null,
    definitionOfDone: kickoff.definitionOfDone ?? [],
    additionalNotes: kickoff.additionalNotes ?? "",
  };
}

export function usePlaneEmbed(initialWorkspaceSlug?: string) {
  const [ctx, setCtx] = useState<PlaneContext | null>(() => {
    if (initialWorkspaceSlug?.trim()) {
      return { workspaceSlug: initialWorkspaceSlug.trim() };
    }
    return null;
  });
  const pending = useRef(new Map<string, (result: PendingResult) => void>());

  useEffect(() => {
    const fromUrl = readWorkspaceSlugFromUrl();
    if (fromUrl) {
      setCtx((current) => current ?? { workspaceSlug: fromUrl });
    }

    const handler = (event: MessageEvent) => {
      if (isPlaneInitMessage(event.data)) {
        setCtx({ workspaceSlug: event.data.workspaceSlug });
        return;
      }

      const data = event.data;
      if (!isPlaneCreateResult(data) && !isPlaneUpsertAiEvaluationResult(data)) {
        return;
      }

      const resolve = pending.current.get(data.requestId);
      if (!resolve) return;
      pending.current.delete(data.requestId);
      resolve(data);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const createProject = (
    kickoff: ProjectKickoffExtraction,
    options: { identifier: string; externalId?: string },
  ): Promise<PlaneCreateResult> => {
    if (typeof window === "undefined" || window.parent === window) {
      return Promise.resolve({
        type: "PLANE_EMBED_CREATE_PROJECT_RESULT",
        requestId: crypto.randomUUID(),
        success: false,
        error: "Not embedded in Plane (no parent frame)",
      });
    }

    return new Promise<PlaneCreateResult>((resolve) => {
      const requestId = crypto.randomUUID();
      const timeoutId = window.setTimeout(() => {
        if (!pending.current.has(requestId)) return;
        pending.current.delete(requestId);
        resolve({
          type: "PLANE_EMBED_CREATE_PROJECT_RESULT",
          requestId,
          success: false,
          error: "Timed out waiting for Plane to create the project",
        });
      }, CREATE_TIMEOUT_MS);

      pending.current.set(requestId, (result) => {
        window.clearTimeout(timeoutId);
        if (result.type === "PLANE_EMBED_CREATE_PROJECT_RESULT") {
          resolve(result);
          return;
        }
        resolve({
          type: "PLANE_EMBED_CREATE_PROJECT_RESULT",
          requestId,
          success: false,
          error: "Unexpected response from Plane",
        });
      });

      const kickoffPayload = toPlaneKickoff(kickoff);

      // Plane's EmbedSheet reads `event.data.data.kickoff` (nested under `data`).
      window.parent.postMessage(
        {
          type: "PLANE_EMBED_CREATE_PROJECT",
          requestId,
          data: {
            identifier: options.identifier,
            name: kickoff.projectName,
            externalId: options.externalId,
            kickoff: kickoffPayload,
          },
        },
        "*",
      );
    });
  };

  const upsertAiEvaluation = (
    input: PlaneUpsertAiEvaluationInput,
  ): Promise<PlaneUpsertAiEvaluationResult> => {
    if (typeof window === "undefined" || window.parent === window) {
      return Promise.resolve({
        type: "PLANE_EMBED_UPSERT_AI_EVALUATION_RESULT",
        requestId: crypto.randomUUID(),
        success: false,
        error: "Not embedded in Plane (no parent frame)",
      });
    }

    return new Promise<PlaneUpsertAiEvaluationResult>((resolve) => {
      const requestId = crypto.randomUUID();
      const timeoutId = window.setTimeout(() => {
        if (!pending.current.has(requestId)) return;
        pending.current.delete(requestId);
        resolve({
          type: "PLANE_EMBED_UPSERT_AI_EVALUATION_RESULT",
          requestId,
          success: false,
          error: "Timed out waiting for Plane to save AI evaluation",
        });
      }, UPSERT_TIMEOUT_MS);

      pending.current.set(requestId, (result) => {
        window.clearTimeout(timeoutId);
        if (result.type === "PLANE_EMBED_UPSERT_AI_EVALUATION_RESULT") {
          resolve(result);
          return;
        }
        resolve({
          type: "PLANE_EMBED_UPSERT_AI_EVALUATION_RESULT",
          requestId,
          success: false,
          error: "Unexpected response from Plane",
        });
      });

      window.parent.postMessage(
        {
          type: "PLANE_EMBED_UPSERT_AI_EVALUATION",
          requestId,
          data: {
            projectId: input.projectId,
            score: input.score,
            analysis: input.analysis,
            status: input.status,
            externalId: input.externalId,
            screenedAt: input.screenedAt,
          },
        },
        "*",
      );
    });
  };

  return { ctx, createProject, upsertAiEvaluation };
}
