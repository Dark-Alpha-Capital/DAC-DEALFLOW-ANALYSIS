import prismaDB from "../../lib/prisma";
import { sampleDeals } from "../sample-deals";

async function main() {
  for (const deal of sampleDeals) {
    await prismaDB.deal.create({ data: deal });
    console.log(`Inserted deal: ${deal.dealCaption}`);
  }
  console.log("Sample deals migration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaDB.$disconnect();
  });