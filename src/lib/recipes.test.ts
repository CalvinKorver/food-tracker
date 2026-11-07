import { describe, expect, it } from "vitest";
import { computeRecipeTotals } from "@/lib/recipes";

const oatmeal = {
  id: "a",
  calories: 150,
  proteinG: 5,
  carbsG: 27,
  fatG: 3,
  fiberG: 4,
  sugarG: 1,
  sodiumMg: 10,
  servingQty: 40,
  servingUnit: "g",
  servingsPerRecipe: null,
};

const milk = {
  id: "b",
  calories: 100,
  proteinG: 8,
  carbsG: 12,
  fatG: 2.5,
  fiberG: 0,
  sugarG: 12,
  sodiumMg: 100,
  servingQty: 240,
  servingUnit: "ml",
  servingsPerRecipe: null,
};

describe("computeRecipeTotals", () => {
  it("sums serving-based ingredients", () => {
    const totals = computeRecipeTotals([
      { food: oatmeal, quantity: 2, unitMode: "serving" },
      { food: milk, quantity: 1, unitMode: "serving" },
    ]);
    expect(totals.calories).toBe(400);
    expect(totals.proteinG).toBe(18);
    expect(totals.carbsG).toBe(66);
    expect(totals.fatG).toBe(8.5);
  });

  it("handles food-unit quantities", () => {
    const totals = computeRecipeTotals([
      { food: oatmeal, quantity: 80, unitMode: "food" },
    ]);
    expect(totals.calories).toBe(300);
  });

  it("converts selected weight unit for ingredients", () => {
    const ozFood = { ...oatmeal, servingQty: 4, servingUnit: "oz" };
    const totals = computeRecipeTotals([
      {
        food: ozFood,
        quantity: 113.3980925,
        unitMode: "food",
        selectedUnit: "g",
      },
    ]);
    expect(totals.calories).toBeCloseTo(150, 4);
  });
});
