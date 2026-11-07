import { formatNutrient } from "@/lib/nutrients";

export type QuantityUnitMode = "serving" | "food" | "recipe";

export const SERVING_UNIT_KEY = "serving";
export const RECIPE_UNIT_KEY = "recipe";

/** Grams per unit for same-family weight conversion. */
const GRAMS_PER: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.349523125,
  lb: 453.59237,
};

export function normalizeUnitKey(unit: string): string {
  return unit.trim().toLowerCase();
}

export function isWeightUnit(unit: string): boolean {
  return normalizeUnitKey(unit) in GRAMS_PER;
}

/** Grams for `quantity` of `unit`, or null if not a known weight unit. */
export function toGrams(quantity: number, unit: string): number | null {
  const factor = GRAMS_PER[normalizeUnitKey(unit)];
  if (factor == null) return null;
  return quantity * factor;
}

export function quantityMultiplier(
  quantity: number,
  unitMode: QuantityUnitMode,
  servingQty: number,
  servingsPerRecipe: number | null = null,
  options?: {
    foodServingUnit?: string;
    selectedUnit?: string;
  },
): number {
  if (!(quantity > 0)) {
    throw new Error("Quantity must be greater than 0");
  }
  if (unitMode === "serving") {
    return quantity;
  }
  if (unitMode === "recipe") {
    if (!(servingsPerRecipe != null && servingsPerRecipe > 0)) {
      throw new Error("Recipe servings must be greater than 0");
    }
    return quantity * servingsPerRecipe;
  }
  if (!(servingQty > 0)) {
    throw new Error("Food serving size must be greater than 0");
  }

  const foodUnit = options?.foodServingUnit;
  const selected = options?.selectedUnit ?? foodUnit;
  if (
    foodUnit &&
    selected &&
    normalizeUnitKey(selected) !== normalizeUnitKey(foodUnit)
  ) {
    const selectedG = toGrams(quantity, selected);
    const servingG = toGrams(servingQty, foodUnit);
    if (selectedG == null || servingG == null || !(servingG > 0)) {
      throw new Error("Cannot convert between these units");
    }
    return selectedG / servingG;
  }

  return quantity / servingQty;
}

export function quantityUnitFromMode(
  unitMode: QuantityUnitMode,
  foodServingUnit: string,
  selectedUnit?: string,
): string {
  if (unitMode === "serving") return SERVING_UNIT_KEY;
  if (unitMode === "recipe") return RECIPE_UNIT_KEY;
  return selectedUnit ?? foodServingUnit;
}

export function unitModeFromQuantityUnit(
  quantityUnit: string,
): QuantityUnitMode {
  if (quantityUnit === SERVING_UNIT_KEY) return "serving";
  if (quantityUnit === RECIPE_UNIT_KEY) return "recipe";
  return "food";
}

/** Diary / UI label: `1 serving`, `1.5 servings`, `150 g`, `1 recipe`. */
export function formatQuantityLabel(
  quantityValue: number,
  quantityUnit: string,
): string {
  const amount = formatNutrient(quantityValue);
  if (quantityUnit === SERVING_UNIT_KEY) {
    return Number(quantityValue) === 1 ? "1 serving" : `${amount} servings`;
  }
  if (quantityUnit === RECIPE_UNIT_KEY) {
    return Number(quantityValue) === 1 ? "1 recipe" : `${amount} recipes`;
  }
  return `${amount} ${quantityUnit}`;
}
