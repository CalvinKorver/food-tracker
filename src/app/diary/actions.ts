"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { dateFromKey } from "@/lib/dates";
import { deleteFoodEntry } from "@/lib/diary";
import {
  createFoodEntry,
  toggleFavorite,
  upsertFdcFood,
  upsertOffFood,
  type FoodListItem,
} from "@/lib/foods";
import { isMealType } from "@/lib/food-shared";
import { openFoodFactsAdapter } from "@/lib/sources/open-food-facts";
import type { MealType } from "@/generated/prisma/client";

function revalidateDiary(dateKey: string) {
  revalidatePath(`/diary/${dateKey}`);
  revalidatePath("/diary/today");
}

export async function deleteEntryAction(entryId: string, dateKey: string) {
  const user = await getCurrentUser();
  const deleted = await deleteFoodEntry(user.id, entryId);

  if (!deleted) {
    return { ok: false as const, error: "Entry not found" };
  }

  revalidateDiary(dateKey);
  return { ok: true as const };
}

export async function addFoodEntryAction(input: {
  foodId: string;
  dateKey: string;
  /** Resolved calendar key YYYY-MM-DD (not "today"). */
  loggedOnKey: string;
  meal: string;
  quantity: number;
  unitMode: "serving" | "food" | "recipe";
  selectedUnit?: string;
}) {
  if (!isMealType(input.meal)) {
    return { ok: false as const, error: "Invalid meal" };
  }
  if (!(input.quantity > 0)) {
    return { ok: false as const, error: "Quantity must be greater than 0" };
  }
  if (
    input.unitMode !== "serving" &&
    input.unitMode !== "food" &&
    input.unitMode !== "recipe"
  ) {
    return { ok: false as const, error: "Invalid unit" };
  }

  const user = await getCurrentUser();

  try {
    await createFoodEntry({
      userId: user.id,
      foodId: input.foodId,
      loggedOn: dateFromKey(input.loggedOnKey),
      meal: input.meal as MealType,
      quantity: input.quantity,
      unitMode: input.unitMode,
      selectedUnit: input.selectedUnit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add food";
    return { ok: false as const, error: message };
  }

  revalidateDiary(input.dateKey);
  return { ok: true as const };
}

export async function toggleFavoriteAction(foodId: string) {
  const user = await getCurrentUser();
  try {
    const result = await toggleFavorite(user.id, foodId);
    revalidatePath("/diary/today");
    return { ok: true as const, ...result };
  } catch {
    return { ok: false as const, error: "Could not update favorite" };
  }
}

const BARCODE_RE = /^\d{8,14}$/;

/** Slim USDA hit — portions loaded on select via FDC detail. */
export type UsdaSearchHit = {
  fdcId: string;
  name: string;
  displayName: string;
  brand: string | null;
  dataType: string | null;
  caloriesPer100g: number | null;
  variants: Array<{
    fdcId: string;
    name: string;
    displayName: string;
    brand: string | null;
    dataType: string | null;
    caloriesPer100g: number | null;
  }>;
};

/** Slim OFF hit — nutrition loaded on select via product API. */
export type OffSearchHit = {
  barcode: string;
  name: string;
  brand: string | null;
};

/** @deprecated Prefer UsdaSearchHit / OffSearchHit */
export type CatalogSearchHit = OffSearchHit;

export async function searchCatalogAction(
  query: string,
): Promise<
  | { ok: true; foods: UsdaSearchHit[] }
  | { ok: false; error: string }
> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return { ok: false as const, error: "Type at least 3 characters" };
  }

  await getCurrentUser();

  try {
    const { searchFdcFoods } = await import("@/lib/sources/usda-fdc");
    const foods = await searchFdcFoods(trimmed);
    return { ok: true as const, foods };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to search foods";
    return { ok: false as const, error: message };
  }
}

export async function searchOffCatalogAction(
  query: string,
): Promise<
  | { ok: true; foods: OffSearchHit[] }
  | { ok: false; error: string }
> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return { ok: false as const, error: "Type at least 3 characters" };
  }

  await getCurrentUser();

  try {
    const { searchOffProducts } = await import("@/lib/sources/open-food-facts");
    const foods = await searchOffProducts(trimmed);
    return { ok: true as const, foods };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to search packaged foods";
    return { ok: false as const, error: message };
  }
}

export async function selectUsdaFoodAction(
  fdcId: string,
): Promise<
  | { ok: true; food: FoodListItem }
  | { ok: false; error: string }
> {
  const id = fdcId.trim();
  if (!id) {
    return { ok: false as const, error: "Invalid USDA food id" };
  }

  const user = await getCurrentUser();

  try {
    const { fetchFdcFood } = await import("@/lib/sources/usda-fdc");
    const normalized = await fetchFdcFood(id);
    if (!normalized) {
      return { ok: false as const, error: "Food not found" };
    }
    const food = await upsertFdcFood(normalized, user.id);
    return { ok: true as const, food };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load USDA food";
    return { ok: false as const, error: message };
  }
}

/** Persist an OFF search/scan hit, then return a FoodListItem for the amount step. */
export async function selectCatalogFoodAction(
  barcode: string,
): Promise<
  | { ok: true; food: FoodListItem }
  | { ok: false; error: string }
> {
  return lookupBarcodeAction(barcode);
}

export async function lookupBarcodeAction(
  code: string,
): Promise<
  | { ok: true; food: FoodListItem }
  | { ok: false; error: string }
> {
  const trimmed = code.trim();
  if (!BARCODE_RE.test(trimmed)) {
    return { ok: false as const, error: "Invalid barcode" };
  }

  const user = await getCurrentUser();

  try {
    const normalized = await openFoodFactsAdapter.getByBarcode(trimmed);
    if (!normalized) {
      return { ok: false as const, error: "Product not found" };
    }

    const food = await upsertOffFood(normalized, user.id);
    return { ok: true as const, food };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to look up barcode";
    return { ok: false as const, error: message };
  }
}
