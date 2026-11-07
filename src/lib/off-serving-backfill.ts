import { prisma } from "@/lib/db";
import { FoodSource } from "@/generated/prisma/client";
import {
  normalizeOffProduct,
  type OffProduct,
} from "@/lib/sources/open-food-facts";

/**
 * If qty is unchanged and only the unit label was wrong (e.g. portion → g),
 * return the corrected unit. Skip when qty would change (nutrients stay as-is).
 */
export function servingUnitFixFromPayload(
  payload: unknown,
  currentQty: number,
  currentUnit: string,
): string | null {
  if (!payload || typeof payload !== "object") return null;
  const normalized = normalizeOffProduct(payload as OffProduct);
  if (!normalized) return null;
  if (Math.abs(normalized.servingQty - currentQty) > 1e-9) return null;
  if (normalized.servingUnit === currentUnit) return null;
  return normalized.servingUnit;
}

/** Fix servingUnit on OFF foods when sourcePayload implies a better unit. */
export async function backfillOffServingUnits(): Promise<number> {
  const foods = await prisma.food.findMany({
    where: { source: FoodSource.open_food_facts },
    select: {
      id: true,
      servingQty: true,
      servingUnit: true,
      sourcePayload: true,
    },
  });

  let updated = 0;
  for (const food of foods) {
    if (food.sourcePayload == null) continue;
    const nextUnit = servingUnitFixFromPayload(
      food.sourcePayload,
      food.servingQty,
      food.servingUnit,
    );
    if (!nextUnit) continue;
    await prisma.food.update({
      where: { id: food.id },
      data: { servingUnit: nextUnit },
    });
    updated += 1;
  }
  return updated;
}
