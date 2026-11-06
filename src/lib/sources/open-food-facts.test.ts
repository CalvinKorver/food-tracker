import { describe, expect, it } from "vitest";
import { FoodSource } from "@/generated/prisma/client";
import {
  normalizeOffProduct,
  openFoodFactsAdapter,
} from "@/lib/sources/open-food-facts";
import offProduct from "@/lib/sources/__fixtures__/off-product.json";
import offPer100g from "@/lib/sources/__fixtures__/off-product-per100g.json";
import offIncomplete from "@/lib/sources/__fixtures__/off-product-incomplete.json";

describe("normalizeOffProduct", () => {
  it("maps serving-based nutriments from a fixture", () => {
    const food = normalizeOffProduct(offProduct);
    expect(food).not.toBeNull();
    expect(food).toMatchObject({
      source: FoodSource.open_food_facts,
      externalId: "3017620422003",
      barcode: "3017620422003",
      name: "Nutella",
      brand: "Ferrero",
      servingQty: 15,
      servingUnit: "g",
      calories: 80,
      proteinG: 0.9,
      carbsG: 8.6,
      fatG: 4.7,
      fiberG: 0,
      sugarG: 8.4,
      sodiumMg: 16,
    });
    expect(food?.sourcePayload).toEqual(offProduct);
  });

  it("scales _100g nutriments and converts salt to sodium mg", () => {
    const food = normalizeOffProduct(offPer100g);
    expect(food).not.toBeNull();
    // 170g serving → scale 1.7; salt_100g 0.09 → 0.09 * 400 * 1.7
    expect(food?.calories).toBeCloseTo(97 * 1.7, 5);
    expect(food?.proteinG).toBeCloseTo(9 * 1.7, 5);
    expect(food?.sodiumMg).toBeCloseTo(0.09 * 400 * 1.7, 5);
  });

  it("returns null when name is missing", () => {
    expect(normalizeOffProduct(offIncomplete)).toBeNull();
  });

  it("defaults missing nutrients to 0", () => {
    const food = normalizeOffProduct({
      code: "1",
      product_name: "Plain",
      serving_quantity: 100,
      serving_size: "100 g",
      nutriments: { "energy-kcal_serving": 10 },
    });
    expect(food).toMatchObject({
      calories: 10,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
    });
  });
});

describe("openFoodFactsAdapter", () => {
  it("throws not-implemented for live search", async () => {
    await expect(openFoodFactsAdapter.search("eggs")).rejects.toThrow(
      /not implemented/i,
    );
  });
});
