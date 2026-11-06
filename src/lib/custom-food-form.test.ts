import { describe, expect, it } from "vitest";
import {
  safeReturnTo,
  withFoodIdOnReturnTo,
} from "@/lib/custom-food-form";

describe("safeReturnTo", () => {
  it("allows diary and foods paths", () => {
    expect(safeReturnTo("/diary/today?add=snack")).toBe(
      "/diary/today?add=snack",
    );
    expect(safeReturnTo("/foods")).toBe("/foods");
  });

  it("falls back for unsafe paths", () => {
    expect(safeReturnTo("https://evil.example")).toBe("/foods");
    expect(safeReturnTo(null)).toBe("/foods");
  });
});

describe("withFoodIdOnReturnTo", () => {
  it("appends foodId to diary add URLs", () => {
    expect(withFoodIdOnReturnTo("/diary/today?add=snack", "abc")).toBe(
      "/diary/today?add=snack&foodId=abc",
    );
  });

  it("replaces an existing foodId", () => {
    expect(
      withFoodIdOnReturnTo("/diary/today?add=lunch&foodId=old", "new"),
    ).toBe("/diary/today?add=lunch&foodId=new");
  });

  it("leaves non-diary return paths unchanged", () => {
    expect(withFoodIdOnReturnTo("/foods", "abc")).toBe("/foods");
  });
});
