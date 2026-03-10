import { rescreenAllDealOpportunities } from "../screening";

async function main() {
  const results = await rescreenAllDealOpportunities();
  console.log(`Backfilled ${results.length} deal opportunity screenings.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to backfill deal opportunity screenings", error);
    process.exit(1);
  });
