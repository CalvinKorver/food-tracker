import { beforeEach, describe, expect, it } from "vitest";
import {
  createCustomFood,
  deleteCustomFood,
  parseCustomFoodInput,
  updateCustomFood,
} from "@/lib/custom-food";
import { createFoodEntry } from "@/lib/foods";
import { MealType } from "@/generated/prisma/client";
import { createTestUser, prisma, resetTestDb } from "../helpers/db";

describe("custom foods integration", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  it("creates with required fields and defaults macros to 0", async () => {
    const user = await createTestUser();
    const parsed = parseCustomFoodInput({
      name: "Oats",
      servingQty: 40,
      servingUnit: "g",
      calories: 150,
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const food = await createCustomFood(user.id, parsed.data);
    expect(food.proteinG).toBe(0);
    expect(food.userId).toBe(user.id);
  });

  it("blocks delete when referenced by an entry", async () => {
    const user = await createTestUser();
    const food = await createCustomFood(user.id, {
      name: "Milk",
      brand: null,
      servingQty: 1,
      servingUnit: "cup",
      calories: 100,
      proteinG: 8,
      carbsG: 12,
      fatG: 2,
      fiberG: 0,
      sugarG: 12,
      sodiumMg: 100,
    });

    await createFoodEntry({
      userId: user.id,
      foodId: food.id,
      loggedOn: new Date("2026-11-06"),
      meal: MealType.breakfast,
      quantity: 1,
      unitMode: "serving",
    });

    const result = await deleteCustomFood(user.id, food.id);
    expect(result).toEqual({
      ok: false,
      error: "Used in diary — can’t delete",
    });
  });

  it("edit food does not change entry snapshots", async () => {
    const user = await createTestUser();
    const food = await createCustomFood(user.id, {
      name: "Rice",
      brand: null,
      servingQty: 100,
      servingUnit: "g",
      calories: 130,
      proteinG: 2,
      carbsG: 28,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
    });

    const entry = await createFoodEntry({
      userId: user.id,
      foodId: food.id,
      loggedOn: new Date("2026-11-06"),
      meal: MealType.lunch,
      quantity: 1,
      unitMode: "serving",
    });

    await updateCustomFood(user.id, food.id, {
      name: "Rice",
      brand: null,
      servingQty: 100,
      servingUnit: "g",
      calories: 999,
      proteinG: 2,
      carbsG: 28,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
    });

    const fresh = await prisma.foodEntry.findUniqueOrThrow({
      where: { id: entry.id },
    });
    expect(fresh.caloriesSnapshot).toBe(130);
  });
});
