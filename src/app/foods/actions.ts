"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import {
  createCustomFood,
  deleteCustomFood,
  parseCustomFoodInput,
  resolveUserFoodSource,
  updateCustomFood,
} from "@/lib/custom-food";
import {
  safeReturnTo,
  withFoodIdOnReturnTo,
  type OcrFoodPrefill,
} from "@/lib/custom-food-form";
import { toggleFavorite } from "@/lib/foods";
import {
  extractNutritionLabelFromImage,
  nutritionLabelToFormValues,
} from "@/lib/sources/nutrition-label-ocr";

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
    satFatG: formData.get("satFatG"),
    transFatG: formData.get("transFatG"),
    cholesterolMg: formData.get("cholesterolMg"),
  };
}

export async function createRecipeAction(input: {
  name: string;
  servingsPerRecipe: number;
  ingredients: Array<{
    foodId: string;
    quantity: number;
    unitMode: "serving" | "food" | "recipe";
    selectedUnit?: string;
  }>;
}) {
  const name = input.name.trim();
  if (!name) {
    return { ok: false as const, error: "Recipe name is required" };
  }
  if (!(input.servingsPerRecipe > 0)) {
    return {
      ok: false as const,
      error: "Servings per recipe must be greater than 0",
    };
  }
  if (!Array.isArray(input.ingredients) || input.ingredients.length === 0) {
    return { ok: false as const, error: "Add at least one ingredient" };
  }
  for (const item of input.ingredients) {
    if (!(item.quantity > 0)) {
      return {
        ok: false as const,
        error: "Ingredient quantity must be greater than 0",
      };
    }
    if (
      item.unitMode !== "serving" &&
      item.unitMode !== "food" &&
      item.unitMode !== "recipe"
    ) {
      return { ok: false as const, error: "Invalid unit" };
    }
  }

  const user = await getCurrentUser();
  try {
    const { createRecipe } = await import("@/lib/recipes");
    await createRecipe(user.id, {
      name,
      servingsPerRecipe: input.servingsPerRecipe,
      ingredients: input.ingredients,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create recipe";
    return { ok: false as const, error: message };
  }

  revalidateFoods();
  return { ok: true as const };
}

export async function createCustomFoodAction(formData: FormData) {
  const parsed = parseCustomFoodInput(formRecord(formData));
  if (!parsed.ok) {
    return { ok: false as const, error: parsed.error.message };
  }

  const user = await getCurrentUser();
  const source = resolveUserFoodSource(formData.get("source"));
  const food = await createCustomFood(user.id, parsed.data, { source });
  revalidateFoods();

  const returnTo = withFoodIdOnReturnTo(
    safeReturnTo(
      typeof formData.get("returnTo") === "string"
        ? (formData.get("returnTo") as string)
        : null,
    ),
    food.id,
  );
  redirect(returnTo);
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

const MAX_IMAGE_CHARS = Math.ceil(1.5 * 1024 * 1024 * (4 / 3));

export async function parseNutritionLabelAction(input: {
  imageBase64: string;
  mimeType: string;
}): Promise<
  | { ok: true; values: OcrFoodPrefill }
  | { ok: false; error: string }
> {
  await getCurrentUser();

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false as const,
      error: "OPENAI_API_KEY is not configured",
    };
  }

  const imageBase64 = input.imageBase64;
  if (!imageBase64 || imageBase64.length > MAX_IMAGE_CHARS) {
    return { ok: false as const, error: "Image is missing or too large" };
  }

  const mimeType =
    input.mimeType === "image/png" || input.mimeType === "image/webp"
      ? input.mimeType
      : "image/jpeg";

  try {
    const fields = await extractNutritionLabelFromImage({
      imageBase64,
      mimeType,
      apiKey,
    });
    if (!fields.name) {
      return {
        ok: false as const,
        error: "Could not read a food name from the label. Try again.",
      };
    }
    return {
      ok: true as const,
      values: nutritionLabelToFormValues(fields),
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to read nutrition label";
    return { ok: false as const, error: message };
  }
}
