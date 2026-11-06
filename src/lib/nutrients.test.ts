import { describe, expect, it } from "vitest";
import { netCarbs, sumDayTotals } from "@/lib/nutrients";

describe("netCarbs", () => {
  it("subtracts fiber from carbs", () => {
    expect(netCarbs(40, 10)).toBe(30);
  });

  it("floors at 0 when fiber exceeds carbs", () => {
    expect(netCarbs(5, 10)).toBe(0);
  });
});

describe("sumDayTotals", () => {
  it("returns zeros for an empty day", () => {
    expect(sumDayTotals([])).toEqual({
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
      netCarbsG: 0,
    });
  });

  it("sums snapshots across entries", () => {
    const totals = sumDayTotals([
      {
        caloriesSnapshot: 100,
        proteinGSnapshot: 10,
        carbsGSnapshot: 20,
        fatGSnapshot: 5,
        fiberGSnapshot: 4,
        sugarGSnapshot: 2,
        sodiumMgSnapshot: 100,
      },
      {
        caloriesSnapshot: 50,
        proteinGSnapshot: 5,
        carbsGSnapshot: 10,
        fatGSnapshot: 2,
        fiberGSnapshot: 1,
        sugarGSnapshot: 1,
        sodiumMgSnapshot: 50,
      },
    ]);

    expect(totals).toEqual({
      calories: 150,
      proteinG: 15,
      carbsG: 30,
      fatG: 7,
      fiberG: 5,
      sugarG: 3,
      sodiumMg: 150,
      netCarbsG: 25,
    });
  });
});
