import { prisma } from "@/lib/db";
import { FoodSource, Prisma } from "@/generated/prisma/client";
import { USER_FOOD_SOURCES } from "@/lib/food-shared";

export type CustomFoodExtras = {
  satFatG: number;
  transFatG: number;
  cholesterolMg: number;
};

export type CustomFoodInput = {
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
  /** Omitted in some tests; defaults to zeros. */
  extras?: CustomFoodExtras;
};

export type CustomFoodValidationError = {
  field?: string;
  message: string;
};

const OPTIONAL_NUTRIENT_KEYS = [
  "proteinG",
  "carbsG",
  "fatG",
  "fiberG",
  "sugarG",
  "sodiumMg",
] as const;

const EXTRA_NUTRIENT_KEYS = [
  "satFatG",
  "transFatG",
  "cholesterolMg",
] as const;

function optionalNonNeg(
  raw: unknown,
  fallback = 0,
): number | CustomFoodValidationError {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return { message: "Nutrient values must be zero or positive" };
  }
  return n;
}

function parseOptionalGroup<K extends string>(
  raw: Record<string, unknown>,
  keys: readonly K[],
): { ok: true; values: Record<K, number> } | { ok: false; error: CustomFoodValidationError } {
  const values = {} as Record<K, number>;
  for (const key of keys) {
    const parsed = optionalNonNeg(raw[key]);
    if (typeof parsed === "object") return { ok: false, error: parsed };
    values[key] = parsed;
  }
  return { ok: true, values };
}

function nutrientsExtraJson(extras: CustomFoodExtras): Prisma.InputJsonValue {
  return {
    satFatG: extras.satFatG,
    transFatG: extras.transFatG,
    cholesterolMg: extras.cholesterolMg,
  };
}

export function parseCustomFoodInput(
  raw: Record<string, unknown>,
): { ok: true; data: CustomFoodInput } | { ok: false; error: CustomFoodValidationError } {
  const name = String(raw.name ?? "").trim();
  if (!name) {
    return { ok: false, error: { field: "name", message: "Name is required" } };
  }

  const servingUnit = String(raw.servingUnit ?? "").trim();
  if (!servingUnit) {
    return {
      ok: false,
      error: { field: "servingUnit", message: "Serving unit is required" },
    };
  }

  const servingQty = Number(raw.servingQty);
  if (!Number.isFinite(servingQty) || !(servingQty > 0)) {
    return {
      ok: false,
      error: { field: "servingQty", message: "Serving size must be greater than 0" },
    };
  }

  const calories = Number(raw.calories);
  if (!Number.isFinite(calories) || calories < 0) {
    return {
      ok: false,
      error: { field: "calories", message: "Calories must be zero or positive" },
    };
  }

  const brandRaw = String(raw.brand ?? "").trim();
  const brand = brandRaw.length > 0 ? brandRaw : null;

  const macros = parseOptionalGroup(raw, OPTIONAL_NUTRIENT_KEYS);
  if (!macros.ok) return macros;
  const extras = parseOptionalGroup(raw, EXTRA_NUTRIENT_KEYS);
  if (!extras.ok) return extras;

  return {
    ok: true,
    data: {
      name,
      brand,
      servingQty,
      servingUnit,
      calories,
      ...macros.values,
      extras: extras.values,
    },
  };
}

export function resolveUserFoodSource(raw: unknown): FoodSource {
  return String(raw) === "ocr" ? FoodSource.ocr : FoodSource.custom;
}

const EMPTY_EXTRAS: CustomFoodExtras = {
  satFatG: 0,
  transFatG: 0,
  cholesterolMg: 0,
};

export async function createCustomFood(
  userId: string,
  input: CustomFoodInput,
  options?: { source?: FoodSource },
) {
  const source = options?.source ?? FoodSource.custom;
  const extras = input.extras ?? EMPTY_EXTRAS;

  return prisma.food.create({
    data: {
      userId,
      source,
      name: input.name,
      brand: input.brand,
      servingQty: input.servingQty,
      servingUnit: input.servingUnit,
      calories: input.calories,
      proteinG: input.proteinG,
      carbsG: input.carbsG,
      fatG: input.fatG,
      fiberG: input.fiberG,
      sugarG: input.sugarG,
      sodiumMg: input.sodiumMg,
      nutrientsExtra: nutrientsExtraJson(extras),
    },
  });
}

export async function getCustomFood(userId: string, foodId: string) {
  return prisma.food.findFirst({
    where: {
      id: foodId,
      userId,
      source: { in: [...USER_FOOD_SOURCES] },
    },
  });
}

export async function updateCustomFood(
  userId: string,
  foodId: string,
  input: CustomFoodInput,
) {
  const existing = await getCustomFood(userId, foodId);
  if (!existing) {
    throw new Error("Food not found");
  }

  return prisma.food.update({
    where: { id: foodId },
    data: {
      name: input.name,
      brand: input.brand,
      servingQty: input.servingQty,
      servingUnit: input.servingUnit,
      calories: input.calories,
      proteinG: input.proteinG,
      carbsG: input.carbsG,
      fatG: input.fatG,
      fiberG: input.fiberG,
      sugarG: input.sugarG,
      sodiumMg: input.sodiumMg,
      nutrientsExtra: nutrientsExtraJson(input.extras ?? EMPTY_EXTRAS),
    },
  });
}

export async function deleteCustomFood(
  userId: string,
  foodId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await getCustomFood(userId, foodId);
  if (!existing) {
    return { ok: false, error: "Food not found" };
  }

  const entryCount = await prisma.foodEntry.count({
    where: { foodId, userId },
  });
  if (entryCount > 0) {
    return {
      ok: false,
      error: "Used in diary — can’t delete",
    };
  }

  await prisma.favorite.deleteMany({ where: { userId, foodId } });
  await prisma.food.delete({ where: { id: foodId } });
  return { ok: true };
}
