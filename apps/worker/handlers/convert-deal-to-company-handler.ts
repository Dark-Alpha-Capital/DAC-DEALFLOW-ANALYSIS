import { Job } from "bullmq";
import { createClient } from "webdav";
import { db } from "db";
import { deals, companies, documents, pocs } from "db/schema";
import { eq, and } from "drizzle-orm";

export enum ConvertDealToCompanyStep {
  CreateCompany = "create-company",
  UpdateDocuments = "update-documents",
  MoveFiles = "move-files",
  MigratePOCs = "migrate-pocs",
  DeleteDeal = "delete-deal",
  Done = "done",
}

/**
 * Job data for deal-to-company conversion - includes step state for resumability
 */
export interface ConvertDealToCompanyJobData {
  jobId: string;
  dealId: string;
  userId: string;
  // Step state - persisted via job.updateData() for resume on retry
  step?: ConvertDealToCompanyStep;
  // Intermediate results cached for resume
  companyResult?: {
    companyId: string;
  };
  documentsUpdated?: number;
  pocsMigrated?: number;
  filesMoved?: number;
}

export interface ConvertDealToCompanyResult {
  success: boolean;
  companyId?: string;
  error?: string;
  details?: {
    documentsUpdated: number;
    pocsMigrated: number;
    filesMoved: number;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract file path from Nextcloud URL
 */
function extractFilePathFromUrl(url: string): string {
  const match = url.match(/\/files\/[^/]+\/(.+)$/);
  if (match && match[1]) {
    return match[1];
  }
  return url;
}

/**
 * Create WebDAV client for Nextcloud
 */
function createNextcloudClient() {
  return createClient(
    `${process.env.NEXTCLOUD_URL}/remote.php/dav/files/${process.env.NEXTCLOUD_USER}`,
    {
      username: process.env.NEXTCLOUD_USER,
      password: process.env.NEXTCLOUD_PASSWORD,
    }
  );
}

// ============================================================================
// Handler
// ============================================================================

/**
 * Deal-to-Company Conversion Handler using the "Process Step Jobs" pattern.
 *
 * Each step saves its progress via job.updateData(), so if the job fails
 * and retries, it resumes from the last completed step instead of starting over.
 *
 * Steps:
 * 1. CreateCompany - Create company record from deal data
 * 2. UpdateDocuments - Update document entityType and entityId
 * 3. MoveFiles - Move files in Nextcloud and update fileUrl
 * 4. MigratePOCs - Update POCs from deal to company
 * 5. DeleteDeal - Delete original deal record
 * 6. Done - Complete
 */
export async function convertDealToCompanyHandler(
  job: Job<ConvertDealToCompanyJobData>
): Promise<ConvertDealToCompanyResult> {
  console.log(
    `[convert-deal] Raw job.data:`,
    JSON.stringify(job.data, null, 2)
  );

  const jobData = job.data || {};
  const { dealId, userId, jobId } = jobData;

  let step = jobData.step ?? ConvertDealToCompanyStep.CreateCompany;

  console.log(`[convert-deal] Starting job ${jobId} at step: ${step}`);

  while (step !== ConvertDealToCompanyStep.Done) {
    switch (step) {
      // ========================================
      // Step 1: Create Company
      // ========================================
      case ConvertDealToCompanyStep.CreateCompany: {
        await job.updateProgress({
          step: "Creating company...",
          percentage: 10,
        });

        // Fetch deal data
        const [deal] = await db
          .select()
          .from(deals)
          .where(eq(deals.id, dealId))
          .limit(1);

        if (!deal) {
          throw new Error(`Deal ${dealId} not found`);
        }

        // Map deal fields to company schema
        const companyName = deal.title
          ? `${deal.title} - ${deal.dealCaption}`
          : deal.dealCaption;

        // Create company record
        const [newCompany] = await db
          .insert(companies)
          .values({
            name: companyName,
            sector: deal.industry || null,
            headquarters: deal.companyLocation || null,
            description: deal.description || null,
            revenue: deal.revenue ? deal.revenue.toString() : null,
            ebitda: deal.ebitda ? deal.ebitda.toString() : null,
            employees: null,
            website: null,
            stage: null,
            growthRate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        if (!newCompany) {
          throw new Error("Failed to create company record");
        }

        console.log(
          `[convert-deal] ${jobId}: Created company ${newCompany.id}`
        );

        // Save progress and move to next step
        await job.updateData({
          ...job.data,
          step: ConvertDealToCompanyStep.UpdateDocuments,
          companyResult: {
            companyId: newCompany.id,
          },
        });
        step = ConvertDealToCompanyStep.UpdateDocuments;
        break;
      }

      // ========================================
      // Step 2: Update Documents
      // ========================================
      case ConvertDealToCompanyStep.UpdateDocuments: {
        const companyResult = job.data.companyResult;
        if (!companyResult) {
          throw new Error("Missing companyResult - job state corrupted");
        }

        const companyId = companyResult.companyId;

        // Get all documents for the deal
        const dealDocuments = await db
          .select()
          .from(documents)
          .where(
            and(eq(documents.entityType, "DEAL"), eq(documents.entityId, dealId))
          );

        console.log(
          `[convert-deal] ${jobId}: Found ${dealDocuments.length} documents to update`
        );

        let documentsUpdated = 0;
        for (const document of dealDocuments) {
          await db
            .update(documents)
            .set({
              entityType: "COMPANY",
              entityId: companyId,
              updatedAt: new Date(),
            })
            .where(eq(documents.id, document.id));

          documentsUpdated++;
          await job.updateProgress({
            step: `Updating documents... (${documentsUpdated}/${dealDocuments.length})`,
            percentage: 20 + (documentsUpdated / dealDocuments.length) * 10,
          });
        }

        console.log(
          `[convert-deal] ${jobId}: Updated ${documentsUpdated} documents`
        );

        // Save progress and move to next step
        await job.updateData({
          ...job.data,
          step: ConvertDealToCompanyStep.MoveFiles,
          documentsUpdated,
        });
        step = ConvertDealToCompanyStep.MoveFiles;
        break;
      }

      // ========================================
      // Step 3: Move Files in Nextcloud
      // ========================================
      case ConvertDealToCompanyStep.MoveFiles: {
        const companyResult = job.data.companyResult;
        if (!companyResult) {
          throw new Error("Missing companyResult - job state corrupted");
        }

        const companyId = companyResult.companyId;

        // Get all documents (already updated to COMPANY type)
        const companyDocuments = await db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.entityType, "COMPANY"),
              eq(documents.entityId, companyId)
            )
          );

        console.log(
          `[convert-deal] ${jobId}: Moving ${companyDocuments.length} files`
        );

        const client = createNextcloudClient();

        // Ensure destination directory exists
        const destDirPath = `Diligence/${companyId}`;
        try {
          await client.createDirectory(destDirPath, { recursive: true });
        } catch (err) {
          console.log(
            `[convert-deal] ${jobId}: Directory ${destDirPath} may already exist`
          );
        }

        let filesMoved = 0;
        for (const document of companyDocuments) {
          try {
            // Extract file path from URL
            const sourcePath = extractFilePathFromUrl(document.fileUrl);
            const fileName = document.fileName;

            // Determine source and destination paths
            const expectedSourcePath = `dealflow/raw-deals/${dealId}/${fileName}`;
            const destPath = `Diligence/${companyId}/${fileName}`;

            // Read file from source location
            let fileBuffer: Buffer;
            try {
              fileBuffer = (await client.getFileContents(sourcePath, {
                format: "binary",
              })) as Buffer;
            } catch (fileError: any) {
              // If file not found at expected path, try the path from URL
              if (fileError?.response?.status === 404) {
                console.warn(
                  `[convert-deal] ${jobId}: File not found at ${sourcePath}, trying ${expectedSourcePath}`
                );
                try {
                  fileBuffer = (await client.getFileContents(
                    expectedSourcePath,
                    {
                      format: "binary",
                    }
                  )) as Buffer;
                } catch (retryError) {
                  console.error(
                    `[convert-deal] ${jobId}: Failed to read file for document ${document.id}:`,
                    retryError
                  );
                  throw new Error(
                    `Failed to read file for document ${document.id}: ${retryError}`
                  );
                }
              } else {
                throw fileError;
              }
            }

            // Write file to destination
            await client.putFileContents(destPath, fileBuffer);

            // Delete old file
            try {
              await client.deleteFile(sourcePath);
            } catch (deleteError: any) {
              // If source path doesn't match, try expected path
              if (
                deleteError?.response?.status === 404 &&
                sourcePath !== expectedSourcePath
              ) {
                try {
                  await client.deleteFile(expectedSourcePath);
                } catch (retryDeleteError) {
                  console.warn(
                    `[convert-deal] ${jobId}: Could not delete old file ${expectedSourcePath}:`,
                    retryDeleteError
                  );
                  // Continue - file move succeeded even if delete failed
                }
              } else {
                console.warn(
                  `[convert-deal] ${jobId}: Could not delete old file ${sourcePath}:`,
                  deleteError
                );
                // Continue - file move succeeded even if delete failed
              }
            }

            // Update document.fileUrl with new path
            const newFileUrl = `${process.env.NEXTCLOUD_URL}/remote.php/dav/files/${process.env.NEXTCLOUD_USER}/${destPath}`;

            await db
              .update(documents)
              .set({
                fileUrl: newFileUrl,
                updatedAt: new Date(),
              })
              .where(eq(documents.id, document.id));

            filesMoved++;
            await job.updateProgress({
              step: `Moving files... (${filesMoved}/${companyDocuments.length})`,
              percentage: 40 + (filesMoved / companyDocuments.length) * 20,
            });

            console.log(
              `[convert-deal] ${jobId}: Moved file ${document.id} (${filesMoved}/${companyDocuments.length})`
            );
          } catch (error: any) {
            console.error(
              `[convert-deal] ${jobId}: Error processing document ${document.id}:`,
              error
            );
            throw new Error(
              `Failed to move document ${document.id}: ${error.message || String(error)}`
            );
          }
        }

        console.log(`[convert-deal] ${jobId}: Moved ${filesMoved} files`);

        // Save progress and move to next step
        await job.updateData({
          ...job.data,
          step: ConvertDealToCompanyStep.MigratePOCs,
          filesMoved,
        });
        step = ConvertDealToCompanyStep.MigratePOCs;
        break;
      }

      // ========================================
      // Step 4: Migrate POCs
      // ========================================
      case ConvertDealToCompanyStep.MigratePOCs: {
        const companyResult = job.data.companyResult;
        if (!companyResult) {
          throw new Error("Missing companyResult - job state corrupted");
        }

        const companyId = companyResult.companyId;

        // Get all POCs for the deal
        const dealPocs = await db
          .select()
          .from(pocs)
          .where(eq(pocs.dealId, dealId));

        console.log(`[convert-deal] ${jobId}: Found ${dealPocs.length} POCs to migrate`);

        let pocsMigrated = 0;
        for (const poc of dealPocs) {
          await db
            .update(pocs)
            .set({
              dealId: null,
              companyId: companyId,
            })
            .where(eq(pocs.id, poc.id));

          pocsMigrated++;
          await job.updateProgress({
            step: `Migrating POCs... (${pocsMigrated}/${dealPocs.length})`,
            percentage: 70 + (pocsMigrated / dealPocs.length) * 10,
          });
        }

        console.log(`[convert-deal] ${jobId}: Migrated ${pocsMigrated} POCs`);

        // Save progress and move to next step
        await job.updateData({
          ...job.data,
          step: ConvertDealToCompanyStep.DeleteDeal,
          pocsMigrated,
        });
        step = ConvertDealToCompanyStep.DeleteDeal;
        break;
      }

      // ========================================
      // Step 5: Delete Deal
      // ========================================
      case ConvertDealToCompanyStep.DeleteDeal: {
        await job.updateProgress({
          step: "Cleaning up...",
          percentage: 90,
        });

        // Delete the deal record (this will cascade delete related records via foreign keys)
        await db.delete(deals).where(eq(deals.id, dealId));

        console.log(`[convert-deal] ${jobId}: Deleted deal ${dealId}`);

        // Mark as done
        await job.updateData({
          ...job.data,
          step: ConvertDealToCompanyStep.Done,
        });
        await job.updateProgress({
          step: "Completed",
          percentage: 100,
        });

        const companyResult = job.data.companyResult;
        if (!companyResult) {
          throw new Error("Missing companyResult - job state corrupted");
        }

        console.log(
          `[convert-deal] ${jobId}: Conversion complete - Company ${companyResult.companyId}`
        );

        return {
          success: true,
          companyId: companyResult.companyId,
          details: {
            documentsUpdated: job.data.documentsUpdated || 0,
            pocsMigrated: job.data.pocsMigrated || 0,
            filesMoved: job.data.filesMoved || 0,
          },
        };
      }

      default:
        throw new Error(`Invalid step: ${step}`);
    }
  }

  // If we reach here, job was already completed
  const companyResult = job.data.companyResult;
  return {
    success: true,
    companyId: companyResult?.companyId,
    message: "Job already completed",
  };
}
