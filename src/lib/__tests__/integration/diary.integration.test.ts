import { beforeEach, describe, expect, it } from "vitest";
import { createCustomFood } from "@/lib/custom-food";
import { createFoodEntry, updateFoodEntry } from "@/lib/foods";
import { deleteFoodEntry, getDiaryDay } from "@/lib/diary";
import { MealType } from "@/generated/prisma/client";
import { createTestUser, resetTestDb } from "../helpers/db";

describe("diary integration", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  it("snapshots food × multiplier and isolates days", async () => {
    const user = await createTestUser();
    const food = await createCustomFood(user.id, {
      name: "Chicken",
      brand: null,
      servingQty: 100,
      servingUnit: "g",
      calories: 200,
      proteinG: 30,
      carbsG: 0,
      fatG: 8,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 50,
    });

    const dayA = new Date("2026-11-06");
    const dayB = new Date("2026-11-07");

    await createFoodEntry({
      userId: user.id,
      foodId: food.id,
      loggedOn: dayA,
      meal: MealType.dinner,
      quantity: 0.5,
      unitMode: "serving",
    });

    await createFoodEntry({
      userId: user.id,
      foodId: food.id,
      loggedOn: dayB,
      meal: MealType.lunch,
      quantity: 150,
      unitMode: "food",
    });

    const a = await getDiaryDay(user.id, dayA);
    expect(a.allEntries).toHaveLength(1);
    expect(a.totals.calories).toBe(100);
    expect(a.totals.proteinG).toBe(15);
    expect(a.meals.find((m) => m.meal === MealType.dinner)?.entries).toHaveLength(
      1,
    );

    const b = await getDiaryDay(user.id, dayB);
    expect(b.allEntries).toHaveLength(1);
    expect(b.totals.calories).toBe(300);
  });

  it("deleteFoodEntry removes the entry from day totals", async () => {
    const user = await createTestUser();
    const food = await createCustomFood(user.id, {
      name: "Bread",
      brand: null,
      servingQty: 1,
      servingUnit: "slice",
      calories: 80,
      proteinG: 3,
      carbsG: 15,
      fatG: 1,
      fiberG: 2,
      sugarG: 1,
      sodiumMg: 120,
    });

    const loggedOn = new Date("2026-11-06");
    const entry = await createFoodEntry({
      userId: user.id,
      foodId: food.id,
      loggedOn,
      meal: MealType.breakfast,
      quantity: 2,
      unitMode: "serving",
    });

    let day = await getDiaryDay(user.id, loggedOn);
    expect(day.totals.calories).toBe(160);

    await deleteFoodEntry(user.id, entry.id);
    day = await getDiaryDay(user.id, loggedOn);
    expect(day.allEntries).toHaveLength(0);
    expect(day.totals.calories).toBe(0);
  });

  it("updateFoodEntry rescales snapshots and can move meal", async () => {
    const user = await createTestUser();
    const other = await createTestUser({ email: "other@example.com" });
    const food = await createCustomFood(user.id, {
      name: "Yogurt",
      brand: null,
      servingQty: 1,
      servingUnit: "cup",
      calories: 100,
      proteinG: 10,
      carbsG: 12,
      fatG: 2,
      fiberG: 0,
      sugarG: 8,
      sodiumMg: 40,
    });

    const loggedOn = new Date("2026-11-06");
    const entry = await createFoodEntry({
      userId: user.id,
      foodId: food.id,
      loggedOn,
      meal: MealType.breakfast,
      quantity: 1,
      unitMode: "serving",
    });

    const updated = await updateFoodEntry(user.id, entry.id, {
      quantity: 2,
      meal: MealType.snack,
    });
    expect(updated).not.toBeNull();
    expect(updated!.quantityValue).toBe(2);
    expect(updated!.meal).toBe(MealType.snack);
    expect(updated!.caloriesSnapshot).toBe(200);
    expect(updated!.proteinGSnapshot).toBe(20);
    expect(updated!.quantityUnit).toBe(entry.quantityUnit);

    const day = await getDiaryDay(user.id, loggedOn);
    expect(day.totals.calories).toBe(200);
    expect(day.meals.find((m) => m.meal === MealType.snack)?.entries).toHaveLength(
      1,
    );
    expect(
      day.meals.find((m) => m.meal === MealType.breakfast)?.entries,
    ).toHaveLength(0);

    const denied = await updateFoodEntry(other.id, entry.id, {
      quantity: 3,
      meal: MealType.lunch,
    });
    expect(denied).toBeNull();
  });
});
