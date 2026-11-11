import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import {
  PrismaClient,
  FoodSource,
  MealType,
} from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

export const DEFAULT_USER_EMAIL = "calvin@foodtracker.local";

/** Calendar YYYY-MM-DD in a timezone → UTC Date for Prisma `@db.Date`. */
function todayDateInZone(timeZone: string, now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const d = Number(parts.find((p) => p.type === "day")!.value);
  return new Date(Date.UTC(y, m - 1, d));
}

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
      calorieGoal: 2000,
      proteinGoalG: 150,
      carbsGoalG: 200,
      fatGoalG: 66.67,
      calorieNagEnabled: true,
    },
    create: {
      email: DEFAULT_USER_EMAIL,
      displayName: "Calvin",
      timezone: "America/Los_Angeles",
      emailVerified: true,
      calorieGoal: 2000,
      proteinGoalG: 150,
      carbsGoalG: 200,
      fatGoalG: 66.67,
      calorieNagEnabled: true,
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

  // Real-ish day: ~1920 kcal (cusp), protein under (~73/150), fat ~104% (~69/66.67).
  const seedFoods = [
    {
      key: "bagel-cream-cheese",
      name: "Bagel with cream cheese",
      servingQty: 1,
      servingUnit: "bagel",
      calories: 450,
      proteinG: 14,
      carbsG: 58,
      fatG: 15,
      fiberG: 2,
      sugarG: 8,
      sodiumMg: 520,
    },
    {
      key: "chicken-caesar-wrap",
      name: "Chicken Caesar wrap",
      servingQty: 1,
      servingUnit: "wrap",
      calories: 480,
      proteinG: 34,
      carbsG: 40,
      fatG: 14,
      fiberG: 3,
      sugarG: 3,
      sodiumMg: 890,
    },
    {
      key: "trail-mix",
      name: "Trail mix",
      servingQty: 40,
      servingUnit: "g",
      calories: 220,
      proteinG: 6,
      carbsG: 18,
      fatG: 12,
      fiberG: 3,
      sugarG: 10,
      sodiumMg: 55,
    },
    {
      key: "veggie-fried-rice",
      name: "Vegetable fried rice",
      servingQty: 1,
      servingUnit: "bowl",
      calories: 520,
      proteinG: 16,
      carbsG: 72,
      fatG: 16,
      fiberG: 4,
      sugarG: 6,
      sodiumMg: 780,
    },
    {
      key: "choc-chip-cookie",
      name: "Chocolate chip cookie",
      servingQty: 1,
      servingUnit: "cookie",
      calories: 250,
      proteinG: 3,
      carbsG: 34,
      fatG: 12,
      fiberG: 1,
      sugarG: 22,
      sodiumMg: 140,
    },
  ] as const;

  const foodsByKey: Record<string, { id: string; name: string } & (typeof seedFoods)[number]> =
    Object.create(null);

  for (const spec of seedFoods) {
    const food = await prisma.food.upsert({
      where: {
        source_externalId: {
          source: FoodSource.custom,
          externalId: `seed:${user.id}:${spec.key}`,
        },
      },
      update: {
        name: spec.name,
        servingQty: spec.servingQty,
        servingUnit: spec.servingUnit,
        calories: spec.calories,
        proteinG: spec.proteinG,
        carbsG: spec.carbsG,
        fatG: spec.fatG,
        fiberG: spec.fiberG,
        sugarG: spec.sugarG,
        sodiumMg: spec.sodiumMg,
      },
      create: {
        userId: user.id,
        source: FoodSource.custom,
        externalId: `seed:${user.id}:${spec.key}`,
        name: spec.name,
        servingQty: spec.servingQty,
        servingUnit: spec.servingUnit,
        calories: spec.calories,
        proteinG: spec.proteinG,
        carbsG: spec.carbsG,
        fatG: spec.fatG,
        fiberG: spec.fiberG,
        sugarG: spec.sugarG,
        sodiumMg: spec.sodiumMg,
      },
    });
    foodsByKey[spec.key] = { ...spec, id: food.id, name: food.name };
  }

  const loggedOn = todayDateInZone(user.timezone);
  await prisma.foodEntry.deleteMany({
    where: { userId: user.id, loggedOn },
  });

  const dayPlan: { key: (typeof seedFoods)[number]["key"]; meal: MealType }[] =
    [
      { key: "bagel-cream-cheese", meal: MealType.breakfast },
      { key: "chicken-caesar-wrap", meal: MealType.lunch },
      { key: "trail-mix", meal: MealType.snack },
      { key: "veggie-fried-rice", meal: MealType.dinner },
      { key: "choc-chip-cookie", meal: MealType.snack },
    ];

  for (const row of dayPlan) {
    const food = foodsByKey[row.key]!;
    await prisma.foodEntry.create({
      data: {
        userId: user.id,
        foodId: food.id,
        loggedOn,
        meal: row.meal,
        servings: 1,
        quantityValue: 1,
        quantityUnit: "serving(s)",
        foodNameSnapshot: food.name,
        caloriesSnapshot: food.calories,
        proteinGSnapshot: food.proteinG,
        carbsGSnapshot: food.carbsG,
        fatGSnapshot: food.fatG,
        fiberGSnapshot: food.fiberG,
        sugarGSnapshot: food.sugarG,
        sodiumMgSnapshot: food.sodiumMg,
      },
    });
  }

  const dayCals = seedFoods.reduce((s, f) => s + f.calories, 0);
  const dayProtein = seedFoods.reduce((s, f) => s + f.proteinG, 0);
  const dayFat = seedFoods.reduce((s, f) => s + f.fatG, 0);
  const fatPct = Math.round((dayFat / 66.67) * 100);

  console.log("Seeded user:", user.email, user.id);
  console.log("Seeded credential account for email/password login");
  console.log("Seeded foods:", oatmeal.name, "|", chicken.name);
  console.log(
    "Seeded day foods:",
    seedFoods.map((f) => f.name).join(" | "),
  );
  console.log("Seeded favorite:", chicken.name);
  console.log(
    "Seeded today:",
    loggedOn.toISOString().slice(0, 10),
    `${dayCals}/2000 kcal, ${dayProtein}/150g protein, ${dayFat}g fat (~${fatPct}%), nag on`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
