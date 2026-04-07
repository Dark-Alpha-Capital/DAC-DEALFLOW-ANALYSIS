import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { db, runDbWithWorkerNeonPool } from "@repo/db";
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
  const revalidateUrl = `${frontendUrl}/api/revalidate`;
  try {
    const response = await fetch(revalidateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    if (!response.ok) {
      console.warn(
        `[file-upload] Cache revalidation failed: ${response.status}`,
      );
    }
  } catch (error) {
    console.warn(
      `[file-upload] Failed to revalidate cache tags:`,
      error instanceof Error ? error.message : String(error),
    );
  }
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
    return runDbWithWorkerNeonPool(async () => {
      const instanceId = event.instanceId;
      const p = event.payload;
      const { jobId, fileName, filePath, fileSize, mimeType, userId, entityType, entityId } =
        p;

      try {
        await markWorkflowRunning(instanceId);

        if (!userId?.trim()) {
          throw new Error(`[file-upload] ${jobId}: userId is required`);
        }
        if (entityType !== "DEAL_OPPORTUNITY") {
          throw new Error(
            `[file-upload] ${jobId}: entityType must be "DEAL_OPPORTUNITY"`,
          );
        }
        if (!entityId?.trim()) {
          throw new Error(`[file-upload] ${jobId}: entityId is required`);
        }
        if (!p.contentHash?.trim()) {
          throw new Error(`[file-upload] ${jobId}: contentHash is required`);
        }

        await step.do("validate", async () => {
          await updateWorkflowJobProgress(instanceId, {
            step: "Validating file",
            percentage: 10,
          });
          return {
            isValid: true,
            fileSize,
            mimeType,
          } as const;
        });

        const nextcloudResult = await step.do("verify-nextcloud", async () => {
          await updateWorkflowJobProgress(instanceId, {
            step: "Verifying Nextcloud upload",
            percentage: 40,
          });
          if (!filePath) throw new Error("Missing filePath");
          const exists = await fileExists(filePath);
          if (!exists) {
            throw new Error(
              `File not found at ${filePath} - upload may have failed`,
            );
          }
          return {
            destPath: filePath,
            publicUrl: buildNextcloudFileUrl(filePath),
          } as const;
        });

        const saveResult = await step.do(
          "save-db",
          {
            timeout: "5 minutes",
            // Prevent repeated full replay when DB insert / RAG trigger fails.
            retries: { limit: 0, delay: "1 second" },
          },
          async (stepCtx) => {
            console.log(`[file-upload] ${jobId}: save-db attempt`, {
              attempt: stepCtx.attempt,
            });
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
                uploadedById: userId,
              })
              .returning();

            const documentRecord = insertResult[0];
            if (!documentRecord) {
              throw new Error("Failed to insert document record");
            }

            const ragJobId = `${jobId}-rag`;
            await insertWorkflowJob({
              instanceId: ragJobId,
              workflowKind: "rag-ingestion",
              userId,
              dealId: entityId,
              fileName,
            });
            try {
              await this.env.RAG_INGESTION_WORKFLOW.create({
                id: ragJobId,
                params: {
                  documentId: documentRecord.id,
                  userId,
                },
              });
            } catch (error) {
              await setWorkflowJobState(ragJobId, "failed", {
                failedReason:
                  error instanceof Error
                    ? error.message
                    : "Failed to start workflow",
              });
              throw error;
            }

            const cacheTags: string[] = [`deal-${entityId}`, "deals"];
            if (cacheTags.length > 0) {
              await revalidateCacheTags(cacheTags);
            }

            await updateWorkflowJobProgress(instanceId, {
              step: "Completed",
              percentage: 100,
            });

            return {
              fileId: documentRecord.id,
              nextcloudUrl: nextcloudResult.publicUrl,
            } as const;
          },
        );

        const out = {
          success: true,
          fileName,
          nextcloudUrl: saveResult.nextcloudUrl,
          fileId: saveResult.fileId,
          message: "File uploaded successfully",
        };
        await markWorkflowCompleted(instanceId, out);
        return out;
      } catch (err) {
        if (isUniqueViolationError(err)) {
          const duplicateError = new Error(
            "This document was already uploaded for this deal",
          );
          await markWorkflowFailed(instanceId, duplicateError);
          throw duplicateError;
        }
        await markWorkflowFailed(instanceId, err);
        throw err;
      }
    });
  }
}
