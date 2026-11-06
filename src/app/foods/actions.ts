"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import {
  createCustomFood,
  deleteCustomFood,
  parseCustomFoodInput,
  updateCustomFood,
} from "@/lib/custom-food";
import { toggleFavorite } from "@/lib/foods";

function revalidateFoods() {
  revalidatePath("/foods");
  revalidatePath("/diary/today");
}

function formRecord(formData: FormData): Record<string, unknown> {
  return {
    name: formData.get("name"),
    brand: formData.get("brand"),
    servingQty: formData.get("servingQty"),
    servingUnit: formData.get("servingUnit"),
    calories: formData.get("calories"),
    proteinG: formData.get("proteinG"),
    carbsG: formData.get("carbsG"),
    fatG: formData.get("fatG"),
    fiberG: formData.get("fiberG"),
    sugarG: formData.get("sugarG"),
    sodiumMg: formData.get("sodiumMg"),
  };
}

function safeReturnTo(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  if (value.startsWith("/diary/") || value.startsWith("/foods")) {
    return value;
  }
  return "/foods";
}

export async function createCustomFoodAction(formData: FormData) {
  const parsed = parseCustomFoodInput(formRecord(formData));
  if (!parsed.ok) {
    return { ok: false as const, error: parsed.error.message };
  }

  const user = await getCurrentUser();
  await createCustomFood(user.id, parsed.data);
  revalidateFoods();

  redirect(safeReturnTo(formData.get("returnTo")));
}

export async function updateCustomFoodAction(formData: FormData) {
  const foodId = String(formData.get("foodId") ?? "");
  if (!foodId) {
    return { ok: false as const, error: "Missing food id" };
  }

  const parsed = parseCustomFoodInput(formRecord(formData));
  if (!parsed.ok) {
    return { ok: false as const, error: parsed.error.message };
  }

  const user = await getCurrentUser();
  try {
    await updateCustomFood(user.id, foodId, parsed.data);
  } catch {
    return { ok: false as const, error: "Food not found" };
  }

  revalidateFoods();
  redirect("/foods");
}

export async function deleteCustomFoodAction(foodId: string) {
  const user = await getCurrentUser();
  const result = await deleteCustomFood(user.id, foodId);
  if (!result.ok) {
    return result;
  }
  revalidateFoods();
  return { ok: true as const };
}

export async function toggleFoodFavoriteAction(foodId: string) {
  const user = await getCurrentUser();
  try {
    const result = await toggleFavorite(user.id, foodId);
    revalidateFoods();
    return { ok: true as const, ...result };
  } catch {
    return { ok: false as const, error: "Could not update favorite" };
  }
}
