export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const FOOD_SOURCES = [
  "open_food_facts",
  "custom",
  "barcode",
  "ocr",
  "recipe",
  "usda_fdc",
] as const;
export type FoodSource = (typeof FOOD_SOURCES)[number];

export const USER_FOOD_SOURCES = ["custom", "ocr", "recipe"] as const;
export type UserFoodSource = (typeof USER_FOOD_SOURCES)[number];

export const QUANTITY_UNIT_MODES = ["serving", "food", "recipe"] as const;
export type QuantityUnitMode = (typeof QUANTITY_UNIT_MODES)[number];

export function isMealType(value: string): value is MealType {
  return (MEAL_TYPES as readonly string[]).includes(value);
}

export function isFoodSource(value: string): value is FoodSource {
  return (FOOD_SOURCES as readonly string[]).includes(value);
}

export function mealLabel(meal: MealType): string {
  switch (meal) {
    case "breakfast":
      return "Breakfast";
    case "lunch":
      return "Lunch";
    case "dinner":
      return "Dinner";
    case "snack":
      return "Snacks";
  }
}

export function sourceBadge(source: FoodSource): string {
  switch (source) {
    case "custom":
      return "Custom";
    case "open_food_facts":
      return "OFF";
    case "barcode":
      return "Barcode";
    case "ocr":
      return "OCR";
    case "recipe":
      return "Recipe";
    case "usda_fdc":
      return "USDA";
  }
}
