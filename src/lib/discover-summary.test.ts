import { describe, expect, it, vi } from "vitest";
import { computeDiscoverWindow } from "@food-tracker/domain";
import {
  cleanSummaryText,
  computeDiscoverInputHash,
  generateDiscoverSummaryText,
  parseDiscoverSummaryCache,
} from "./discover-summary";

const NOW = new Date("2026-11-18T16:00:00.000Z");

function sampleWindow(calories = 1950) {
  return computeDiscoverWindow({
    timeZone: "America/Los_Angeles",
    now: NOW,
    goals: {
      calorieGoal: 2200,
      proteinGoalG: 165,
      carbsGoalG: 220,
      fatGoalG: 73,
    },
    entries: [
      {
        dateKey: "2026-11-16",
        caloriesSnapshot: calories,
        proteinGSnapshot: 168,
        carbsGSnapshot: 190,
        fatGSnapshot: 60,
        fiberGSnapshot: 28,
        sugarGSnapshot: 30,
        sodiumMgSnapshot: 2000,
      },
      {
        dateKey: "2026-11-17",
        caloriesSnapshot: 2050,
        proteinGSnapshot: 172,
        carbsGSnapshot: 200,
        fatGSnapshot: 64,
        fiberGSnapshot: 30,
        sugarGSnapshot: 32,
        sodiumMgSnapshot: 2100,
      },
    ],
  });
}

describe("discover-summary", () => {
  it("produces deterministic hashes that change when entries or goals change", () => {
    const w1 = sampleWindow(1950);
    const w2 = sampleWindow(1950);
    const w3 = sampleWindow(2100);

    expect(computeDiscoverInputHash(w1)).toBe(computeDiscoverInputHash(w2));
    expect(computeDiscoverInputHash(w1)).not.toBe(computeDiscoverInputHash(w3));
  });

  it("parses valid summary cache objects and rejects malformed ones", () => {
    expect(parseDiscoverSummaryCache(null)).toBeNull();
    expect(parseDiscoverSummaryCache({ inputHash: "abc" })).toBeNull();
    expect(
      parseDiscoverSummaryCache({
        inputHash: "abc",
        summary: "Short summary.",
        generatedAt: "2026-11-18T16:00:00.000Z",
      }),
    ).toEqual({
      inputHash: "abc",
      summary: "Short summary.",
      generatedAt: "2026-11-18T16:00:00.000Z",
    });
  });

  it("cleans quotes and newlines from model output", () => {
    expect(cleanSummaryText('  "Averaged 2,000 kcal.\nProtein hit 170g." ')).toBe(
      "Averaged 2,000 kcal. Protein hit 170g.",
    );
  });

  it("calls OpenAI gpt-4o-mini and returns cleaned summary text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                "Over 2 logged days, you averaged 2,000 kcal for a 200 kcal daily deficit. Protein hit 170g against your 165g goal while carbs and fat stayed below target.",
            },
          },
        ],
      }),
    });

    const text = await generateDiscoverSummaryText({
      window: sampleWindow(),
      apiKey: "sk-test",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(text).toContain("2,000 kcal");
    expect(text).toContain("170g");
  });
});
