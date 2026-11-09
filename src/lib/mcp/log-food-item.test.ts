import { describe, expect, it } from "vitest";
import { parseLogFoodItemInput } from "@/lib/mcp/log-food-item";

describe("parseLogFoodItemInput", () => {
  it("routes catalog mode from fdcId + grams", () => {
    const result = parseLogFoodItemInput({ fdcId: "171477", grams: 150 });
    expect(result).toEqual({
      ok: true,
      mode: { kind: "catalog", fdcId: "171477", grams: 150 },
    });
  });

  it("routes existing food with grams as food/g", () => {
    const result = parseLogFoodItemInput({
      foodId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      grams: 100,
    });
    expect(result).toEqual({
      ok: true,
      mode: {
        kind: "existing",
        foodId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        quantity: 100,
        unitMode: "food",
        selectedUnit: "g",
      },
    });
  });

  it("routes existing food with quantity + unitMode", () => {
    const result = parseLogFoodItemInput({
      foodId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      quantity: 2,
      unitMode: "serving",
    });
    expect(result).toEqual({
      ok: true,
      mode: {
        kind: "existing",
        foodId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        quantity: 2,
        unitMode: "serving",
        selectedUnit: undefined,
      },
    });
  });

  it("routes ad-hoc macros from food_name + grams", () => {
    const result = parseLogFoodItemInput({
      food_name: "Protein shake",
      grams: 300,
      calories: 200,
      protein: 30,
      carbs: 10,
      fat: 3,
    });
    expect(result).toEqual({
      ok: true,
      mode: {
        kind: "adhoc",
        foodName: "Protein shake",
        grams: 300,
        calories: 200,
        proteinG: 30,
        carbsG: 10,
        fatG: 3,
      },
    });
  });

  it("rejects multiple identity paths", () => {
    const result = parseLogFoodItemInput({
      fdcId: "1",
      foodId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      grams: 50,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/exactly one/i);
    }
  });

  it("rejects missing identity", () => {
    const result = parseLogFoodItemInput({ grams: 50 });
    expect(result.ok).toBe(false);
  });

  it("rejects non-positive grams", () => {
    const result = parseLogFoodItemInput({ fdcId: "1", grams: 0 });
    expect(result).toEqual({
      ok: false,
      error: "grams must be greater than 0",
    });
  });
});
