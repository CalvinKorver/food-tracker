import { FoodSource } from "@/generated/prisma/client";
import {
  rankUsdaHits,
  type RankedUsdaHit,
} from "@/lib/sources/rank-usda-hits";
import type { NormalizedFood } from "./types";

export type FdcPortion = { label: string; grams: number };

export type FdcSearchHit = {
  fdcId: string;
  name: string;
  brand: string | null;
  dataType: string | null;
  /** Per 100 g when present on the search payload. */
  caloriesPer100g: number | null;
};

export type { RankedUsdaHit };

type FdcNutrientEntry = {
  amount?: number;
  nutrient?: { id?: number; name?: string; unitName?: string };
  nutrientId?: number;
  nutrientName?: string;
  unitName?: string;
  value?: number;
};

type FdcPortionEntry = {
  amount?: number;
  modifier?: string | null;
  measureUnit?: { name?: string; abbreviation?: string };
  gramWeight?: number;
};

type FdcFoodDetail = {
  fdcId?: number | string;
  description?: string;
  brandOwner?: string | null;
  brandName?: string | null;
  dataType?: string;
  foodNutrients?: FdcNutrientEntry[];
  foodPortions?: FdcPortionEntry[];
};

type FdcSearchResponse = {
  foods?: Array<{
    fdcId?: number | string;
    description?: string;
    brandOwner?: string | null;
    brandName?: string | null;
    dataType?: string;
    foodNutrients?: FdcNutrientEntry[];
  }>;
};

const FDC_BASE = "https://api.nal.usda.gov/fdc/v1";
const FDC_PAGE_SIZE = 20;

/** Common FDC nutrient ids (SR Legacy / Foundation). */
const NUTRIENT_IDS = {
  energyKcal: new Set([1008, 2047, 2048]),
  protein: new Set([1003]),
  carbs: new Set([1005]),
  fat: new Set([1004]),
  fiber: new Set([1079]),
  sugar: new Set([2000]),
  sodium: new Set([1093]),
} as const;

function apiKey(): string {
  const key = process.env.USDA_FDC_API_KEY?.trim();
  if (!key) {
    throw new Error("USDA_FDC_API_KEY is not set");
  }
  return key;
}

function num(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

function nutrientAmount(
  entries: FdcNutrientEntry[] | undefined,
  ids: Set<number>,
  nameMatch?: RegExp,
  preferUnit?: string,
): number {
  if (!entries?.length) return 0;
  let fallback = 0;
  for (const entry of entries) {
    const id = entry.nutrient?.id ?? entry.nutrientId;
    const name = (entry.nutrient?.name ?? entry.nutrientName ?? "").toLowerCase();
    const unit = (entry.nutrient?.unitName ?? entry.unitName ?? "").toLowerCase();
    const amount = num(entry.amount ?? entry.value) ?? 0;
    const idHit = id != null && ids.has(id);
    const nameHit = nameMatch ? nameMatch.test(name) : false;
    if (!idHit && !nameHit) continue;
    if (preferUnit && unit === preferUnit.toLowerCase()) return amount;
    if (idHit) return amount;
    fallback = amount;
  }
  return fallback;
}

export function portionLabel(portion: FdcPortionEntry): string | null {
  const amount = num(portion.amount);
  const modifier = String(portion.modifier ?? "").trim();
  const unitName = String(
    portion.measureUnit?.name ?? portion.measureUnit?.abbreviation ?? "",
  ).trim();
  if (amount != null && amount > 0 && modifier) {
    return `${formatAmount(amount)} ${modifier}`;
  }
  if (amount != null && amount > 0 && unitName) {
    return `${formatAmount(amount)} ${unitName}`;
  }
  if (modifier) return modifier;
  if (unitName) return unitName;
  return null;
}

function formatAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function mapFdcPortions(
  portions: FdcPortionEntry[] | undefined,
): FdcPortion[] {
  if (!portions?.length) return [];
  const out: FdcPortion[] = [];
  const seen = new Set<string>();
  for (const portion of portions) {
    const grams = num(portion.gramWeight);
    if (!(grams != null && grams > 0)) continue;
    const label = portionLabel(portion);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, grams });
    if (out.length >= 12) break;
  }
  return out;
}

/** Nutrients are per 100 g for Foundation / SR Legacy. */
export function normalizeFdcFood(raw: FdcFoodDetail): NormalizedFood | null {
  const fdcId = String(raw.fdcId ?? "").trim();
  const name = String(raw.description ?? "").trim();
  if (!fdcId || !name) return null;

  const nutrients = raw.foodNutrients;
  const calories = nutrientAmount(
    nutrients,
    NUTRIENT_IDS.energyKcal,
    /^energy/,
    "kcal",
  );
  if (!(calories >= 0)) return null;

  const brand =
    String(raw.brandOwner ?? raw.brandName ?? "").trim() || null;
  const portions = mapFdcPortions(raw.foodPortions);

  return {
    source: FoodSource.usda_fdc,
    externalId: fdcId,
    barcode: null,
    name,
    brand,
    servingQty: 100,
    servingUnit: "g",
    calories,
    proteinG: nutrientAmount(nutrients, NUTRIENT_IDS.protein, /protein/),
    carbsG: nutrientAmount(
      nutrients,
      NUTRIENT_IDS.carbs,
      /carbohydrate/,
    ),
    fatG: nutrientAmount(nutrients, NUTRIENT_IDS.fat, /total lipid|fat/),
    fiberG: nutrientAmount(nutrients, NUTRIENT_IDS.fiber, /fiber/),
    sugarG: nutrientAmount(nutrients, NUTRIENT_IDS.sugar, /sugars/),
    sodiumMg: nutrientAmount(nutrients, NUTRIENT_IDS.sodium, /sodium/),
    nutrientsExtra: { portions },
    // shortcut: full FDC detail is huge (~0.5–1MB); keep id only, re-fetch if needed
    sourcePayload: { fdcId, dataType: raw.dataType ?? null },
  };
}

export async function searchFdcFoods(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RankedUsdaHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({
    api_key: apiKey(),
    query: trimmed,
    pageSize: String(FDC_PAGE_SIZE),
    dataType: "Foundation,SR Legacy",
  });
  const res = await fetchImpl(`${FDC_BASE}/foods/search?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`USDA FDC search failed (${res.status})`);
  }

  const data = (await res.json()) as FdcSearchResponse;
  const foods = Array.isArray(data.foods) ? data.foods : [];
  const hits: FdcSearchHit[] = [];
  for (const food of foods) {
    const fdcId = String(food.fdcId ?? "").trim();
    const name = String(food.description ?? "").trim();
    if (!fdcId || !name) continue;
    const brand =
      String(food.brandOwner ?? food.brandName ?? "").trim() || null;
    hits.push({
      fdcId,
      name,
      brand,
      dataType: food.dataType ?? null,
      caloriesPer100g: searchCaloriesPer100g(food.foodNutrients),
    });
  }
  return rankUsdaHits(hits, trimmed);
}

/** Search payload uses flat nutrientId/value; returns null when kcal is absent. */
export function searchCaloriesPer100g(
  entries: FdcNutrientEntry[] | undefined,
): number | null {
  if (!entries?.length) return null;
  let fallback: number | null = null;
  for (const entry of entries) {
    const id = entry.nutrient?.id ?? entry.nutrientId;
    const name = (entry.nutrient?.name ?? entry.nutrientName ?? "").toLowerCase();
    const unit = (entry.nutrient?.unitName ?? entry.unitName ?? "").toLowerCase();
    const amount = num(entry.amount ?? entry.value);
    if (amount == null) continue;
    const idHit = id != null && NUTRIENT_IDS.energyKcal.has(id);
    const nameHit = /^energy/.test(name);
    if (!idHit && !nameHit) continue;
    if (unit === "kcal") return amount;
    if (idHit && unit !== "kj") return amount;
    if (fallback == null && unit !== "kj") fallback = amount;
  }
  return fallback;
}

export async function fetchFdcFood(
  fdcId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<NormalizedFood | null> {
  const id = fdcId.trim();
  if (!id) return null;

  const params = new URLSearchParams({ api_key: apiKey() });
  const res = await fetchImpl(`${FDC_BASE}/food/${encodeURIComponent(id)}?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`USDA FDC lookup failed (${res.status})`);
  }
  const data = (await res.json()) as FdcFoodDetail;
  return normalizeFdcFood(data);
}
