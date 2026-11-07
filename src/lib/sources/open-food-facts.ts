import { FoodSource } from "@/generated/prisma/client";
import type { FoodSourceAdapter, NormalizedFood } from "./types";

type OffNutriments = Record<string, number | string | undefined>;

export type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_quantity?: string | number;
  serving_quantity_unit?: string;
  serving_size?: string;
  nutriments?: OffNutriments;
};

/** Normalize OFF / free-text unit strings to short labels. */
export function normalizeOffUnit(raw: string): string {
  const u = raw.trim().toLowerCase();
  if (!u) return "g";
  if (u === "g" || u === "gr" || u === "gram" || u === "grams") return "g";
  if (u === "kg" || u === "kilogram" || u === "kilograms") return "kg";
  if (u === "oz" || u === "ounce" || u === "ounces") return "oz";
  if (u === "lb" || u === "lbs" || u === "pound" || u === "pounds") return "lb";
  if (
    u === "ml" ||
    u === "milliliter" ||
    u === "milliliters" ||
    u === "millilitre" ||
    u === "millilitres"
  ) {
    return "ml";
  }
  if (u === "l" || u === "liter" || u === "liters" || u === "litre" || u === "litres") {
    return "l";
  }
  if (u === "cup" || u === "cups") return "cup";
  return u;
}

const OFF_USER_AGENT = "FoodTracker/0.1 (https://github.com/calvinkorver/food-tracker)";

function num(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

function nutrient(
  nutriments: OffNutriments | undefined,
  servingKey: string,
  per100Key: string,
  scale: number,
): number {
  if (!nutriments) return 0;
  const serving = num(nutriments[servingKey]);
  if (serving !== null) return serving;
  const per100 = num(nutriments[per100Key]);
  if (per100 === null) return 0;
  return per100 * scale;
}

/** OFF sodium/salt are grams; we store mg. salt_g × 400 ≈ sodium_mg. */
function sodiumMg(
  nutriments: OffNutriments | undefined,
  scale: number,
): number {
  if (!nutriments) return 0;
  const sodiumServing = num(nutriments["sodium_serving"]);
  if (sodiumServing !== null) return sodiumServing * 1000;
  const saltServing = num(nutriments["salt_serving"]);
  if (saltServing !== null) return saltServing * 400;

  const sodium100 = num(nutriments["sodium_100g"]);
  if (sodium100 !== null) return sodium100 * 1000 * scale;
  const salt100 = num(nutriments["salt_100g"]);
  if (salt100 !== null) return salt100 * 400 * scale;
  return 0;
}

function parseServing(raw: OffProduct): { qty: number; unit: string } | null {
  const qty = num(raw.serving_quantity);
  if (qty !== null && qty > 0) {
    const fromUnitField = String(raw.serving_quantity_unit ?? "").trim();
    if (fromUnitField) {
      return { qty, unit: normalizeOffUnit(fromUnitField) };
    }
    const size = String(raw.serving_size ?? "").trim();
    const unitMatch = size.match(/[a-zA-Z]+/);
    return { qty, unit: normalizeOffUnit(unitMatch?.[0] ?? "g") };
  }

  const size = String(raw.serving_size ?? "").trim();
  const match = size.match(/^([\d.]+)\s*([a-zA-Z]+)/);
  if (!match) return null;
  const parsedQty = Number(match[1]);
  if (!(parsedQty > 0)) return null;
  return { qty: parsedQty, unit: normalizeOffUnit(match[2]) };
}

/**
 * Map an OFF-shaped product JSON → NormalizedFood.
 * Prefer *_serving nutriments; else scale *_100g by serving_quantity/100.
 * When serving is missing, fall back to 100 g so common products still ingest.
 */
export function normalizeOffProduct(raw: OffProduct): NormalizedFood | null {
  const name = String(raw.product_name ?? "").trim();
  if (!name) return null;

  const serving = parseServing(raw) ?? { qty: 100, unit: "g" };

  const scale = serving.qty / 100;
  const nutriments = raw.nutriments;

  const calories = nutrient(
    nutriments,
    "energy-kcal_serving",
    "energy-kcal_100g",
    scale,
  );
  if (!(calories >= 0)) return null;

  const code = String(raw.code ?? "").trim() || null;
  const brand = String(raw.brands ?? "").trim() || null;

  return {
    source: FoodSource.open_food_facts,
    externalId: code,
    barcode: code,
    name,
    brand,
    servingQty: serving.qty,
    servingUnit: serving.unit,
    calories,
    proteinG: nutrient(nutriments, "proteins_serving", "proteins_100g", scale),
    carbsG: nutrient(
      nutriments,
      "carbohydrates_serving",
      "carbohydrates_100g",
      scale,
    ),
    fatG: nutrient(nutriments, "fat_serving", "fat_100g", scale),
    fiberG: nutrient(nutriments, "fiber_serving", "fiber_100g", scale),
    sugarG: nutrient(nutriments, "sugars_serving", "sugars_100g", scale),
    sodiumMg: sodiumMg(nutriments, scale),
    nutrientsExtra: {},
    sourcePayload: raw,
  };
}

type OffProductResponse = {
  status?: number;
  product?: OffProduct;
};

export async function fetchOffProductByBarcode(
  code: string,
  fetchImpl: typeof fetch = fetch,
): Promise<NormalizedFood | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(trimmed)}.json`;
  const res = await fetchImpl(url, {
    headers: {
      "User-Agent": OFF_USER_AGENT,
      Accept: "application/json",
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Open Food Facts request failed (${res.status})`);
  }

  const data = (await res.json()) as OffProductResponse;
  if (data.status !== 1 || !data.product) return null;

  const product = {
    ...data.product,
    code: data.product.code ?? trimmed,
  };
  return normalizeOffProduct(product);
}

export const openFoodFactsAdapter: FoodSourceAdapter = {
  async search() {
    throw new Error("Open Food Facts search is not implemented (Phase 2)");
  },
  async getByBarcode(code: string) {
    return fetchOffProductByBarcode(code);
  },
  async ingestLabel() {
    throw new Error("Label ingest is not implemented");
  },
};
