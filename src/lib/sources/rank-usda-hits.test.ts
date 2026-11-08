import { describe, expect, it } from "vitest";
import type { FdcSearchHit } from "@/lib/sources/usda-fdc";
import {
  friendlyUsdaName,
  rankUsdaHits,
  scoreUsdaHit,
  usdaStem,
} from "@/lib/sources/rank-usda-hits";

function hit(
  partial: Partial<FdcSearchHit> & Pick<FdcSearchHit, "fdcId" | "name">,
): FdcSearchHit {
  return {
    brand: null,
    dataType: "SR Legacy",
    caloriesPer100g: 100,
    ...partial,
  };
}

const chickenThighPage: FdcSearchHit[] = [
  hit({
    fdcId: "172855",
    name: "Chicken, skin (drumsticks and thighs), raw",
    caloriesPer100g: 440,
  }),
  hit({
    fdcId: "2646171",
    name: "Chicken, thigh, boneless, skinless, raw",
    dataType: "Foundation",
    caloriesPer100g: null,
  }),
  hit({
    fdcId: "2727567",
    name: "Chicken, thigh, meat and skin, raw",
    dataType: "Foundation",
    caloriesPer100g: null,
  }),
  hit({
    fdcId: "168961",
    name: "Chicken, thighs, frozen, breaded, reheated",
    caloriesPer100g: 334,
  }),
  hit({
    fdcId: "172854",
    name: "Chicken, skin (drumsticks and thighs), cooked, braised",
    caloriesPer100g: 443,
  }),
  hit({
    fdcId: "174496",
    name: "Chicken, skin (drumsticks and thighs), cooked, roasted",
    caloriesPer100g: 462,
  }),
  hit({
    fdcId: "172385",
    name: "Chicken, broilers or fryers, thigh, meat and skin, raw",
    caloriesPer100g: 221,
  }),
  hit({
    fdcId: "173625",
    name: "Chicken, broilers or fryers, thigh, meat and skin, cooked, roasted",
    caloriesPer100g: 232,
  }),
  hit({
    fdcId: "172388",
    name: "Chicken, broilers or fryers, thigh, meat only, cooked, roasted",
    caloriesPer100g: 179,
  }),
  hit({
    fdcId: "173627",
    name: "Chicken, broilers or fryers, dark meat, thigh, meat only, raw",
    caloriesPer100g: 121,
  }),
  hit({
    fdcId: "170750",
    name: "POPEYES, Fried Chicken, Mild, Thigh, meat and skin with breading",
    caloriesPer100g: 310,
  }),
];

describe("friendlyUsdaName", () => {
  it("drops broilers noise and joins cut into the title", () => {
    expect(
      friendlyUsdaName(
        "Chicken, broilers or fryers, thigh, meat only, cooked, roasted",
      ),
    ).toBe("Chicken thigh, meat only, roasted");
  });

  it("keeps foundation-style names readable", () => {
    expect(friendlyUsdaName("Chicken, thigh, boneless, skinless, raw")).toBe(
      "Chicken thigh, boneless, skinless, raw",
    );
  });
});

describe("usdaStem", () => {
  it("clusters prep variants but keeps skin attributes distinct", () => {
    expect(
      usdaStem(
        "Chicken, broilers or fryers, thigh, meat and skin, cooked, roasted",
      ),
    ).toBe(
      usdaStem("Chicken, broilers or fryers, thigh, meat and skin, raw"),
    );
    expect(
      usdaStem(
        "Chicken, broilers or fryers, thigh, meat only, cooked, roasted",
      ),
    ).not.toBe(
      usdaStem(
        "Chicken, broilers or fryers, thigh, meat and skin, cooked, roasted",
      ),
    );
  });
});

describe("rankUsdaHits", () => {
  it("puts foundation boneless/skinless first for a plain chicken thigh query", () => {
    const ranked = rankUsdaHits(chickenThighPage, "chicken thigh");
    expect(ranked[0]?.fdcId).toBe("2646171");
    expect(ranked[0]?.displayName).toBe(
      "Chicken thigh, boneless, skinless, raw",
    );
    expect(ranked.map((r) => r.fdcId).slice(0, 3)).not.toContain("172855");
    const popeyesIdx = ranked.findIndex((r) => r.fdcId === "170750");
    expect(popeyesIdx).toBeGreaterThan(2);
  });

  it("soft-clusters cooked meat-and-skin under one head", () => {
    const ranked = rankUsdaHits(chickenThighPage, "chicken thigh");
    const meatSkin = ranked.find((r) =>
      r.name.toLowerCase().includes("meat and skin"),
    );
    expect(meatSkin).toBeTruthy();
    expect(meatSkin!.variants.some((v) => v.fdcId === "173625" || v.fdcId === "172385")).toBe(
      true,
    );
  });

  it("clusters skin drumstick preps together and keeps them demoted", () => {
    const ranked = rankUsdaHits(chickenThighPage, "chicken thigh");
    const skin = ranked.find((r) =>
      r.name.toLowerCase().includes("skin (drumsticks"),
    );
    expect(skin).toBeTruthy();
    expect(skin!.variants.length).toBeGreaterThanOrEqual(1);
    expect(ranked.indexOf(skin!)).toBeGreaterThan(1);
  });
});

describe("scoreUsdaHit", () => {
  it("prefers foundation over sr legacy", () => {
    const foundation = scoreUsdaHit(
      { name: "Chicken, thigh, raw", dataType: "Foundation" },
      "chicken thigh",
    );
    const sr = scoreUsdaHit(
      { name: "Chicken, thigh, raw", dataType: "SR Legacy" },
      "chicken thigh",
    );
    expect(foundation).toBeGreaterThan(sr);
  });
});
