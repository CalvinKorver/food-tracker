import { afterEach, describe, expect, it, vi } from "vitest";
import { FoodSource } from "@/generated/prisma/client";
import {
  fetchFdcFood,
  mapFdcPortions,
  normalizeFdcFood,
  portionLabel,
  searchCaloriesPer100g,
  searchFdcFoods,
} from "@/lib/sources/usda-fdc";
import fdcEgg from "@/lib/sources/__fixtures__/fdc-egg.json";

describe("portionLabel / mapFdcPortions", () => {
  it("prefers amount + modifier", () => {
    expect(
      portionLabel({
        amount: 1,
        modifier: "large",
        measureUnit: { name: "egg" },
        gramWeight: 50,
      }),
    ).toBe("1 large");
  });

  it("maps unique positive-gram portions", () => {
    expect(mapFdcPortions(fdcEgg.foodPortions)).toEqual([
      { label: "1 large", grams: 50 },
      { label: "1 extra large", grams: 56 },
      { label: "1 egg", grams: 50 },
    ]);
  });
});

describe("normalizeFdcFood", () => {
  it("maps per-100g nutrients and portions", () => {
    const food = normalizeFdcFood(fdcEgg);
    expect(food).toMatchObject({
      source: FoodSource.usda_fdc,
      externalId: "171287",
      name: "Egg, whole, raw, fresh",
      servingQty: 100,
      servingUnit: "g",
      calories: 143,
      proteinG: 12.6,
      carbsG: 0.72,
      fatG: 9.51,
      fiberG: 0,
      sugarG: 0.37,
      sodiumMg: 142,
      nutrientsExtra: {
        portions: [
          { label: "1 large", grams: 50 },
          { label: "1 extra large", grams: 56 },
          { label: "1 egg", grams: 50 },
        ],
      },
      sourcePayload: { fdcId: "171287", dataType: "SR Legacy" },
    });
  });

  it("returns null without id or name", () => {
    expect(normalizeFdcFood({ description: "x" })).toBeNull();
    expect(normalizeFdcFood({ fdcId: 1 })).toBeNull();
  });
});

describe("searchFdcFoods / fetchFdcFood", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("requires API key", async () => {
    vi.stubEnv("USDA_FDC_API_KEY", "");
    await expect(searchFdcFoods("egg")).rejects.toThrow(/USDA_FDC_API_KEY/);
  });

  it("maps search hits including kcal preview", async () => {
    vi.stubEnv("USDA_FDC_API_KEY", "test-key");
    const fetchImpl = vi.fn(async () =>
      Response.json({
        foods: [
          {
            fdcId: 171287,
            description: "Egg, whole, raw, fresh",
            dataType: "SR Legacy",
            foodNutrients: [
              { nutrientId: 1062, nutrientName: "Energy", unitName: "kJ", value: 600 },
              { nutrientId: 1008, nutrientName: "Energy", unitName: "KCAL", value: 143 },
            ],
          },
        ],
      }),
    );
    const hits = await searchFdcFoods("egg", fetchImpl as typeof fetch);
    expect(hits).toEqual([
      {
        fdcId: "171287",
        name: "Egg, whole, raw, fresh",
        brand: null,
        dataType: "SR Legacy",
        caloriesPer100g: 143,
      },
    ]);
    const calledUrl = String(fetchImpl.mock.calls.at(0)?.at(0) ?? "");
    expect(calledUrl).toContain("api_key=test-key");
    expect(calledUrl).toContain("dataType=Foundation%2CSR+Legacy");
  });

  it("reads kcal from flat search nutrients and ignores kJ", () => {
    expect(
      searchCaloriesPer100g([
        { nutrientId: 1062, nutrientName: "Energy", unitName: "kJ", value: 600 },
        { nutrientId: 1008, nutrientName: "Energy", unitName: "KCAL", value: 143 },
      ]),
    ).toBe(143);
    expect(searchCaloriesPer100g([])).toBeNull();
  });

  it("fetches and normalizes detail", async () => {
    vi.stubEnv("USDA_FDC_API_KEY", "test-key");
    const fetchImpl = vi.fn(async () => Response.json(fdcEgg));
    const food = await fetchFdcFood("171287", fetchImpl as typeof fetch);
    expect(food?.externalId).toBe("171287");
    expect(
      (food?.nutrientsExtra as { portions: { label: string }[] }).portions[0],
    ).toEqual({ label: "1 large", grams: 50 });
  });
});
