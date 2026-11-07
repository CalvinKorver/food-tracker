import { FoodSource, MealType } from "@/generated/prisma/enums";

/** User-owned foods shown on the Foods tab (custom, OCR, recipes). */
export const USER_FOOD_SOURCES = [
  FoodSource.custom,
  FoodSource.ocr,
  FoodSource.recipe,
] as const;

export type FoodPortionOption = { label: string; grams: number };

export type FoodListItem = {
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
  /** Household measures from FDC (and similar), grams relative to serving. */
  portions: FoodPortionOption[];
  isFavorite: boolean;
};

export type AddFoodTab = "recents" | "favorites" | "all";

export function sourceBadge(source: FoodSource): string {
  switch (source) {
    case FoodSource.custom:
      return "Custom";
    case FoodSource.open_food_facts:
      return "OFF";
    case FoodSource.barcode:
      return "Barcode";
    case FoodSource.ocr:
      return "OCR";
    case FoodSource.recipe:
      return "Recipe";
    case FoodSource.usda_fdc:
      return "USDA";
  }
}

export function portionsFromNutrientsExtra(
  extra: unknown,
): FoodPortionOption[] {
  if (!extra || typeof extra !== "object") return [];
  const raw = (extra as { portions?: unknown }).portions;
  if (!Array.isArray(raw)) return [];
  const out: FoodPortionOption[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const label = String((item as { label?: unknown }).label ?? "").trim();
    const grams = Number((item as { grams?: unknown }).grams);
    if (!label || !(grams > 0)) continue;
    out.push({ label, grams });
  }
  return out;
}

export function isMealType(value: string): value is MealType {
  return (
    value === MealType.breakfast ||
    value === MealType.lunch ||
    value === MealType.dinner ||
    value === MealType.snack
  );
}

export function mealLabel(meal: MealType): string {
  switch (meal) {
    case MealType.breakfast:
      return "Breakfast";
    case MealType.lunch:
      return "Lunch";
    case MealType.dinner:
      return "Dinner";
    case MealType.snack:
      return "Snacks";
  }
}
