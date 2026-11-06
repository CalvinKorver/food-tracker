import { describe, expect, it, vi } from "vitest";
import {
  extractNutritionLabelFromImage,
  nutritionLabelToFormValues,
  parseNutritionLabelJson,
} from "@/lib/sources/nutrition-label-ocr";

describe("parseNutritionLabelJson", () => {
  it("maps a workplace menu-style payload", () => {
    const fields = parseNutritionLabelJson({
      name: "Sweet Thai Chili Shrimp Stir Fry",
      brand: null,
      servingQty: 8,
      servingUnit: "oz",
      calories: 200,
      proteinG: 20,
      carbsG: 23,
      fatG: 2.5,
      fiberG: 2,
      sugarG: 3,
      sodiumMg: 760,
      satFatG: 0,
      transFatG: 0,
      cholesterolMg: 160,
    });

    expect(fields).toMatchObject({
      name: "Sweet Thai Chili Shrimp Stir Fry",
      servingQty: 8,
      servingUnit: "oz",
      calories: 200,
      sodiumMg: 760,
      cholesterolMg: 160,
    });
  });

  it("coerces invalid numbers to null", () => {
    const fields = parseNutritionLabelJson({
      name: "Soup",
      calories: "abc",
      proteinG: "",
    });
    expect(fields.calories).toBeNull();
    expect(fields.proteinG).toBeNull();
  });
});

describe("nutritionLabelToFormValues", () => {
  it("fills form strings and keeps defaults when missing", () => {
    const values = nutritionLabelToFormValues({
      name: "Salad",
      brand: null,
      servingQty: 8,
      servingUnit: "oz",
      calories: 200,
      proteinG: 20,
      carbsG: null,
      fatG: 2.5,
      fiberG: null,
      sugarG: null,
      sodiumMg: 760,
      satFatG: 0,
      transFatG: null,
      cholesterolMg: 160,
    });

    expect(values).toMatchObject({
      source: "ocr",
      name: "Salad",
      brand: "",
      servingQty: "8",
      servingUnit: "oz",
      calories: "200",
      proteinG: "20",
      carbsG: "",
      fatG: "2.5",
      sodiumMg: "760",
      satFatG: "0",
      transFatG: "",
      cholesterolMg: "160",
    });
  });
});

describe("extractNutritionLabelFromImage", () => {
  it("calls OpenAI and parses content JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                name: "Yogurt",
                brand: "Chobani",
                servingQty: 170,
                servingUnit: "g",
                calories: 100,
                proteinG: 15,
                carbsG: 5,
                fatG: 0,
                fiberG: 0,
                sugarG: 5,
                sodiumMg: 50,
                satFatG: 0,
                transFatG: 0,
                cholesterolMg: 5,
              }),
            },
          },
        ],
      }),
    });

    const fields = await extractNutritionLabelFromImage({
      imageBase64: "abc",
      mimeType: "image/jpeg",
      apiKey: "test-key",
      fetchImpl: fetchMock,
    });

    expect(fields.name).toBe("Yogurt");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
