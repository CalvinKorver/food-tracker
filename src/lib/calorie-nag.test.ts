import { describe, expect, it } from "vitest";
import {
  CALORIE_NAG_STEPS,
  wouldExceedCalorieGoal,
} from "@/lib/calorie-nag";

describe("wouldExceedCalorieGoal", () => {
  it("returns false without a positive goal", () => {
    expect(wouldExceedCalorieGoal(1800, 200, null)).toBe(false);
    expect(wouldExceedCalorieGoal(1800, 200, 0)).toBe(false);
  });

  it("returns false when entry fits under the goal", () => {
    expect(wouldExceedCalorieGoal(1800, 200, 2000)).toBe(false);
    expect(wouldExceedCalorieGoal(1900, 100, 2000)).toBe(false);
  });

  it("returns true when entry would push over the goal", () => {
    expect(wouldExceedCalorieGoal(1800, 250, 2000)).toBe(true);
    expect(wouldExceedCalorieGoal(2000, 1, 2000)).toBe(true);
  });

  it("returns false for non-finite inputs", () => {
    expect(wouldExceedCalorieGoal(Number.NaN, 100, 2000)).toBe(false);
    expect(wouldExceedCalorieGoal(1800, Number.POSITIVE_INFINITY, 2000)).toBe(
      false,
    );
  });
});

describe("CALORIE_NAG_STEPS", () => {
  it("has four steps and ends by allowing", () => {
    expect(CALORIE_NAG_STEPS).toHaveLength(4);
    expect(CALORIE_NAG_STEPS.at(-1)?.allow).toBe(true);
    expect(CALORIE_NAG_STEPS.slice(0, -1).every((s) => !s.allow)).toBe(true);
  });
});
