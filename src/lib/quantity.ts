import { formatNutrient } from "@/lib/nutrients";

export type QuantityUnitMode = "serving" | "food";

export const SERVING_UNIT_KEY = "serving";

export function quantityMultiplier(
  quantity: number,
  unitMode: QuantityUnitMode,
  servingQty: number,
): number {
  if (!(quantity > 0)) {
    throw new Error("Quantity must be greater than 0");
  }
  if (unitMode === "serving") {
    return quantity;
  }
  if (!(servingQty > 0)) {
    throw new Error("Food serving size must be greater than 0");
  }
  return quantity / servingQty;
}

export function quantityUnitFromMode(
  unitMode: QuantityUnitMode,
  foodServingUnit: string,
): string {
  return unitMode === "serving" ? SERVING_UNIT_KEY : foodServingUnit;
}

export function unitModeFromQuantityUnit(
  quantityUnit: string,
): QuantityUnitMode {
  return quantityUnit === SERVING_UNIT_KEY ? "serving" : "food";
}

/** Diary / UI label: `1 serving`, `1.5 servings`, `150 g`. */
export function formatQuantityLabel(
  quantityValue: number,
  quantityUnit: string,
): string {
  const amount = formatNutrient(quantityValue);
  if (quantityUnit === SERVING_UNIT_KEY) {
    return Number(quantityValue) === 1 ? "1 serving" : `${amount} servings`;
  }
  return `${amount} ${quantityUnit}`;
}
