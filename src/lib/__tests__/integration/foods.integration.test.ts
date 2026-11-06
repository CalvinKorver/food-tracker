import { beforeEach, describe, expect, it } from "vitest";
import { createCustomFood } from "@/lib/custom-food";
import {
  createFoodEntry,
  listFavoriteFoods,
  listRecentFoods,
  searchFoods,
  toggleFavorite,
} from "@/lib/foods";
import { MealType } from "@/generated/prisma/client";
import { createTestUser, resetTestDb } from "../helpers/db";

describe("favorites / recents / search integration", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  it("favorites list and toggle on/off", async () => {
    const user = await createTestUser();
    const food = await createCustomFood(user.id, {
      name: "Banana",
      brand: null,
      servingQty: 1,
      servingUnit: "medium",
      calories: 105,
      proteinG: 1,
      carbsG: 27,
      fatG: 0,
      fiberG: 3,
      sugarG: 14,
      sodiumMg: 1,
    });

    await toggleFavorite(user.id, food.id);
    let favs = await listFavoriteFoods(user.id);
    expect(favs).toHaveLength(1);
    expect(favs[0]?.name).toBe("Banana");

    await toggleFavorite(user.id, food.id);
    favs = await listFavoriteFoods(user.id);
    expect(favs).toHaveLength(0);

    // toggle again after delete (re-favorite) works
    await toggleFavorite(user.id, food.id);
    favs = await listFavoriteFoods(user.id);
    expect(favs).toHaveLength(1);
  });

  it("recents are distinct, newest-first, and respect limit", async () => {
    const user = await createTestUser();
    const a = await createCustomFood(user.id, {
      name: "Food A",
      brand: null,
      servingQty: 1,
      servingUnit: "serving",
      calories: 1,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
    });
    const b = await createCustomFood(user.id, {
      name: "Food B",
      brand: "Brand",
      servingQty: 1,
      servingUnit: "serving",
      calories: 1,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
    });

    const day = new Date("2026-11-06");
    await createFoodEntry({
      userId: user.id,
      foodId: a.id,
      loggedOn: day,
      meal: MealType.snack,
      quantity: 1,
      unitMode: "serving",
    });
    await createFoodEntry({
      userId: user.id,
      foodId: b.id,
      loggedOn: day,
      meal: MealType.snack,
      quantity: 1,
      unitMode: "serving",
    });
    await createFoodEntry({
      userId: user.id,
      foodId: a.id,
      loggedOn: day,
      meal: MealType.dinner,
      quantity: 1,
      unitMode: "serving",
    });

    const recents = await listRecentFoods(user.id, 1);
    expect(recents).toHaveLength(1);
    expect(recents[0]?.id).toBe(a.id);

    const all = await listRecentFoods(user.id);
    expect(all.map((f) => f.id)).toEqual([a.id, b.id]);
  });

  it("searchFoods filters by name/brand substring", async () => {
    const user = await createTestUser();
    await createCustomFood(user.id, {
      name: "Greek Yogurt",
      brand: "Chobani",
      servingQty: 170,
      servingUnit: "g",
      calories: 100,
      proteinG: 15,
      carbsG: 5,
      fatG: 0,
      fiberG: 0,
      sugarG: 5,
      sodiumMg: 50,
    });
    await createCustomFood(user.id, {
      name: "Almond Butter",
      brand: null,
      servingQty: 32,
      servingUnit: "g",
      calories: 190,
      proteinG: 7,
      carbsG: 6,
      fatG: 17,
      fiberG: 3,
      sugarG: 1,
      sodiumMg: 0,
    });

    const byName = await searchFoods(user.id, "all", "yogurt");
    expect(byName.map((f) => f.name)).toEqual(["Greek Yogurt"]);

    const byBrand = await searchFoods(user.id, "all", "chobani");
    expect(byBrand).toHaveLength(1);

    const empty = await searchFoods(user.id, "all", "zzz");
    expect(empty).toHaveLength(0);

    const all = await searchFoods(user.id, "all", "");
    expect(all).toHaveLength(2);
  });
});
