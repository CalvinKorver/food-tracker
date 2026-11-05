import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, FoodSource } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const DEFAULT_EMAIL = "calvin@foodtracker.local";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: DEFAULT_EMAIL },
    update: {},
    create: {
      email: DEFAULT_EMAIL,
      displayName: "Calvin",
      timezone: "America/Los_Angeles",
    },
  });

  const oatmeal = await prisma.food.upsert({
    where: {
      source_externalId: {
        source: FoodSource.custom,
        externalId: `seed:${user.id}:oatmeal`,
      },
    },
    update: {
      name: "Oatmeal, cooked",
      servingQty: 234,
      servingUnit: "g",
      calories: 158,
      proteinG: 5.5,
      carbsG: 27,
      fatG: 3.2,
      fiberG: 4,
      sugarG: 1.1,
      sodiumMg: 9,
    },
    create: {
      userId: user.id,
      source: FoodSource.custom,
      externalId: `seed:${user.id}:oatmeal`,
      name: "Oatmeal, cooked",
      // Typical cooked oatmeal serving by weight (not raw).
      servingQty: 234,
      servingUnit: "g",
      calories: 158,
      proteinG: 5.5,
      carbsG: 27,
      fatG: 3.2,
      fiberG: 4,
      sugarG: 1.1,
      sodiumMg: 9,
    },
  });

  const chicken = await prisma.food.upsert({
    where: {
      source_externalId: {
        source: FoodSource.custom,
        externalId: `seed:${user.id}:chicken-breast`,
      },
    },
    update: {},
    create: {
      userId: user.id,
      source: FoodSource.custom,
      externalId: `seed:${user.id}:chicken-breast`,
      name: "Chicken breast, cooked",
      brand: null,
      servingQty: 100,
      servingUnit: "g",
      calories: 165,
      proteinG: 31,
      carbsG: 0,
      fatG: 3.6,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 74,
    },
  });

  await prisma.favorite.upsert({
    where: {
      userId_foodId: { userId: user.id, foodId: chicken.id },
    },
    update: {},
    create: { userId: user.id, foodId: chicken.id },
  });

  console.log("Seeded user:", user.email, user.id);
  console.log("Seeded foods:", oatmeal.name, "|", chicken.name);
  console.log("Seeded favorite:", chicken.name);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
