import { prisma } from "@/lib/db";
import { FoodSource } from "@/generated/prisma/client";

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
};

export type CustomFoodValidationError = {
  field?: string;
  message: string;
};

function optionalNonNeg(raw: unknown, fallback = 0): number | CustomFoodValidationError {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return { message: "Nutrient values must be zero or positive" };
  }
  return n;
}

/** Pure validation for create/update forms. */
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

  const proteinG = optionalNonNeg(raw.proteinG);
  if (typeof proteinG === "object") return { ok: false, error: proteinG };
  const carbsG = optionalNonNeg(raw.carbsG);
  if (typeof carbsG === "object") return { ok: false, error: carbsG };
  const fatG = optionalNonNeg(raw.fatG);
  if (typeof fatG === "object") return { ok: false, error: fatG };
  const fiberG = optionalNonNeg(raw.fiberG);
  if (typeof fiberG === "object") return { ok: false, error: fiberG };
  const sugarG = optionalNonNeg(raw.sugarG);
  if (typeof sugarG === "object") return { ok: false, error: sugarG };
  const sodiumMg = optionalNonNeg(raw.sodiumMg);
  if (typeof sodiumMg === "object") return { ok: false, error: sodiumMg };

  return {
    ok: true,
    data: {
      name,
      brand,
      servingQty,
      servingUnit,
      calories,
      proteinG,
      carbsG,
      fatG,
      fiberG,
      sugarG,
      sodiumMg,
    },
  };
}

export async function createCustomFood(userId: string, input: CustomFoodInput) {
  return prisma.food.create({
    data: {
      userId,
      source: FoodSource.custom,
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
    },
  });
}

export async function getCustomFood(userId: string, foodId: string) {
  return prisma.food.findFirst({
    where: { id: foodId, userId, source: FoodSource.custom },
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
