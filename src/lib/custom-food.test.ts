import { describe, expect, it } from "vitest";
import { parseCustomFoodInput } from "@/lib/custom-food";

describe("parseCustomFoodInput", () => {
  const valid = {
    name: "Eggs",
    servingQty: 2,
    servingUnit: "large",
    calories: 140,
  };

  it("accepts required fields and defaults optional nutrients to 0", () => {
    const result = parseCustomFoodInput(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      name: "Eggs",
      brand: null,
      servingQty: 2,
      servingUnit: "large",
      calories: 140,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
      extras: { satFatG: 0, transFatG: 0, cholesterolMg: 0 },
    });
  });

  it("parses optional sat fat / trans fat / cholesterol", () => {
    const result = parseCustomFoodInput({
      ...valid,
      satFatG: 1.5,
      transFatG: 0,
      cholesterolMg: 160,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.extras).toEqual({
      satFatG: 1.5,
      transFatG: 0,
      cholesterolMg: 160,
    });
  });

  it("rejects empty name", () => {
    const result = parseCustomFoodInput({ ...valid, name: "  " });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.field).toBe("name");
  });

  it("rejects servingQty <= 0", () => {
    const result = parseCustomFoodInput({ ...valid, servingQty: 0 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.field).toBe("servingQty");
  });

  it("rejects missing serving unit", () => {
    const result = parseCustomFoodInput({ ...valid, servingUnit: "" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.field).toBe("servingUnit");
  });

  it("rejects negative calories", () => {
    const result = parseCustomFoodInput({ ...valid, calories: -1 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.field).toBe("calories");
  });

  it("rejects negative optional nutrients", () => {
    const result = parseCustomFoodInput({ ...valid, proteinG: -2 });
    expect(result.ok).toBe(false);
  });
});
