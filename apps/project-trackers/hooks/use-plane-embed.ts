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
  error?: string;
};

export type PlaneUpsertAiEvaluationResult = {
  type: "PLANE_EMBED_UPSERT_AI_EVALUATION_RESULT";
  requestId: string;
  success: boolean;
  error?: string;
};

type PendingResult = PlaneCreateResult | PlaneUpsertAiEvaluationResult;

const TIMEOUT_MS = 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Max 5 uppercase alphanumeric chars + random suffix to avoid collisions. */
export function buildPlaneProjectIdentifier(projectName: string): string {
  const base = projectName.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3) || "PRJ";
  const suffix = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `${base}${suffix}`.slice(0, 5);
}

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

function postToParent<T extends PendingResult>(
  type: string,
  data: Record<string, unknown>,
  pending: Map<string, (result: PendingResult) => void>,
  resultType: T["type"],
): Promise<T> {
  if (typeof window === "undefined" || window.parent === window) {
    return Promise.resolve({
      type: resultType,
      requestId: crypto.randomUUID(),
      success: false,
      error: "Not embedded in Plane",
    } as T);
  }

  return new Promise<T>((resolve) => {
    const requestId = crypto.randomUUID();
    const timeoutId = window.setTimeout(() => {
      if (!pending.has(requestId)) return;
      pending.delete(requestId);
      resolve({
        type: resultType,
        requestId,
        success: false,
        error: "Timed out waiting for Plane",
      } as T);
    }, TIMEOUT_MS);

    pending.set(requestId, (result) => {
      window.clearTimeout(timeoutId);
      resolve(result as T);
    });

    window.parent.postMessage({ type, requestId, data }, "*");
  });
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
    if (typeof window !== "undefined") {
      const slug = new URLSearchParams(window.location.search).get("workspaceSlug")?.trim();
      if (slug) setCtx((current) => current ?? { workspaceSlug: slug });
    }

    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!isRecord(msg)) return;

      if (msg.type === "PLANE_EMBED_INIT" && typeof msg.workspaceSlug === "string") {
        setCtx({ workspaceSlug: msg.workspaceSlug });
        return;
      }

      if (
        (msg.type === "PLANE_EMBED_CREATE_PROJECT_RESULT" ||
          msg.type === "PLANE_EMBED_UPSERT_AI_EVALUATION_RESULT") &&
        typeof msg.requestId === "string"
      ) {
        const resolve = pending.current.get(msg.requestId);
        if (!resolve) return;
        pending.current.delete(msg.requestId);
        resolve(msg as PendingResult);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const createProject = (
    kickoff: ProjectKickoffExtraction,
    options: { identifier: string; externalId?: string },
  ) =>
    postToParent<PlaneCreateResult>(
      "PLANE_EMBED_CREATE_PROJECT",
      {
        identifier: options.identifier,
        name: kickoff.projectName,
        externalId: options.externalId,
        kickoff: toPlaneKickoff(kickoff),
      },
      pending.current,
      "PLANE_EMBED_CREATE_PROJECT_RESULT",
    );

  const upsertAiEvaluation = (input: {
    projectId: string;
    score: number;
    analysis: string;
    status: "completed" | "failed";
    externalId?: string;
    screenedAt?: string;
  }) =>
    postToParent<PlaneUpsertAiEvaluationResult>(
      "PLANE_EMBED_UPSERT_AI_EVALUATION",
      { ...input },
      pending.current,
      "PLANE_EMBED_UPSERT_AI_EVALUATION_RESULT",
    );

  return { ctx, createProject, upsertAiEvaluation };
}
