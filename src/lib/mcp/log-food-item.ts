import type { QuantityUnitMode } from "@/lib/quantity";

export type LogFoodItemInput = {
  fdcId?: string;
  foodId?: string;
  food_name?: string;
  grams?: number;
  quantity?: number;
  unitMode?: QuantityUnitMode;
  selectedUnit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  date?: string;
  meal?: string;
};

export type LogFoodItemMode =
  | {
      kind: "catalog";
      fdcId: string;
      grams: number;
    }
  | {
      kind: "existing";
      foodId: string;
      quantity: number;
      unitMode: QuantityUnitMode;
      selectedUnit?: string;
    }
  | {
      kind: "adhoc";
      foodName: string;
      grams: number;
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    };

export type LogFoodItemParseResult =
  | { ok: true; mode: LogFoodItemMode }
  | { ok: false; error: string };

function positiveNumber(value: unknown, label: string): number | string {
  if (typeof value !== "number" || !Number.isFinite(value) || !(value > 0)) {
    return `${label} must be greater than 0`;
  }
  return value;
}

function nonNegNumber(value: unknown, fallback: number): number | string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "Nutrient values must be zero or positive";
  }
  return value;
}

/** Resolve exactly one identity path for log_food_item. */
export function parseLogFoodItemInput(
  input: LogFoodItemInput,
): LogFoodItemParseResult {
  const fdcId = input.fdcId?.trim() || "";
  const foodId = input.foodId?.trim() || "";
  const foodName = input.food_name?.trim() || "";

  const identities = [Boolean(fdcId), Boolean(foodId), Boolean(foodName)].filter(
    Boolean,
  ).length;
  if (identities !== 1) {
    return {
      ok: false,
      error: "Provide exactly one of fdcId, foodId, or food_name",
    };
  }

  if (fdcId) {
    const grams = positiveNumber(input.grams, "grams");
    if (typeof grams === "string") return { ok: false, error: grams };
    return { ok: true, mode: { kind: "catalog", fdcId, grams } };
  }

  if (foodId) {
    if (input.grams != null) {
      const grams = positiveNumber(input.grams, "grams");
      if (typeof grams === "string") return { ok: false, error: grams };
      return {
        ok: true,
        mode: {
          kind: "existing",
          foodId,
          quantity: grams,
          unitMode: "food",
          selectedUnit: "g",
        },
      };
    }
    const quantity = positiveNumber(input.quantity, "quantity");
    if (typeof quantity === "string") return { ok: false, error: quantity };
    const unitMode = input.unitMode ?? "serving";
    if (
      unitMode !== "serving" &&
      unitMode !== "food" &&
      unitMode !== "recipe"
    ) {
      return { ok: false, error: "Invalid unitMode" };
    }
    return {
      ok: true,
      mode: {
        kind: "existing",
        foodId,
        quantity,
        unitMode,
        selectedUnit: input.selectedUnit,
      },
    };
  }

  const grams = positiveNumber(input.grams, "grams");
  if (typeof grams === "string") return { ok: false, error: grams };
  const calories = nonNegNumber(input.calories, 0);
  if (typeof calories === "string") return { ok: false, error: calories };
  const proteinG = nonNegNumber(input.protein, 0);
  if (typeof proteinG === "string") return { ok: false, error: proteinG };
  const carbsG = nonNegNumber(input.carbs, 0);
  if (typeof carbsG === "string") return { ok: false, error: carbsG };
  const fatG = nonNegNumber(input.fat, 0);
  if (typeof fatG === "string") return { ok: false, error: fatG };

  return {
    ok: true,
    mode: {
      kind: "adhoc",
      foodName,
      grams,
      calories,
      proteinG,
      carbsG,
      fatG,
    },
  };
}
