import { afterEach, describe, expect, it, vi } from "vitest";
import { FoodSource } from "@/generated/prisma/client";
import {
  fetchOffProductByBarcode,
  normalizeOffProduct,
  openFoodFactsAdapter,
  searchOffProducts,
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

  it("falls back to 100 g when serving is missing", () => {
    const food = normalizeOffProduct({
      code: "123",
      product_name: "No Serving",
      nutriments: {
        "energy-kcal_100g": 200,
        proteins_100g: 10,
      },
    });
    expect(food).toMatchObject({
      servingQty: 100,
      servingUnit: "g",
      calories: 200,
      proteinG: 10,
    });
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

  it("prefers serving_quantity_unit over serving_size text", () => {
    const food = normalizeOffProduct({
      code: "2",
      product_name: "Cottage Cheese",
      serving_quantity: 110,
      serving_quantity_unit: "g",
      serving_size: "110 portion",
      nutriments: { "energy-kcal_serving": 80 },
    });
    expect(food).toMatchObject({
      servingQty: 110,
      servingUnit: "g",
      calories: 80,
    });
  });

  it("normalizes unit aliases from serving_quantity_unit", () => {
    const food = normalizeOffProduct({
      code: "3",
      product_name: "Milk",
      serving_quantity: 240,
      serving_quantity_unit: "milliliters",
      nutriments: { "energy-kcal_serving": 120 },
    });
    expect(food).toMatchObject({
      servingQty: 240,
      servingUnit: "ml",
    });
  });
});

describe("fetchOffProductByBarcode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns normalized food when OFF status is 1", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 1, product: offProduct }),
    });

    const food = await fetchOffProductByBarcode("3017620422003", fetchMock);
    expect(food?.name).toBe("Nutella");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://world.openfoodfacts.org/api/v2/product/3017620422003.json",
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": expect.stringContaining("FoodTracker"),
        }),
      }),
    );
  });

  it("returns null when product is not found", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 0, status_verbose: "product not found" }),
    });

    await expect(
      fetchOffProductByBarcode("0000000000000", fetchMock),
    ).resolves.toBeNull();
  });

  it("returns null on HTTP 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    await expect(
      fetchOffProductByBarcode("0000000000000", fetchMock),
    ).resolves.toBeNull();
  });

  it("returns null for incomplete products", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 1, product: offIncomplete }),
    });

    await expect(
      fetchOffProductByBarcode("999", fetchMock),
    ).resolves.toBeNull();
  });
});

describe("searchOffProducts", () => {
  it("returns [] for queries under 3 characters", async () => {
    const fetchMock = vi.fn();
    await expect(searchOffProducts("oa", fetchMock)).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps Search-a-licious hits and skips entries without a code", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        hits: [
          {
            code: "3017620422003",
            product_name: "Nutella",
            brands: ["Ferrero"],
          },
          {
            product_name: "No Code Yogurt",
            brands: "Chobani",
          },
        ],
      }),
    });

    const foods = await searchOffProducts("nutella", fetchMock);
    expect(foods).toHaveLength(1);
    expect(foods[0]).toEqual({
      barcode: "3017620422003",
      name: "Nutella",
      brand: "Ferrero",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://search.openfoodfacts.org/search",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "User-Agent": expect.stringContaining("FoodTracker"),
        }),
      }),
    );
  });

  it("throws when OFF search HTTP fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    await expect(searchOffProducts("yogurt", fetchMock)).rejects.toThrow(
      /search failed/i,
    );
  });

  it("throws when OFF returns a non-JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("Unexpected token < in JSON");
      },
    });
    await expect(searchOffProducts("yogurt", fetchMock)).rejects.toThrow(
      /temporarily unavailable/i,
    );
  });
});

describe("openFoodFactsAdapter", () => {
  it("delegates search to OFF search", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        hits: [
          {
            code: "3017620422003",
            product_name: "Nutella",
            brands: ["Ferrero"],
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const foods = await openFoodFactsAdapter.search("nutella");
    expect(foods).toHaveLength(1);
    expect(foods[0]?.name).toBe("Nutella");
    expect(foods[0]?.barcode).toBe("3017620422003");
  });

  it("delegates getByBarcode to OFF fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 1, product: offProduct }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const food = await openFoodFactsAdapter.getByBarcode("3017620422003");
    expect(food?.barcode).toBe("3017620422003");
  });
});
