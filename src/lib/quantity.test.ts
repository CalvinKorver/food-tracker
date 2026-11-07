import { describe, expect, it } from "vitest";
import {
  formatQuantityLabel,
  isWeightUnit,
  quantityMultiplier,
  quantityUnitFromMode,
  toGrams,
} from "@/lib/quantity";

describe("quantityMultiplier", () => {
  it("returns quantity when unit is serving", () => {
    expect(quantityMultiplier(1.5, "serving", 100)).toBe(1.5);
  });

  it("divides by servingQty when unit is food", () => {
    expect(quantityMultiplier(150, "food", 100)).toBe(1.5);
  });

  it("multiplies by servingsPerRecipe when unit is recipe", () => {
    expect(quantityMultiplier(2, "recipe", 1, 4)).toBe(8);
  });

  it("converts selected weight unit to servings", () => {
    // 4 oz serving; 113.3980925 g ≈ 1 serving
    const ozServing = quantityMultiplier(4, "food", 4, null, {
      foodServingUnit: "oz",
      selectedUnit: "oz",
    });
    expect(ozServing).toBe(1);

    const grams = quantityMultiplier(113.3980925, "food", 4, null, {
      foodServingUnit: "oz",
      selectedUnit: "g",
    });
    expect(grams).toBeCloseTo(1, 5);
  });

  it("rejects incompatible unit conversion", () => {
    expect(() =>
      quantityMultiplier(100, "food", 1, null, {
        foodServingUnit: "portion",
        selectedUnit: "g",
      }),
    ).toThrow(/cannot convert/i);
  });

  it("scales household portions against gram serving", () => {
    // 1 large = 50g; serving = 100g → 0.5 servings
    expect(
      quantityMultiplier(1, "food", 100, null, {
        foodServingUnit: "g",
        selectedUnit: "1 large",
        portions: [{ label: "1 large", grams: 50 }],
      }),
    ).toBe(0.5);
    expect(
      quantityMultiplier(2, "food", 100, null, {
        foodServingUnit: "g",
        selectedUnit: "1 large",
        portions: [{ label: "1 large", grams: 50 }],
      }),
    ).toBe(1);
  });

  it("rejects quantity <= 0", () => {
    expect(() => quantityMultiplier(0, "serving", 100)).toThrow(
      /greater than 0/i,
    );
    expect(() => quantityMultiplier(-1, "food", 100)).toThrow(
      /greater than 0/i,
    );
  });

  it("rejects non-positive serving size in food mode", () => {
    expect(() => quantityMultiplier(50, "food", 0)).toThrow(/serving size/i);
  });

  it("rejects missing servingsPerRecipe in recipe mode", () => {
    expect(() => quantityMultiplier(1, "recipe", 1, null)).toThrow(
      /recipe servings/i,
    );
  });
});

describe("weight helpers", () => {
  it("detects weight units", () => {
    expect(isWeightUnit("g")).toBe(true);
    expect(isWeightUnit("oz")).toBe(true);
    expect(isWeightUnit("portion")).toBe(false);
  });

  it("converts to grams", () => {
    expect(toGrams(1, "g")).toBe(1);
    expect(toGrams(1, "oz")).toBeCloseTo(28.349523125, 8);
    expect(toGrams(1, "cup")).toBeNull();
  });
});

describe("quantityUnitFromMode", () => {
  it("maps modes to stored unit keys", () => {
    expect(quantityUnitFromMode("serving", "g")).toBe("serving");
    expect(quantityUnitFromMode("food", "g")).toBe("g");
    expect(quantityUnitFromMode("food", "oz", "g")).toBe("g");
    expect(quantityUnitFromMode("recipe", "serving")).toBe("recipe");
  });
});

describe("formatQuantityLabel", () => {
  it("formats recipe units", () => {
    expect(formatQuantityLabel(1, "recipe")).toBe("1 recipe");
    expect(formatQuantityLabel(2, "recipe")).toBe("2 recipes");
  });

  it("formats portion labels", () => {
    expect(formatQuantityLabel(1, "1 large")).toBe("1 large");
    expect(formatQuantityLabel(2, "1 large")).toBe("2 × 1 large");
  });
});
