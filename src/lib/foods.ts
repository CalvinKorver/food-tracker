import { prisma } from "@/lib/db";
import { FoodSource, type MealType, Prisma } from "@/generated/prisma/client";
import {
  USER_FOOD_SOURCES,
  portionsFromNutrientsExtra,
  type AddFoodTab,
  type FoodListItem,
} from "@/lib/food-shared";
import {
  quantityMultiplier,
  quantityUnitFromMode,
  type QuantityUnitMode,
} from "@/lib/quantity";
import type { NormalizedFood } from "@/lib/sources/types";

export type { AddFoodTab, FoodListItem } from "@/lib/food-shared";
export {
  sourceBadge,
  isMealType,
  mealLabel,
} from "@/lib/food-shared";

const FOOD_SELECT = {
  id: true,
  name: true,
  brand: true,
  source: true,
  servingQty: true,
  servingUnit: true,
  calories: true,
  proteinG: true,
  carbsG: true,
  fatG: true,
  fiberG: true,
  sugarG: true,
  sodiumMg: true,
  servingsPerRecipe: true,
  nutrientsExtra: true,
} as const;

type FoodRow = {
  id: string;
  name: string;
  brand: string | null;
  source: FoodSource;
  servingQty: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  servingsPerRecipe: number | null;
  nutrientsExtra: unknown;
};

function toFoodListBase(food: FoodRow): Omit<FoodListItem, "isFavorite"> {
  const { nutrientsExtra, ...rest } = food;
  return {
    ...rest,
    portions: portionsFromNutrientsExtra(nutrientsExtra),
  };
}

async function favoriteIdsFor(userId: string): Promise<Set<string>> {
  const rows = await prisma.favorite.findMany({
    where: { userId },
    select: { foodId: true },
  });
  return new Set(rows.map((r) => r.foodId));
}

function withFavoriteFlag(
  foods: FoodRow[],
  favorites: Set<string>,
): FoodListItem[] {
  return foods.map((f) => ({
    ...toFoodListBase(f),
    isFavorite: favorites.has(f.id),
  }));
}

function matchesQuery(
  food: { name: string; brand: string | null },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    food.name.toLowerCase().includes(q) ||
    (food.brand?.toLowerCase().includes(q) ?? false)
  );
}

export async function listAllCustomFoods(
  userId: string,
): Promise<FoodListItem[]> {
  const favorites = await favoriteIdsFor(userId);
  const foods = await prisma.food.findMany({
    where: {
      userId,
      source: { in: [...USER_FOOD_SOURCES] },
    },
    select: FOOD_SELECT,
    orderBy: { name: "asc" },
  });
  return withFavoriteFlag(foods, favorites);
}

/**
 * All usable foods for add-food: user's customs plus any food they have logged
 * (any source, including Open Food Facts from barcode scans).
 */
export async function listAllFoods(userId: string): Promise<FoodListItem[]> {
  const favorites = await favoriteIdsFor(userId);
  const [customs, logged] = await Promise.all([
    prisma.food.findMany({
      where: {
        userId,
        source: { in: [...USER_FOOD_SOURCES] },
      },
      select: FOOD_SELECT,
    }),
    prisma.foodEntry.findMany({
      where: { userId },
      distinct: ["foodId"],
      select: { food: { select: FOOD_SELECT } },
    }),
  ]);

  const byId = new Map<string, FoodRow>();
  for (const food of customs) {
    byId.set(food.id, food);
  }
  for (const entry of logged) {
    byId.set(entry.food.id, entry.food);
  }

  const foods = [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return withFavoriteFlag(foods, favorites);
}

export async function getFoodListItem(
  userId: string,
  foodId: string,
): Promise<FoodListItem | null> {
  const food = await prisma.food.findFirst({
    where: {
      id: foodId,
      OR: [{ userId }, { userId: null }],
    },
    select: FOOD_SELECT,
  });
  if (!food) return null;

  const favorites = await favoriteIdsFor(userId);
  return { ...toFoodListBase(food), isFavorite: favorites.has(food.id) };
}

export async function upsertOffFood(
  normalized: NormalizedFood,
  userId?: string,
): Promise<FoodListItem> {
  if (!normalized.externalId) {
    throw new Error("Open Food Facts food is missing a barcode");
  }

  const data = {
    userId: null as string | null,
    source: FoodSource.open_food_facts,
    externalId: normalized.externalId,
    barcode: normalized.barcode,
    name: normalized.name,
    brand: normalized.brand,
    servingQty: normalized.servingQty,
    servingUnit: normalized.servingUnit,
    calories: normalized.calories,
    proteinG: normalized.proteinG,
    carbsG: normalized.carbsG,
    fatG: normalized.fatG,
    fiberG: normalized.fiberG,
    sugarG: normalized.sugarG,
    sodiumMg: normalized.sodiumMg,
    nutrientsExtra: normalized.nutrientsExtra as Prisma.InputJsonValue,
    sourcePayload: normalized.sourcePayload as Prisma.InputJsonValue,
  };

  const food = await prisma.food.upsert({
    where: {
      source_externalId: {
        source: FoodSource.open_food_facts,
        externalId: normalized.externalId,
      },
    },
    create: data,
    update: {
      barcode: data.barcode,
      name: data.name,
      brand: data.brand,
      servingQty: data.servingQty,
      servingUnit: data.servingUnit,
      calories: data.calories,
      proteinG: data.proteinG,
      carbsG: data.carbsG,
      fatG: data.fatG,
      fiberG: data.fiberG,
      sugarG: data.sugarG,
      sodiumMg: data.sodiumMg,
      nutrientsExtra: data.nutrientsExtra,
      sourcePayload: data.sourcePayload,
    },
    select: FOOD_SELECT,
  });

  const favorites = userId
    ? await favoriteIdsFor(userId)
    : new Set<string>();
  return { ...toFoodListBase(food), isFavorite: favorites.has(food.id) };
}

export async function upsertFdcFood(
  normalized: NormalizedFood,
  userId?: string,
): Promise<FoodListItem> {
  if (!normalized.externalId) {
    throw new Error("USDA FDC food is missing an id");
  }
  if (normalized.source !== FoodSource.usda_fdc) {
    throw new Error("Expected usda_fdc source");
  }

  const data = {
    userId: null as string | null,
    source: FoodSource.usda_fdc,
    externalId: normalized.externalId,
    barcode: normalized.barcode,
    name: normalized.name,
    brand: normalized.brand,
    servingQty: normalized.servingQty,
    servingUnit: normalized.servingUnit,
    calories: normalized.calories,
    proteinG: normalized.proteinG,
    carbsG: normalized.carbsG,
    fatG: normalized.fatG,
    fiberG: normalized.fiberG,
    sugarG: normalized.sugarG,
    sodiumMg: normalized.sodiumMg,
    nutrientsExtra: normalized.nutrientsExtra as Prisma.InputJsonValue,
    sourcePayload: normalized.sourcePayload as Prisma.InputJsonValue,
  };

  const food = await prisma.food.upsert({
    where: {
      source_externalId: {
        source: FoodSource.usda_fdc,
        externalId: normalized.externalId,
      },
    },
    create: data,
    update: {
      barcode: data.barcode,
      name: data.name,
      brand: data.brand,
      servingQty: data.servingQty,
      servingUnit: data.servingUnit,
      calories: data.calories,
      proteinG: data.proteinG,
      carbsG: data.carbsG,
      fatG: data.fatG,
      fiberG: data.fiberG,
      sugarG: data.sugarG,
      sodiumMg: data.sodiumMg,
      nutrientsExtra: data.nutrientsExtra,
      sourcePayload: data.sourcePayload,
    },
    select: FOOD_SELECT,
  });

  const favorites = userId
    ? await favoriteIdsFor(userId)
    : new Set<string>();
  return { ...toFoodListBase(food), isFavorite: favorites.has(food.id) };
}

export async function listRecentFoods(
  userId: string,
  limit = 25,
): Promise<FoodListItem[]> {
  const favorites = await favoriteIdsFor(userId);
  const entries = await prisma.foodEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { foodId: true, food: { select: FOOD_SELECT } },
  });

  const seen = new Set<string>();
  const foods: FoodRow[] = [];
  for (const entry of entries) {
    if (seen.has(entry.foodId)) continue;
    seen.add(entry.foodId);
    foods.push(entry.food);
    if (foods.length >= limit) break;
  }

  return withFavoriteFlag(foods, favorites);
}

export async function listFavoriteFoods(
  userId: string,
): Promise<FoodListItem[]> {
  const rows = await prisma.favorite.findMany({
    where: { userId },
    include: { food: { select: FOOD_SELECT } },
  });
  return rows
    .map((r) => ({ ...toFoodListBase(r.food), isFavorite: true as const }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function searchFoods(
  userId: string,
  tab: AddFoodTab,
  query: string,
): Promise<FoodListItem[]> {
  const list =
    tab === "recents"
      ? await listRecentFoods(userId)
      : tab === "favorites"
        ? await listFavoriteFoods(userId)
        : await listAllFoods(userId);

  return list.filter((f) => matchesQuery(f, query));
}

export async function toggleFavorite(
  userId: string,
  foodId: string,
): Promise<{ isFavorite: boolean }> {
  const existing = await prisma.favorite.findUnique({
    where: { userId_foodId: { userId, foodId } },
  });

  if (existing) {
    await prisma.favorite.delete({
      where: { userId_foodId: { userId, foodId } },
    });
    return { isFavorite: false };
  }

  await prisma.favorite.create({ data: { userId, foodId } });
  return { isFavorite: true };
}

/**
 * Snapshot nutrients = food nutrients × multiplier.
 * multiplier from quantity + unitMode (serving vs food's native unit).
 */
export async function createFoodEntry(input: {
  userId: string;
  foodId: string;
  loggedOn: Date;
  meal: MealType;
  quantity: number;
  unitMode: QuantityUnitMode;
  selectedUnit?: string;
}) {
  const food = await prisma.food.findFirst({
    where: {
      id: input.foodId,
      OR: [{ userId: input.userId }, { userId: null }],
    },
  });

  if (!food) {
    throw new Error("Food not found");
  }

  const selectedUnit =
    input.unitMode === "food"
      ? (input.selectedUnit ?? food.servingUnit)
      : undefined;
  const s = quantityMultiplier(
    input.quantity,
    input.unitMode,
    food.servingQty,
    food.servingsPerRecipe,
    input.unitMode === "food"
      ? {
          foodServingUnit: food.servingUnit,
          selectedUnit,
          portions: portionsFromNutrientsExtra(food.nutrientsExtra),
        }
      : undefined,
  );
  const quantityUnit = quantityUnitFromMode(
    input.unitMode,
    food.servingUnit,
    selectedUnit,
  );

  return prisma.foodEntry.create({
    data: {
      userId: input.userId,
      foodId: food.id,
      loggedOn: input.loggedOn,
      meal: input.meal,
      servings: s,
      quantityValue: input.quantity,
      quantityUnit,
      foodNameSnapshot: food.name,
      caloriesSnapshot: food.calories * s,
      proteinGSnapshot: food.proteinG * s,
      carbsGSnapshot: food.carbsG * s,
      fatGSnapshot: food.fatG * s,
      fiberGSnapshot: food.fiberG * s,
      sugarGSnapshot: food.sugarG * s,
      sodiumMgSnapshot: food.sodiumMg * s,
      nutrientsExtraSnapshot: food.nutrientsExtra ?? {},
    },
  });
}
