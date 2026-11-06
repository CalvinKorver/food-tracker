import type { FoodSource } from "@/generated/prisma/client";

/** Persistable food fields produced by a FoodSource adapter. */
export type NormalizedFood = {
  source: FoodSource;
  externalId: string | null;
  barcode: string | null;
  name: string;
  brand: string | null;
  servingQty: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  nutrientsExtra: Record<string, unknown>;
  sourcePayload: unknown;
};

export type FoodSourceAdapter = {
  search(query: string): Promise<NormalizedFood[]>;
  getByBarcode(code: string): Promise<NormalizedFood | null>;
  ingestLabel(payload: unknown): Promise<NormalizedFood | null>;
};
