import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { db, runDbWithD1 } from "@repo/db";
import type { DocumentCategory } from "@repo/db/enums";
import { documents } from "@repo/db/schema";
import { buildNextcloudFileUrl, fileExists } from "@repo/nextcloud";
import {
  insertWorkflowJob,
  setWorkflowJobState,
  updateWorkflowJobProgress,
} from "@repo/db/workflow-jobs";
import {
  markWorkflowCompleted,
  markWorkflowFailed,
  markWorkflowRunning,
} from "./progress";
import type { FileUploadParams, WorkflowWorkerEnv } from "./workflow-env";
import { getSsrAppBaseUrl } from "@/lib/env.server";

const LOG = "[file-upload]";

function logInfo(phase: string, data: Record<string, unknown> = {}): void {
  console.info(`${LOG} ${phase}`, { ts: new Date().toISOString(), ...data });
}

function isUniqueViolationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

async function revalidateCacheTags(tags: string[]): Promise<void> {
  const frontendUrl = getSsrAppBaseUrl();
  try {
    const response = await fetch(`${frontendUrl}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    if (!response.ok) {
      console.warn(`${LOG} cache revalidate failed: ${response.status}`);
    }
  } catch (error) {
    console.warn(
      `${LOG} cache revalidate error:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/** Progress-only DB writes must not fail the durable step (workflow will retry forever). */
async function safeUpdateWorkflowJobProgress(
  instanceId: string,
  progress: { step: string; percentage: number },
): Promise<void> {
  try {
    await runDbWithD1(this.env.DB, async () => {
      await updateWorkflowJobProgress(instanceId, progress);
    });
  } catch (e) {
    console.warn(`${LOG} updateWorkflowJobProgress failed (non-fatal)`, {
      instanceId,
      ...progress,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

function assertDealOpportunityUploadPayload(
  p: FileUploadParams,
  jobId: string,
): void {
  if (p.entityType !== "DEAL_OPPORTUNITY") {
    throw new Error(`[file-upload] ${jobId}: entityType must be "DEAL_OPPORTUNITY"`);
  }
  if (!p.entityId?.trim()) {
    throw new Error(`[file-upload] ${jobId}: entityId is required`);
  }
  if (!p.contentHash?.trim()) {
    throw new Error(`[file-upload] ${jobId}: contentHash is required`);
  }
}

/** Nextcloud WebDAV check + public URL (throws on missing env, network, or missing file). */
async function assertNextcloudFilePresent(input: {
  instanceId: string;
  jobId: string;
  filePath: string;
}): Promise<{ destPath: string; publicUrl: string }> {
  const { instanceId, jobId, filePath } = input;
  logInfo("step.verify-nextcloud.check", { instanceId, jobId, filePath });
  const t0 = Date.now();
  let exists: boolean;
  try {
    exists = await fileExists(filePath);
    logInfo("step.verify-nextcloud.exists", {
      instanceId,
      jobId,
      filePath,
      exists,
      elapsedMs: Date.now() - t0,
    });
  } catch (ncErr) {
    const message = ncErr instanceof Error ? ncErr.message : String(ncErr);
    console.error(`${LOG} nextcloud fileExists threw`, {
      instanceId,
      jobId,
      filePath,
      message,
    });
    throw new Error(
      `Nextcloud check failed (${message}). Ensure NEXTCLOUD_* env vars are set and the service is reachable.`,
    );
  }
  if (!exists) {
    console.error(`${LOG} nextcloud file missing`, { instanceId, jobId, filePath });
    throw new Error(`File not found at ${filePath} - upload may have failed`);
  }
  logInfo("nextcloud file ok", { instanceId, jobId, filePath });
  return { destPath: filePath, publicUrl: buildNextcloudFileUrl(filePath) };
}

export class FileUploadWorkflow extends WorkflowEntrypoint<
  WorkflowWorkerEnv,
  FileUploadParams
> {
  async run(
    event: WorkflowEvent<FileUploadParams>,
    step: WorkflowStep,
  ): Promise<{
    success: boolean;
    fileName?: string;
    nextcloudUrl?: string;
    fileId?: string;
    message?: string;
  }> {
    const instanceId = event.instanceId;
    const p = event.payload;
    const { jobId, fileName, filePath, fileSize, mimeType, userId, entityId } = p;

    try {
      logInfo("workflow.run.start", {
        instanceId,
        jobId,
        fileName,
        entityId,
        entityType: p.entityType,
        fileSize,
        mimeType,
        contentHashPrefix: p.contentHash?.slice(0, 12),
      });
      await runDbWithD1(this.env.DB, async () => markWorkflowRunning(instanceId));
      assertDealOpportunityUploadPayload(p, jobId);

      await step.do("validate", { timeout: "2 minutes" }, async () => {
        logInfo("step.validate.enter", { instanceId, jobId, fileName });
        await safeUpdateWorkflowJobProgress(instanceId, {
          step: "Validating file",
          percentage: 10,
        });
        logInfo("step.validate.done", { instanceId, jobId, fileName });
        return { isValid: true as const, fileSize, mimeType };
      });

      const nextcloudResult = await step.do(
        "verify-nextcloud",
        { timeout: "5 minutes" },
        async () => {
          await safeUpdateWorkflowJobProgress(instanceId, {
            step: "Verifying Nextcloud upload",
            percentage: 40,
          });
          if (!filePath) throw new Error("Missing filePath");
          return assertNextcloudFilePresent({ instanceId, jobId, filePath });
        },
      );

      const saveResult = await step.do(
        "save-db",
        {
          timeout: "5 minutes",
          retries: { limit: 0, delay: "1 second" },
        },
        async (stepCtx) =>
          runDbWithD1(this.env.DB, async () => {
            logInfo(`${jobId}: save-db attempt`, { attempt: stepCtx.attempt });
            await updateWorkflowJobProgress(instanceId, {
              step: "Saving to database",
              percentage: 90,
            });

            const category = (p.fileCategory as DocumentCategory) || "OTHER";
            const insertResult = await db
              .insert(documents)
              .values({
                title: fileName,
                description: p.fileDescription || null,
                category,
                fileUrl: nextcloudResult.publicUrl,
                fileName,
                fileSize,
                mimeType,
                contentHash: p.contentHash,
                entityType: "DEAL_OPPORTUNITY",
                entityId,
                dealOpportunityId: entityId,
                uploadedById: userId ?? null,
              })
              .returning();

            const documentRecord = insertResult[0];
            if (!documentRecord) {
              throw new Error("Failed to insert document record");
            }

            const ragJobId = `${jobId}-rag`;
            logInfo("document row created, queue rag-ingestion", {
              instanceId,
              jobId,
              ragJobId,
              documentId: documentRecord.id,
              dealOpportunityId: entityId,
              fileName,
            });
            await insertWorkflowJob({
              instanceId: ragJobId,
              workflowKind: "rag-ingestion",
              userId: userId ?? null,
              dealId: entityId,
              fileName,
            });
            try {
              await this.env.RAG_INGESTION_WORKFLOW.create({
                id: ragJobId,
                params: { documentId: documentRecord.id, userId: userId ?? null },
              });
              logInfo("rag-ingestion workflow.create ok", {
                ragJobId,
                documentId: documentRecord.id,
              });
            } catch (error) {
              await setWorkflowJobState(ragJobId, "failed", {
                failedReason:
                  error instanceof Error ? error.message : "Failed to start workflow",
              });
              throw error;
            }

            await revalidateCacheTags([`deal-${entityId}`, "deals"]);

            await updateWorkflowJobProgress(instanceId, {
              step: "Completed",
              percentage: 100,
            });

            return {
              fileId: documentRecord.id,
              nextcloudUrl: nextcloudResult.publicUrl,
            } as const;
          }),
      );

      const out = {
        success: true,
        fileName,
        nextcloudUrl: saveResult.nextcloudUrl,
        fileId: saveResult.fileId,
        message: "File uploaded successfully",
      };
      logInfo("workflow.run.completed", {
        instanceId,
        jobId,
        fileName,
        fileId: saveResult.fileId,
      });
      await runDbWithD1(this.env.DB, async () => markWorkflowCompleted(instanceId, out));
      return out;
    } catch (err) {
      if (isUniqueViolationError(err)) {
        const duplicateError = new Error(
          "This document was already uploaded for this deal",
        );
        await runDbWithD1(this.env.DB, async () =>
          markWorkflowFailed(instanceId, duplicateError),
        );
        throw duplicateError;
      }
      console.error(`${LOG} workflow.run.failed`, {
        instanceId,
        jobId,
        fileName,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      await runDbWithD1(this.env.DB, async () => markWorkflowFailed(instanceId, err));
      throw err;
    }
  }
}
