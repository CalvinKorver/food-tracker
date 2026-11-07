import { FoodSource, MealType } from "@/generated/prisma/enums";

/** User-owned foods shown on the Foods tab (custom, OCR, recipes). */
export const USER_FOOD_SOURCES = [
  FoodSource.custom,
  FoodSource.ocr,
  FoodSource.recipe,
] as const;

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
  }
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
