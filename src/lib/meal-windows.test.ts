import { describe, expect, it } from "vitest";
import { MealType } from "@/generated/prisma/enums";
import {
  DEFAULT_MEAL_WINDOWS,
  minutesOf,
  parseMealWindows,
  parseMealWindowsInput,
  suggestedMealForLocalTime,
} from "@/lib/meal-windows";

function at(hour: number, minute = 0) {
  return new Date(2026, 0, 1, hour, minute, 0, 0);
}

describe("minutesOf", () => {
  it("parses HH:MM", () => {
    expect(minutesOf("05:00")).toBe(5 * 60);
    expect(minutesOf("14:59")).toBe(14 * 60 + 59);
    expect(minutesOf("25:00")).toBeNull();
  });
});

describe("parseMealWindows", () => {
  it("returns defaults for null/invalid", () => {
    expect(parseMealWindows(null)).toEqual(DEFAULT_MEAL_WINDOWS);
    expect(parseMealWindows({ breakfast: { start: "bad", end: "10:00" } })).toEqual(
      DEFAULT_MEAL_WINDOWS,
    );
  });

  it("keeps valid custom windows", () => {
    const custom = {
      breakfast: { start: "06:00", end: "09:30" },
      lunch: { start: "12:00", end: "13:00" },
      dinner: { start: "18:00", end: "21:00" },
    };
    expect(parseMealWindows(custom)).toEqual(custom);
  });
});

describe("suggestedMealForLocalTime", () => {
  it("uses default bands", () => {
    expect(suggestedMealForLocalTime(at(7))).toBe(MealType.breakfast);
    expect(suggestedMealForLocalTime(at(12))).toBe(MealType.lunch);
    expect(suggestedMealForLocalTime(at(19))).toBe(MealType.dinner);
    expect(suggestedMealForLocalTime(at(15))).toBe(MealType.snack);
    expect(suggestedMealForLocalTime(at(0))).toBe(MealType.snack);
  });

  it("respects custom windows", () => {
    const windows = {
      breakfast: { start: "08:00", end: "08:30" },
      lunch: { start: "12:00", end: "12:30" },
      dinner: { start: "19:00", end: "19:30" },
    };
    expect(suggestedMealForLocalTime(at(8, 15), windows)).toBe(
      MealType.breakfast,
    );
    expect(suggestedMealForLocalTime(at(9), windows)).toBe(MealType.snack);
  });

  it("prefers breakfast over overlapping lunch", () => {
    const windows = {
      breakfast: { start: "10:00", end: "12:00" },
      lunch: { start: "11:00", end: "14:00" },
      dinner: { start: "17:00", end: "20:00" },
    };
    expect(suggestedMealForLocalTime(at(11, 30), windows)).toBe(
      MealType.breakfast,
    );
  });
});

describe("parseMealWindowsInput", () => {
  it("accepts valid form fields", () => {
    const result = parseMealWindowsInput({
      breakfastStart: "05:00",
      breakfastEnd: "10:59",
      lunchStart: "11:00",
      lunchEnd: "14:59",
      dinnerStart: "17:00",
      dinnerEnd: "20:59",
    });
    expect(result).toEqual({ ok: true, data: DEFAULT_MEAL_WINDOWS });
  });

  it("rejects start after end", () => {
    const result = parseMealWindowsInput({
      breakfastStart: "10:00",
      breakfastEnd: "09:00",
      lunchStart: "11:00",
      lunchEnd: "14:59",
      dinnerStart: "17:00",
      dinnerEnd: "20:59",
    });
    expect(result.ok).toBe(false);
  });
});
