/**
 * Utility function to copy documents from a deal to a company
 * when a deal is converted to a company.
 *
 * This function:
 * 1. Finds all documents associated with the deal
 * 2. Copies each file in Nextcloud from dealflow/raw-deals/{dealId}/ to Diligence/{companyId}/
 * 3. Creates new document records with entityType = "COMPANY"
 * 4. Preserves original deal documents for history
 * 5. Optionally creates new vector store embeddings with company metadata
 *
 * Usage:
 *   import { copyDealDocumentsToCompany } from "db/copy-deal-documents-to-company";
 *   await copyDealDocumentsToCompany(dealId, companyId, companyMetadata);
 */

import { db } from "./index";
import { documents, deals, companies } from "./schema";
import { eq, and } from "drizzle-orm";
import { createClient } from "webdav";
// Note: Vector store embedding requires worker environment
// This function can be called from the worker or with proper environment setup
let COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME: string | null = null;
let googleGenAI: any;

// Lazy load Google AI client (only if needed and available)
async function getGoogleGenAI(): Promise<{
  googleGenAI: any;
  COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME: string;
} | null> {
  if (!googleGenAI) {
    try {
      const module = await import("../../apps/worker/lib/ai/available-models");
      const storeName = module.COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME;
      if (!storeName) {
        return null;
      }
      COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME = storeName as string;
      googleGenAI = module.googleGenAI;
    } catch (error) {
      console.warn(
        "Google GenAI not available - vector store embedding will be skipped"
      );
      return null;
    }
  }
  if (!COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME || !googleGenAI) {
    return null;
  }
  return {
    googleGenAI,
    COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME: COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME,
  };
}

export interface CompanyMetadata {
  name: string;
  sector: string | null;
  stage: string | null;
  headquarters: string | null;
  revenue: number | null;
  ebitda: number | null;
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
 * Copy a single document from deal to company
 */
async function copyDocument(
  document: typeof documents.$inferSelect,
  companyId: string,
  companyMetadata: CompanyMetadata,
  embedInVectorStore: boolean = true
): Promise<string> {
  const client = createNextcloudClient();

  // Extract source and destination paths
  const sourcePath = extractFilePathFromUrl(document.fileUrl);
  const fileName = document.fileName;
  const destPath = `Diligence/${companyId}/${fileName}`;

  // Ensure destination directory exists
  const dirPath = `Diligence/${companyId}`;
  try {
    await client.createDirectory(dirPath, { recursive: true });
  } catch (err) {
    // Directory might already exist, which is fine
    console.log(`Directory ${dirPath} may already exist`);
  }

  // Copy file in Nextcloud
  const fileBuffer = await client.getFileContents(sourcePath, {
    format: "binary",
  });
  await client.putFileContents(destPath, fileBuffer as Buffer);

  const publicUrl = `${process.env.NEXTCLOUD_URL}/remote.php/dav/files/${process.env.NEXTCLOUD_USER}/${destPath}`;

  // Handle vector store embedding if enabled
  let vectorStoreDocumentName: string | null = null;
  if (embedInVectorStore) {
    try {
      const aiClient = await getGoogleGenAI();
      if (aiClient && aiClient.COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME) {
        const fileBlob = new Blob([fileBuffer as Buffer], {
          type: document.mimeType || "application/octet-stream",
        });

        const customMetadata = [
          { key: "entityType", stringValue: "COMPANY" },
          { key: "entityId", stringValue: companyId },
          { key: "companyName", stringValue: companyMetadata.name },
          { key: "sector", stringValue: companyMetadata.sector ?? "" },
          { key: "stage", stringValue: companyMetadata.stage ?? "" },
          {
            key: "headquarters",
            stringValue: companyMetadata.headquarters ?? "",
          },
          { key: "revenue", numericValue: companyMetadata.revenue ?? 0 },
          { key: "ebitda", numericValue: companyMetadata.ebitda ?? 0 },
          { key: "uploadedAt", stringValue: new Date().toISOString() },
          { key: "fileName", stringValue: fileName },
          { key: "copiedFromDeal", stringValue: "true" },
        ];

        let operation =
          await aiClient.googleGenAI.fileSearchStores.uploadToFileSearchStore({
            file: fileBlob,
            fileSearchStoreName: aiClient.COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME,
            config: {
              displayName: fileName,
              customMetadata,
            },
          });

        // Wait for indexing to complete
        while (!operation.done) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          operation = await aiClient.googleGenAI.operations.get({ operation });
        }

        vectorStoreDocumentName =
          (operation.response as any)?.documentName ||
          (operation.response as any)?.document?.name ||
          null;
      }
    } catch (error) {
      console.error(
        `Error embedding document in vector store: ${document.id}`,
        error
      );
      // Continue without vector store embedding
    }
  }

  // Create new document record for company
  const [newDocument] = await db
    .insert(documents)
    .values({
      entityType: "COMPANY",
      entityId: companyId,
      title: document.title,
      description: document.description,
      caption: document.caption,
      category: document.category,
      tags: document.tags || [],
      fileUrl: publicUrl,
      fileName: document.fileName,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      vectorStoreDocumentName,
      version: "1.0",
      isLatest: true,
      uploadedById: document.uploadedById, // Preserve original uploader if available
      comments: document.comments,
      createdAt: new Date(), // New creation date for company document
      updatedAt: new Date(),
    })
    .returning();

  if (!newDocument) {
    throw new Error("Failed to create document record");
  }

  return newDocument.id;
}

/**
 * Copy all documents from a deal to a company
 *
 * @param dealId - The ID of the deal to copy documents from
 * @param companyId - The ID of the company to copy documents to
 * @param companyMetadata - Metadata about the company for vector store embedding
 * @param embedInVectorStore - Whether to embed documents in vector store (default: true)
 * @returns Object with counts of copied documents and any errors
 */
export async function copyDealDocumentsToCompany(
  dealId: string,
  companyId: string,
  companyMetadata: CompanyMetadata,
  embedInVectorStore: boolean = true
): Promise<{
  success: boolean;
  copiedCount: number;
  errorCount: number;
  errors: Array<{ documentId: string; error: string }>;
}> {
  console.log(
    `[copy-documents] Starting copy from deal ${dealId} to company ${companyId}`
  );

  // Verify deal and company exist
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
  if (!deal) {
    throw new Error(`Deal ${dealId} not found`);
  }

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  if (!company) {
    throw new Error(`Company ${companyId} not found`);
  }

  // Find all documents for the deal
  const dealDocuments = await db
    .select()
    .from(documents)
    .where(and(eq(documents.entityType, "DEAL"), eq(documents.entityId, dealId)));

  console.log(
    `[copy-documents] Found ${dealDocuments.length} documents to copy`
  );

  if (dealDocuments.length === 0) {
    return {
      success: true,
      copiedCount: 0,
      errorCount: 0,
      errors: [],
    };
  }

  // Copy each document
  let copiedCount = 0;
  const errors: Array<{ documentId: string; error: string }> = [];

  for (const document of dealDocuments) {
    try {
      await copyDocument(document, companyId, companyMetadata, embedInVectorStore);
      copiedCount++;
      console.log(
        `[copy-documents] Copied document ${document.id} (${copiedCount}/${dealDocuments.length})`
      );
    } catch (error: any) {
      errors.push({
        documentId: document.id,
        error: error.message || String(error),
      });
      console.error(
        `[copy-documents] Error copying document ${document.id}:`,
        error
      );
    }
  }

  const success = errors.length === 0;

  console.log(
    `[copy-documents] Copy complete: ${copiedCount} copied, ${errors.length} errors`
  );

  return {
    success,
    copiedCount,
    errorCount: errors.length,
    errors,
  };
}
