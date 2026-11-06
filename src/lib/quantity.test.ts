import { describe, expect, it } from "vitest";
import { quantityMultiplier } from "@/lib/quantity";

describe("quantityMultiplier", () => {
  it("returns quantity when unit is serving", () => {
    expect(quantityMultiplier(1.5, "serving", 100)).toBe(1.5);
  });

  it("divides by servingQty when unit is food", () => {
    expect(quantityMultiplier(150, "food", 100)).toBe(1.5);
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
    expect(() => quantityMultiplier(50, "food", 0)).toThrow(
      /serving size/i,
    );
  });
});
