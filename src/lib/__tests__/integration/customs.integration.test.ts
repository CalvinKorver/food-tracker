import { beforeEach, describe, expect, it } from "vitest";
import {
  createCustomFood,
  deleteCustomFood,
  parseCustomFoodInput,
  updateCustomFood,
} from "@/lib/custom-food";
import { createFoodEntry } from "@/lib/foods";
import { createRecipe, getRecipeDetail, updateRecipe } from "@/lib/recipes";
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

  it("edit recipe updates future servings without changing persisted meal snapshots", async () => {
    const user = await createTestUser();
    const oats = await createCustomFood(user.id, {
      name: "Oats",
      brand: null,
      servingQty: 40,
      servingUnit: "g",
      calories: 150,
      proteinG: 5,
      carbsG: 27,
      fatG: 3,
      fiberG: 4,
      sugarG: 1,
      sodiumMg: 0,
    });
    const whey = await createCustomFood(user.id, {
      name: "Whey",
      brand: null,
      servingQty: 30,
      servingUnit: "g",
      calories: 120,
      proteinG: 24,
      carbsG: 3,
      fatG: 1,
      fiberG: 0,
      sugarG: 1,
      sodiumMg: 50,
    });

    const recipe = await createRecipe(user.id, {
      name: "Proats",
      servingsPerRecipe: 2,
      ingredients: [{ foodId: oats.id, quantity: 2, unitMode: "serving" }],
    });
    expect(recipe.calories).toBe(150);

    const oldEntry = await createFoodEntry({
      userId: user.id,
      foodId: recipe.id,
      loggedOn: new Date("2026-11-06"),
      meal: MealType.breakfast,
      quantity: 1,
      unitMode: "serving",
    });
    expect(oldEntry.caloriesSnapshot).toBe(150);
    expect(oldEntry.proteinGSnapshot).toBe(5);

    const updated = await updateRecipe(user.id, recipe.id, {
      name: "Super Proats",
      servingsPerRecipe: 2,
      ingredients: [
        { foodId: oats.id, quantity: 2, unitMode: "serving" },
        { foodId: whey.id, quantity: 1, unitMode: "serving" },
      ],
    });
    expect(updated.calories).toBe(210);
    expect(updated.proteinG).toBe(17);

    const detail = await getRecipeDetail(user.id, recipe.id);
    expect(detail?.name).toBe("Super Proats");
    expect(detail?.ingredients).toHaveLength(2);

    const persistedOld = await prisma.foodEntry.findUniqueOrThrow({
      where: { id: oldEntry.id },
    });
    expect(persistedOld.foodNameSnapshot).toBe("Proats");
    expect(persistedOld.caloriesSnapshot).toBe(150);
    expect(persistedOld.proteinGSnapshot).toBe(5);

    const newEntry = await createFoodEntry({
      userId: user.id,
      foodId: recipe.id,
      loggedOn: new Date("2026-11-07"),
      meal: MealType.breakfast,
      quantity: 1,
      unitMode: "serving",
    });
    expect(newEntry.foodNameSnapshot).toBe("Super Proats");
    expect(newEntry.caloriesSnapshot).toBe(210);
    expect(newEntry.proteinGSnapshot).toBe(17);

    await expect(
      updateRecipe(user.id, recipe.id, {
        name: "Cycle",
        servingsPerRecipe: 1,
        ingredients: [{ foodId: recipe.id, quantity: 1, unitMode: "serving" }],
      }),
    ).rejects.toThrow("A recipe cannot contain itself");
  });
});
