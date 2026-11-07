import "dotenv/config";
import { backfillOffServingUnits } from "../src/lib/off-serving-backfill";
import { prisma } from "../src/lib/db";

async function main() {
  const updated = await backfillOffServingUnits();
  console.log(`Updated servingUnit on ${updated} Open Food Facts food(s).`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
