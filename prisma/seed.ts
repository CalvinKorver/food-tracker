import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient, FoodSource } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

export const DEFAULT_USER_EMAIL = "calvin@foodtracker.local";

async function main() {
  const password = process.env.SEED_USER_PASSWORD;
  if (!password) {
    throw new Error("SEED_USER_PASSWORD is not set");
  }

  const user = await prisma.user.upsert({
    where: { email: DEFAULT_USER_EMAIL },
    update: {
      displayName: "Calvin",
      timezone: "America/Los_Angeles",
      emailVerified: true,
    },
    create: {
      email: DEFAULT_USER_EMAIL,
      displayName: "Calvin",
      timezone: "America/Los_Angeles",
      emailVerified: true,
    },
  });

  const passwordHash = await hashPassword(password);
  const existingCredential = await prisma.account.findFirst({
    where: {
      userId: user.id,
      providerId: "credential",
    },
  });

  if (existingCredential) {
    await prisma.account.update({
      where: { id: existingCredential.id },
      data: { password: passwordHash, accountId: user.id },
    });
  } else {
    await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: passwordHash,
      },
    });
  }

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
  console.log("Seeded credential account for email/password login");
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
