import { prisma } from "@/lib/db";
import { FoodSource, type MealType } from "@/generated/prisma/client";
import {
  type AddFoodTab,
  type FoodListItem,
} from "@/lib/food-shared";
import {
  quantityMultiplier,
  quantityUnitFromMode,
  type QuantityUnitMode,
} from "@/lib/quantity";

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
} as const;

async function favoriteIdsFor(userId: string): Promise<Set<string>> {
  const rows = await prisma.favorite.findMany({
    where: { userId },
    select: { foodId: true },
  });
  return new Set(rows.map((r) => r.foodId));
}

function withFavoriteFlag(
  foods: Omit<FoodListItem, "isFavorite">[],
  favorites: Set<string>,
): FoodListItem[] {
  return foods.map((f) => ({
    ...f,
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
    where: { userId, source: FoodSource.custom },
    select: FOOD_SELECT,
    orderBy: { name: "asc" },
  });
  return withFavoriteFlag(foods, favorites);
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
  const foods: Omit<FoodListItem, "isFavorite">[] = [];
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
    .map((r) => ({ ...r.food, isFavorite: true as const }))
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
        : await listAllCustomFoods(userId);

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

  const s = quantityMultiplier(
    input.quantity,
    input.unitMode,
    food.servingQty,
  );
  const quantityUnit = quantityUnitFromMode(input.unitMode, food.servingUnit);

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
