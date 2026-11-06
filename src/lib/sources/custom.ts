import { FoodSource } from "@/generated/prisma/client";
import type { FoodSourceAdapter } from "./types";

/** Marker for user-owned customs. Persist via `@/lib/custom-food`. */
export const customSource = FoodSource.custom;

export const customAdapter: FoodSourceAdapter = {
  async search() {
    return [];
  },
  async getByBarcode() {
    return null;
  },
  async ingestLabel() {
    return null;
  },
};
