import {
  USER_FOOD_SOURCES,
  isMealType,
  mealLabel,
  sourceBadge,
  type FoodListItem,
  type FoodPortionOption,
  type FoodSource,
  type MealType,
} from "@food-tracker/contracts";

export {
  USER_FOOD_SOURCES,
  isMealType,
  mealLabel,
  sourceBadge,
  type FoodListItem,
  type FoodPortionOption,
  type FoodSource,
  type MealType,
};

export type AddFoodTab = "recents" | "favorites" | "all";

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
