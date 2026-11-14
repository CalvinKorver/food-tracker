import { describe, expect, it } from "vitest";
import { foodListItemSchema, isMealType, mealTypeSchema } from "./index";

describe("contracts", () => {
  it("validates meal types", () => {
    expect(isMealType("breakfast")).toBe(true);
    expect(isMealType("brunch")).toBe(false);
    expect(mealTypeSchema.parse("lunch")).toBe("lunch");
  });

  it("parses a food list item", () => {
    const item = foodListItemSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Egg",
      brand: null,
      source: "custom",
      servingQty: 1,
      servingUnit: "large",
      calories: 70,
      proteinG: 6,
      carbsG: 0,
      fatG: 5,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 70,
      servingsPerRecipe: null,
      portions: [],
      isFavorite: false,
    });
    expect(item.name).toBe("Egg");
  });
});
