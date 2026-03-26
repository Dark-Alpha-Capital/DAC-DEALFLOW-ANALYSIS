import { Job } from "bullmq";
import { upsertCIMExtraction } from "@repo/db/mutations";
import { getFileContents } from "@repo/nextcloud";
import { extractTextFromPdf, runCIMExtractionLLM } from "@repo/cim-extraction";

export interface CIMExtractionJobData {
  simId: string;
  documentId?: string;
  dealOpportunityId?: string;
  filePath: string;
  userId?: string;
}

export async function cimExtractionHandler(
  job: Job<CIMExtractionJobData>,
): Promise<void> {
  const { simId, documentId, dealOpportunityId, filePath } = job.data;

  let fileBuffer: Buffer;
  try {
    fileBuffer = (await getFileContents(filePath)) as Buffer;
    console.log(
      `[cim-extraction] Step 2: Fetched file from Nextcloud, size=${fileBuffer.length} bytes`,
    );
  } catch (err) {
    console.error(
      `[cim-extraction] Nextcloud getFileContents failed (401 = bad credentials):`,
      err instanceof Error ? err.message : err,
    );
    throw err;
  }

  const rawText = await extractTextFromPdf(fileBuffer);
  console.log(
    `[cim-extraction] Step 3: Extracted text from PDF, length=${rawText.length} chars`,
  );
  let payload;
  try {
    payload = await runCIMExtractionLLM(rawText);

    console.log(`[cim-extraction] Step 4: LLM extraction done`, {
      revenueHistoryKeys: Object.keys(payload.revenueHistory ?? {}).length,
      ebitdaHistoryKeys: Object.keys(payload.ebitdaHistory ?? {}).length,
      growthDrivers: payload.growthDrivers?.length ?? 0,
      keyRisks: payload.keyRisks?.length ?? 0,
    });
  } catch (err) {
    console.error(
      `[cim-extraction] LLM extraction failed (401 = bad AI_API_KEY):`,
      err instanceof Error ? err.message : err,
    );
    throw err;
  }

  console.log("is this real or am i tripping");

  try {
    await upsertCIMExtraction({
      simId,
      documentId: documentId ?? undefined,
      dealOpportunityId: dealOpportunityId ?? undefined,
      payload,
      modelName: "gpt-4o-mini",
      version: "1",
    });
  } catch (err) {
    console.error(`[cim-extraction] Step 5 FAILED - DB upsert error:`, err);
    throw err;
  }

  console.log(`[cim-extraction] Step 6: Completed for sim ${simId}`);
}
