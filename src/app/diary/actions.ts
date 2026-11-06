"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { dateFromKey } from "@/lib/dates";
import { deleteFoodEntry } from "@/lib/diary";
import {
  createFoodEntry,
  toggleFavorite,
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
  unitMode: "serving" | "food";
}) {
  if (!isMealType(input.meal)) {
    return { ok: false as const, error: "Invalid meal" };
  }
  if (!(input.quantity > 0)) {
    return { ok: false as const, error: "Quantity must be greater than 0" };
  }
  if (input.unitMode !== "serving" && input.unitMode !== "food") {
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
