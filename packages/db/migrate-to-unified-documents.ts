/**
 * Migration script to migrate data from dealDocuments and files tables
 * to the new unified documents table.
 *
 * Run this after running drizzle-kit generate and migrate to create the schema.
 *
 * Usage:
 *   bun run packages/db/migrate-to-unified-documents.ts
 */

import { db } from "./index";
import { dealDocuments, files, documents } from "./schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

// Category mapping from old enums to new unified enum
const mapDealDocumentCategory = (category: string): string => {
  // DealDocumentCategory values that map directly
  const directMap: Record<string, string> = {
    LEGAL: "LEGAL",
    DOCUMENTATION: "DOCUMENTATION",
    MARKETING: "MARKETING",
    INVESTOR_RELATIONSHIPS: "INVESTOR_RELATIONSHIPS",
    TECHNICAL: "TECHNICAL",
    TOOLS: "TOOLS",
    LEGISLATION: "LEGISLATION",
    RESEARCH: "RESEARCH",
    PROSPECTUS: "PROSPECTUS",
    FINANCIALS: "FINANCIALS",
    OTHER: "OTHER",
  };
  return directMap[category] || "OTHER";
};

const mapFileCategory = (category: string): string => {
  // FileCategory values that map directly
  const directMap: Record<string, string> = {
    FINANCIALS: "FINANCIALS",
    LEGAL: "LEGAL",
    TAX: "TAX",
    TECHNICAL: "TECHNICAL",
    COMMERCIAL: "COMMERCIAL",
    ESG: "ESG",
    MARKETING: "MARKETING",
    OPERATIONS: "OPERATIONS",
    OTHER: "OTHER",
  };
  return directMap[category] || "OTHER";
};

async function migrateDealDocuments() {
  console.log("Starting migration of dealDocuments to documents table...");

  const allDealDocuments = await db.select().from(dealDocuments);

  console.log(`Found ${allDealDocuments.length} deal documents to migrate`);

  let migrated = 0;
  let errors = 0;

  for (const doc of allDealDocuments) {
    try {
      // Map fileType to mimeType (if fileType exists, use it; otherwise null)
      const mimeType = doc.fileType || null;

      // Map category
      const category = mapDealDocumentCategory(doc.category);

      await db.insert(documents).values({
        id: doc.id, // Preserve original ID
        entityType: "DEAL",
        entityId: doc.dealId,
        title: doc.title,
        description: doc.description,
        caption: doc.caption,
        category: category as any, // Type assertion needed for enum
        tags: doc.tags || [],
        fileUrl: doc.documentUrl, // documentUrl -> fileUrl
        fileName: doc.fileName || doc.title, // Fallback to title if fileName is null
        fileSize: null, // dealDocuments doesn't have fileSize
        mimeType: mimeType,
        vectorStoreDocumentName: null, // No vector store embedding for old deal documents
        version: "1.0",
        isLatest: true,
        uploadedById: null, // dealDocuments doesn't track uploader
        comments: null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });

      migrated++;
      if (migrated % 100 === 0) {
        console.log(`Migrated ${migrated} deal documents...`);
      }
    } catch (error: any) {
      errors++;
      console.error(`Error migrating deal document ${doc.id}:`, error.message);
      // Continue with next document
    }
  }

  console.log(
    `Deal documents migration complete: ${migrated} migrated, ${errors} errors`
  );
  return { migrated, errors };
}

async function migrateFiles() {
  console.log("Starting migration of files to documents table...");

  const allFiles = await db.select().from(files);

  console.log(`Found ${allFiles.length} files to migrate`);

  let migrated = 0;
  let errors = 0;

  for (const file of allFiles) {
    try {
      // Map category
      const category = mapFileCategory(file.category);

      await db.insert(documents).values({
        id: file.id, // Preserve original ID
        entityType: "COMPANY",
        entityId: file.companyId,
        title: file.title,
        description: file.description,
        caption: null, // files doesn't have caption
        category: category as any, // Type assertion needed for enum
        tags: file.tags || [],
        fileUrl: file.fileUrl,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        vectorStoreDocumentName: null, // Will need to be populated separately if available
        version: file.version,
        isLatest: file.isLatest,
        uploadedById: file.uploadedById,
        comments: file.comments,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      });

      migrated++;
      if (migrated % 100 === 0) {
        console.log(`Migrated ${migrated} files...`);
      }
    } catch (error: any) {
      errors++;
      console.error(`Error migrating file ${file.id}:`, error.message);
      // Continue with next file
    }
  }

  console.log(
    `Files migration complete: ${migrated} migrated, ${errors} errors`
  );
  return { migrated, errors };
}

async function main() {
  console.log("=".repeat(60));
  console.log("Unified Documents Migration Script");
  console.log("=".repeat(60));
  console.log("");

  try {
    // Step 1: Migrate deal documents
    const dealResult = await migrateDealDocuments();
    console.log("");

    // Step 2: Migrate files
    const fileResult = await migrateFiles();
    console.log("");

    console.log("=".repeat(60));
    console.log("Migration Summary");
    console.log("=".repeat(60));
    console.log(
      `Deal Documents: ${dealResult.migrated} migrated, ${dealResult.errors} errors`
    );
    console.log(
      `Files: ${fileResult.migrated} migrated, ${fileResult.errors} errors`
    );
    console.log("=".repeat(60));

    if (dealResult.errors > 0 || fileResult.errors > 0) {
      console.error(
        "Migration completed with errors. Please review the output above."
      );
      process.exit(1);
    } else {
      console.log("✅ Migration completed successfully!");
      process.exit(0);
    }
  } catch (error) {
    console.error("Fatal error during migration:", error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (import.meta.main) {
  main();
}
