import { describe, expect, it } from "vitest";
import {
  discoverSummarySchema,
  discoverWindowSchema,
  foodListItemSchema,
  isMealType,
  mealTypeSchema,
} from "./index";

describe("contracts", () => {
  it("validates meal types", () => {
    expect(isMealType("breakfast")).toBe(true);
    expect(isMealType("brunch")).toBe(false);
    expect(mealTypeSchema.parse("lunch")).toBe("lunch");
  });

  it("parses a food list item", () => {
    const item = foodListItemSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Egg",
      brand: null,
      source: "custom",
      servingQty: 1,
      servingUnit: "large",
      calories: 70,
      proteinG: 6,
      carbsG: 0,
      fatG: 5,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 70,
      servingsPerRecipe: null,
      portions: [],
      isFavorite: false,
    });
    expect(item.name).toBe("Egg");
  });

  it("parses discover window and summary payloads", () => {
    const dayTotals = {
      calories: 1900,
      proteinG: 150,
      carbsG: 180,
      fatG: 65,
      fiberG: 25,
      sugarG: 35,
      sodiumMg: 2100,
      netCarbsG: 155,
    };
    const days = Array.from({ length: 7 }, (_, i) => ({
      dateKey: `2026-11-1${i + 1}`,
      weekdayLabel: "Wed",
      shortDateLabel: `Nov 1${i + 1}`,
      entryCount: 3,
      logged: true,
      totals: dayTotals,
      calorieDelta: -300,
    }));
    const win = discoverWindowSchema.parse({
      startDateKey: "2026-11-11",
      endDateKey: "2026-11-17",
      rangeLabel: "Nov 11 – Nov 17",
      goals: {
        calorieGoal: 2200,
        proteinGoalG: 165,
        carbsGoalG: 220,
        fatGoalG: 73,
      },
      loggedDaysCount: 7,
      averages: {
        calories: 1900,
        proteinG: 150,
        carbsG: 180,
        netCarbsG: 155,
        fatG: 65,
      },
      avgCalorieDelta: -300,
      totalCalorieDelta: -2100,
      days,
    });
    expect(win.days).toHaveLength(7);

    const summary = discoverSummarySchema.parse({
      status: "ready",
      summary: "Averaged 1,900 kcal across 7 days.",
      generatedAt: "2026-11-18T15:00:00.000Z",
    });
    expect(summary.status).toBe("ready");
  });
});
