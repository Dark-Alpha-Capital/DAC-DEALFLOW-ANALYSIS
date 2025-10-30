import { Pinecone } from "@pinecone-database/pinecone";
import prismaDB from "../../lib/prisma";
import { inferAttributes } from "../../lib/rollup/infer-rollup-details";
import { dealsIndex } from "@/lib/pinecone";
import { OpenAI } from "openai";
import { cleanStr, cleanNum } from "@/lib/utils";

// Initialize OpenAI for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

async function main() {
  const deals = await prismaDB.deal.findMany();

  const records: any[] = [];

  // Process deals in batches to avoid memory issues
  const PROCESSING_BATCH_SIZE = 10;
  for (let i = 0; i < deals.length; i += PROCESSING_BATCH_SIZE) {
    const dealBatch = deals.slice(i, i + PROCESSING_BATCH_SIZE);

    for (const deal of dealBatch) {
      try {
        // Chunk text parts
        const description = cleanStr(deal.dealCaption);
        const location = cleanStr(deal.companyLocation);
        const industry = cleanStr(deal.industry);

        // Meta data parts
        const brokerage = cleanStr(deal.brokerage);
        const revenue = cleanNum(deal.revenue);
        const ebitda = cleanNum(deal.ebitda);
        const firstName = cleanStr(deal.firstName);
        const lastName = cleanStr(deal.lastName);
        const name = firstName + " " + lastName;
        const email = cleanStr(deal.email);
        const linkedinUrl = cleanStr(deal.linkedinUrl);
        const workPhone = cleanStr(deal.workPhone);
        const title = cleanStr(deal.title);
        const dealTeaser = cleanStr(deal.dealTeaser);
        const grossRevenue = cleanNum(deal.grossRevenue);
        const askingPrice = cleanNum(deal.askingPrice);
        const ebitdaMargin = cleanNum(deal.ebitdaMargin);
        const dealType = cleanStr(deal.dealType);
        const sourceWebsite = cleanStr(deal.sourceWebsite);
        const companyLocation = cleanStr(deal.companyLocation);
        const createdAt = cleanStr(
          deal.createdAt ? deal.createdAt.toISOString() : null,
        );
        const updatedAt = cleanStr(
          deal.updatedAt ? deal.updatedAt.toISOString() : null,
        );
        const bitrixLink = cleanStr(deal.bitrixLink);
        const bitrixStatus = cleanStr(deal.status);
        const isReviewed = deal.isReviewed;
        const isPublished = deal.isPublished;
        const seen = deal.seen;
        const bitrixId = cleanStr(deal.bitrixId);
        const bitrixCreatedAt = cleanStr(
          deal.bitrixCreatedAt ? deal.bitrixCreatedAt.toISOString() : null,
        );
        const userId = cleanStr(deal.userId);
        const tags = cleanStr(
          Array.isArray(deal.tags) ? deal.tags.join(", ") : "",
        );

        const chunk_text = [description, location, industry]
          .filter(Boolean)
          .join(" | ");

        // Skip if no text content for embedding
        if (!chunk_text.trim()) {
          console.log(`Skipping deal ${deal.id} - no text content`);
          continue;
        }

        // Generate embedding for the text
        let embedding: number[];
        try {
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: chunk_text,
          });
          embedding = embeddingResponse.data[0].embedding;
        } catch (embeddingError) {
          console.error(
            `Failed to generate embedding for deal ${deal.id}:`,
            embeddingError,
          );
          continue;
        }

        const record: any = {
          id: deal.id,
          values: embedding,
          metadata: {
            chunk_text,
            // Add metadata fields
            ...(description && { description }),
            ...(location && { location }),
            ...(industry && { industry }),
            ...(brokerage && { brokerage }),
            ...(revenue !== null && { revenue }),
            ...(ebitda !== null && { ebitda }),
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(name && { name }),
            ...(email && { email }),
            ...(linkedinUrl && { linkedinUrl }),
            ...(workPhone && { workPhone }),
            ...(title && { title }),
            ...(dealTeaser && { dealTeaser }),
            ...(grossRevenue !== null && { grossRevenue }),
            ...(askingPrice !== null && { askingPrice }),
            ...(ebitdaMargin !== null && { ebitdaMargin }),
            ...(dealType && { dealType }),
            ...(sourceWebsite && { sourceWebsite }),
            ...(companyLocation && { companyLocation }),
            ...(createdAt && { createdAt }),
            ...(updatedAt && { updatedAt }),
            ...(bitrixLink && { bitrixLink }),
            ...(bitrixStatus && { bitrixStatus }),
            ...(isReviewed !== undefined && { isReviewed }),
            ...(isPublished !== undefined && { isPublished }),
            ...(seen !== undefined && { seen }),
            ...(bitrixId && { bitrixId }),
            ...(bitrixCreatedAt && { bitrixCreatedAt }),
            ...(userId && { userId }),
            ...(tags && { tags }),
          },
        };

        // const inferred = await inferAttributes(deal);
        // record.metadata.business_strategy = inferred.business_strategy;
        // record.metadata.growth_stage = inferred.growth_stage;
        // record.metadata.confidence_business_strategy =
        //   inferred.confidence_scores.business_strategy;
        // record.metadata.confidence_growth_stage = inferred.confidence_scores.growth_stage;

        records.push(record);
      } catch (error) {
        console.error(`Error processing deal ${deal.id}:`, error);
        continue;
      }
    }

    console.log(
      `Processed ${Math.min(i + PROCESSING_BATCH_SIZE, deals.length)}/${deals.length} deals`,
    );
  }

  // Upsert records to Pinecone with Batching
  const index = dealsIndex.namespace("initial");

  const BATCH_SIZE = 96;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    try {
      await index.upsert(batch);
      successCount += batch.length;
      console.log(
        `✅ Upserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} records)`,
      );
    } catch (err) {
      errorCount += batch.length;
      console.error(
        `❌ Error upserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`,
        err,
      );

      // Try individual records if batch fails
      console.log(`Attempting individual record upserts for failed batch...`);
      for (const record of batch) {
        try {
          await index.upsert([record]);
          successCount++;
          errorCount--;
        } catch (individualErr) {
          console.error(
            `Failed to upsert individual record ${record.id}:`,
            individualErr,
          );
        }
      }
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`✅ Successfully processed: ${successCount} records`);
  console.log(`❌ Failed: ${errorCount} records`);
  console.log(
    `📈 Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(2)}%`,
  );
}

main().catch(console.error);
