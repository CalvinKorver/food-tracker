import { describe, expect, it } from "vitest";
import {
  computeDiscoverWindow,
  computeDivergingScale,
  dateKeyFromUtcDate,
  discoverDateKeys,
  formatSignedCalories,
  type DiscoverEntryInput,
} from "./discover";

const NOW_NOV_18 = new Date("2026-11-18T16:00:00.000Z"); // 08:00 in America/Los_Angeles

function makeEntry(
  dateKey: string,
  overrides: Partial<DiscoverEntryInput> = {},
): DiscoverEntryInput {
  return {
    dateKey,
    caloriesSnapshot: 2000,
    proteinGSnapshot: 160,
    carbsGSnapshot: 200,
    fatGSnapshot: 62,
    fiberGSnapshot: 25,
    sugarGSnapshot: 30,
    sodiumMgSnapshot: 2100,
    ...overrides,
  };
}

describe("discover domain", () => {
  it("computes the 7 completed days ending yesterday in user timezone", () => {
    const keys = discoverDateKeys("America/Los_Angeles", NOW_NOV_18);
    expect(keys).toEqual([
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
      "2026-11-16",
      "2026-11-17",
    ]);
  });

  it("formats UTC Date values without local timezone drift", () => {
    expect(dateKeyFromUtcDate(new Date(Date.UTC(2026, 10, 17)))).toBe(
      "2026-11-17",
    );
  });

  it("excludes unlogged days and today's entries from averages and calorie deltas", () => {
    const goals = {
      calorieGoal: 2200,
      proteinGoalG: 165,
      carbsGoalG: 220,
      fatGoalG: 73,
    };
    const entries: DiscoverEntryInput[] = [
      makeEntry("2026-11-11", {
        caloriesSnapshot: 1900,
        proteinGSnapshot: 150,
        carbsGSnapshot: 190,
        fiberGSnapshot: 20,
        fatGSnapshot: 60,
      }),
      makeEntry("2026-11-13", {
        caloriesSnapshot: 1200,
        proteinGSnapshot: 90,
        carbsGSnapshot: 120,
        fiberGSnapshot: 15,
        fatGSnapshot: 40,
      }),
      makeEntry("2026-11-13", {
        caloriesSnapshot: 1300,
        proteinGSnapshot: 90,
        carbsGSnapshot: 130,
        fiberGSnapshot: 15,
        fatGSnapshot: 40,
      }),
      // Today (in-progress) should be ignored completely
      makeEntry("2026-11-18", { caloriesSnapshot: 400 }),
    ];

    const win = computeDiscoverWindow({
      timeZone: "America/Los_Angeles",
      now: NOW_NOV_18,
      goals,
      entries,
    });

    expect(win.startDateKey).toBe("2026-11-11");
    expect(win.endDateKey).toBe("2026-11-17");
    expect(win.rangeLabel).toBe("Nov 11 – Nov 17");
    expect(win.loggedDaysCount).toBe(2);

    // Day 1: 1900 kcal (-300), Day 3: 2500 kcal (+300); other 5 days unlogged
    expect(win.days[0]?.calorieDelta).toBe(-300);
    expect(win.days[1]?.logged).toBe(false);
    expect(win.days[1]?.calorieDelta).toBeNull();
    expect(win.days[2]?.calorieDelta).toBe(300);

    expect(win.averages).toEqual({
      calories: 2200,
      proteinG: 165,
      carbsG: 220,
      netCarbsG: 195,
      fatG: 70,
    });
    expect(win.totalCalorieDelta).toBe(0);
    expect(win.avgCalorieDelta).toBe(0);
  });

  it("handles all-deficit weeks accurately", () => {
    const goals = {
      calorieGoal: 2200,
      proteinGoalG: 165,
      carbsGoalG: 220,
      fatGoalG: 73,
    };
    const entries = [
      makeEntry("2026-11-15", { caloriesSnapshot: 1800 }),
      makeEntry("2026-11-16", { caloriesSnapshot: 1900 }),
      makeEntry("2026-11-17", { caloriesSnapshot: 2000 }),
    ];

    const win = computeDiscoverWindow({
      timeZone: "America/Los_Angeles",
      now: NOW_NOV_18,
      goals,
      entries,
    });

    expect(win.loggedDaysCount).toBe(3);
    expect(win.totalCalorieDelta).toBe(-900);
    expect(win.avgCalorieDelta).toBe(-300);
  });

  it("returns null averages and deltas when zero days are logged", () => {
    const win = computeDiscoverWindow({
      timeZone: "America/Los_Angeles",
      now: NOW_NOV_18,
      goals: {
        calorieGoal: 2200,
        proteinGoalG: 165,
        carbsGoalG: 220,
        fatGoalG: 73,
      },
      entries: [],
    });

    expect(win.loggedDaysCount).toBe(0);
    expect(win.averages).toBeNull();
    expect(win.avgCalorieDelta).toBeNull();
    expect(win.totalCalorieDelta).toBeNull();
    expect(win.days.every((d) => !d.logged && d.calorieDelta === null)).toBe(
      true,
    );
  });

  it("computes macro averages while keeping calorie deltas null when goals are unset", () => {
    const win = computeDiscoverWindow({
      timeZone: "America/Los_Angeles",
      now: NOW_NOV_18,
      goals: null,
      entries: [makeEntry("2026-11-17", { caloriesSnapshot: 2050 })],
    });

    expect(win.loggedDaysCount).toBe(1);
    expect(win.averages?.calories).toBe(2050);
    expect(win.avgCalorieDelta).toBeNull();
    expect(win.totalCalorieDelta).toBeNull();
    expect(win.days[6]?.calorieDelta).toBeNull();
  });

  it("scales diverging bounds symmetrically with a sensible minimum", () => {
    expect(computeDivergingScale([null, -40, 25])).toBe(300);
    expect(computeDivergingScale([-320, 180])).toBe(400);
    expect(computeDivergingScale([-810, 200])).toBe(1000);
    expect(computeDivergingScale([1620])).toBe(2000);
  });

  it("formats signed calorie labels", () => {
    expect(formatSignedCalories(-319.6)).toBe("-320");
    expect(formatSignedCalories(184.7)).toBe("+185");
    expect(formatSignedCalories(0.2)).toBe("0");
  });
});
