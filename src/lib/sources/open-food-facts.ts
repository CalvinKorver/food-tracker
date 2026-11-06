import { FoodSource } from "@/generated/prisma/client";
import type { FoodSourceAdapter, NormalizedFood } from "./types";

type OffNutriments = Record<string, number | string | undefined>;

export type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_quantity?: string | number;
  serving_size?: string;
  nutriments?: OffNutriments;
};

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
    const size = String(raw.serving_size ?? "").trim();
    const unitMatch = size.match(/[a-zA-Z]+/);
    return { qty, unit: unitMatch?.[0] ?? "g" };
  }

  const size = String(raw.serving_size ?? "").trim();
  const match = size.match(/^([\d.]+)\s*([a-zA-Z]+)/);
  if (!match) return null;
  const parsedQty = Number(match[1]);
  if (!(parsedQty > 0)) return null;
  return { qty: parsedQty, unit: match[2] };
}

/**
 * Map an OFF-shaped product JSON → NormalizedFood.
 * Prefer *_serving nutriments; else scale *_100g by serving_quantity/100.
 */
export function normalizeOffProduct(raw: OffProduct): NormalizedFood | null {
  const name = String(raw.product_name ?? "").trim();
  if (!name) return null;

  const serving = parseServing(raw);
  if (!serving) return null;

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

export const openFoodFactsAdapter: FoodSourceAdapter = {
  async search() {
    throw new Error("Open Food Facts search is not implemented (Phase 2)");
  },
  async getByBarcode() {
    throw new Error("Open Food Facts barcode lookup is not implemented (Phase 2)");
  },
  async ingestLabel() {
    throw new Error("Label ingest is not implemented");
  },
};
