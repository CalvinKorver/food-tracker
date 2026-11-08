import { describe, expect, it } from "vitest";
import {
  macroCalories,
  macroPercents,
  macrosMatchCalories,
  parseGoalInput,
  ringProgress,
} from "@/lib/goals";

/** 170P + 220C + 80F = 680 + 880 + 720 = 2280 — adjust fat for 2200 */
const valid2200 = {
  calorieGoal: 2200,
  proteinGoalG: 170,
  carbsGoalG: 200,
  fatGoalG: 98, // 680 + 800 + 882 = 2362 — wrong
};

// 170*4 + 200*4 + fat*9 = 2200 → 680+800+9f = 2200 → 9f = 720 → f = 80
const goals2200 = {
  calorieGoal: 2200,
  proteinGoalG: 170,
  carbsGoalG: 200,
  fatGoalG: 80,
};

describe("macroCalories / macrosMatchCalories", () => {
  it("computes Atwater calories", () => {
    expect(macroCalories(170, 200, 80)).toBe(2200);
  });

  it("accepts goals within 1%", () => {
    expect(macrosMatchCalories(2200, 170, 200, 80)).toBe(true);
    // 1% of 2200 = 22; 80.5g fat → +4.5 kcal still ok
    expect(macrosMatchCalories(2200, 170, 200, 82)).toBe(true);
  });

  it("rejects clear mismatch", () => {
    expect(macrosMatchCalories(2200, 170, 200, 50)).toBe(false);
  });
});

describe("macroPercents", () => {
  it("sums to ~100 for a matching split", () => {
    const pct = macroPercents(2200, 170, 200, 80);
    expect(pct.totalPct).toBeCloseTo(100, 5);
  });
});

describe("parseGoalInput", () => {
  it("accepts a matching 2200 split", () => {
    const result = parseGoalInput(goals2200);
    expect(result).toEqual({ ok: true, data: goals2200 });
  });

  it("rejects partial / missing fields", () => {
    const result = parseGoalInput({
      calorieGoal: 2200,
      proteinGoalG: 170,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects negatives", () => {
    const result = parseGoalInput({ ...goals2200, proteinGoalG: -1 });
    expect(result.ok).toBe(false);
  });

  it("rejects calorie/macro mismatch", () => {
    const result = parseGoalInput(valid2200);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/Macros are \d+% of calories/);
    }
  });
});

describe("ringProgress", () => {
  it("returns 0 for missing or zero goal", () => {
    expect(ringProgress(100, null)).toBe(0);
    expect(ringProgress(100, 0)).toBe(0);
  });

  it("clamps at 1 when overshooting", () => {
    expect(ringProgress(110, 100)).toBe(1);
    expect(ringProgress(50, 100)).toBe(0.5);
    expect(ringProgress(0, 100)).toBe(0);
  });
});
