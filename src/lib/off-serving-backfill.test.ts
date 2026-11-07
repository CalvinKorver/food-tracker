import { describe, expect, it } from "vitest";
import { servingUnitFixFromPayload } from "@/lib/off-serving-backfill";

describe("servingUnitFixFromPayload", () => {
  it("fixes portion → g when qty matches and unit field is g", () => {
    expect(
      servingUnitFixFromPayload(
        {
          code: "1",
          product_name: "Cottage Cheese",
          serving_quantity: 110,
          serving_quantity_unit: "g",
          serving_size: "110 portion",
          nutriments: { "energy-kcal_serving": 80 },
        },
        110,
        "portion",
      ),
    ).toBe("g");
  });

  it("returns null when already correct", () => {
    expect(
      servingUnitFixFromPayload(
        {
          code: "1",
          product_name: "Cottage Cheese",
          serving_quantity: 110,
          serving_quantity_unit: "g",
          nutriments: { "energy-kcal_serving": 80 },
        },
        110,
        "g",
      ),
    ).toBeNull();
  });

  it("skips when serving qty would change", () => {
    expect(
      servingUnitFixFromPayload(
        {
          code: "1",
          product_name: "X",
          serving_quantity: 100,
          serving_quantity_unit: "g",
          nutriments: { "energy-kcal_serving": 80 },
        },
        110,
        "portion",
      ),
    ).toBeNull();
  });
});
