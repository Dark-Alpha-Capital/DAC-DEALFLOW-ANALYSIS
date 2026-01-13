/**
 * Convert a raw deal to a company
 *
 * This function:
 * 1. Creates a company record from deal data (with proper field mapping)
 * 2. Updates (not copies) all documents to change entityType from "DEAL" to "COMPANY"
 * 3. Moves (not copies) files in Nextcloud from dealflow/raw-deals/{dealId}/ to Diligence/{companyId}/
 * 4. Migrates POCs from deal to company (updates dealId to companyId)
 * 5. Deletes the original deal record
 *
 * Usage:
 *   import { convertDealToCompany } from "db/convert-deal-to-company";
 *   const result = await convertDealToCompany(dealId, userId);
 */

import { db } from "./index";
import { deals, companies, documents, pocs } from "./schema";
import { eq, and } from "drizzle-orm";
import { createClient } from "webdav";

/**
 * Extract file path from Nextcloud URL
 */
function extractFilePathFromUrl(url: string): string {
  // URL format: https://nextcloud.example.com/remote.php/dav/files/user/path/to/file
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

/**
 * Convert a deal to a company
 *
 * @param dealId - The ID of the deal to convert
 * @param userId - The ID of the user performing the conversion
 * @returns Result object with success status and company ID or error
 */
export async function convertDealToCompany(
  dealId: string,
  userId: string
): Promise<ConvertDealToCompanyResult> {
  console.log(
    `[convert-deal] Starting conversion of deal ${dealId} to company`
  );

  try {
    // Step 1: Fetch deal data
    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!deal) {
      throw new Error(`Deal ${dealId} not found`);
    }

    // Step 2: Create company record from deal data
    // Map deal fields to company schema
    const companyName = deal.title
      ? `${deal.title} - ${deal.dealCaption}`
      : deal.dealCaption;

    const [newCompany] = await db
      .insert(companies)
      .values({
        name: companyName,
        sector: deal.industry || null,
        headquarters: deal.companyLocation || null,
        description: deal.description || null,
        revenue: deal.revenue ? deal.revenue.toString() : null,
        ebitda: deal.ebitda ? deal.ebitda.toString() : null,
        employees: null, // Optional field, not available in deals
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

    const companyId = newCompany.id;
    console.log(`[convert-deal] Created company ${companyId}`);

    // Step 3: Get all documents for the deal
    const dealDocuments = await db
      .select()
      .from(documents)
      .where(and(eq(documents.entityType, "DEAL"), eq(documents.entityId, dealId)));

    console.log(
      `[convert-deal] Found ${dealDocuments.length} documents to migrate`
    );

    // Step 4: Move files in Nextcloud and update documents
    const client = createNextcloudClient();
    let documentsUpdated = 0;
    let filesMoved = 0;

    // Ensure destination directory exists
    const destDirPath = `Diligence/${companyId}`;
    try {
      await client.createDirectory(destDirPath, { recursive: true });
    } catch (err) {
      // Directory might already exist, which is fine
      console.log(`[convert-deal] Directory ${destDirPath} may already exist`);
    }

    for (const document of dealDocuments) {
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
              `[convert-deal] File not found at ${sourcePath}, trying ${expectedSourcePath}`
            );
            try {
              fileBuffer = (await client.getFileContents(expectedSourcePath, {
                format: "binary",
              })) as Buffer;
            } catch (retryError) {
              console.error(
                `[convert-deal] Failed to read file for document ${document.id}:`,
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
          if (deleteError?.response?.status === 404 && sourcePath !== expectedSourcePath) {
            try {
              await client.deleteFile(expectedSourcePath);
            } catch (retryDeleteError) {
              console.warn(
                `[convert-deal] Could not delete old file ${expectedSourcePath}:`,
                retryDeleteError
              );
              // Continue - file move succeeded even if delete failed
            }
          } else {
            console.warn(
              `[convert-deal] Could not delete old file ${sourcePath}:`,
              deleteError
            );
            // Continue - file move succeeded even if delete failed
          }
        }

        // Update document record
        const newFileUrl = `${process.env.NEXTCLOUD_URL}/remote.php/dav/files/${process.env.NEXTCLOUD_USER}/${destPath}`;

        await db
          .update(documents)
          .set({
            entityType: "COMPANY",
            entityId: companyId,
            fileUrl: newFileUrl,
            updatedAt: new Date(),
          })
          .where(eq(documents.id, document.id));

        filesMoved++;
        documentsUpdated++;
        console.log(
          `[convert-deal] Moved and updated document ${document.id} (${filesMoved}/${dealDocuments.length})`
        );
      } catch (error: any) {
        console.error(
          `[convert-deal] Error processing document ${document.id}:`,
          error
        );
        throw new Error(
          `Failed to move document ${document.id}: ${error.message || String(error)}`
        );
      }
    }

    // Step 5: Migrate POCs from deal to company
    const dealPocs = await db
      .select()
      .from(pocs)
      .where(eq(pocs.dealId, dealId));

    console.log(`[convert-deal] Found ${dealPocs.length} POCs to migrate`);

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
      console.log(
        `[convert-deal] Migrated POC ${poc.id} (${pocsMigrated}/${dealPocs.length})`
      );
    }

    // Step 6: Delete the deal record (this will cascade delete related records via foreign keys)
    await db.delete(deals).where(eq(deals.id, dealId));

    console.log(`[convert-deal] Deleted deal ${dealId}`);
    console.log(
      `[convert-deal] Conversion complete: Company ${companyId} created successfully`
    );

    return {
      success: true,
      companyId,
      details: {
        documentsUpdated,
        pocsMigrated,
        filesMoved,
      },
    };
  } catch (error: any) {
    console.error(`[convert-deal] Conversion failed:`, error);
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}
