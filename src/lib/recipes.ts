import { prisma } from "@/lib/db";
import { FoodSource } from "@/generated/prisma/client";
import {
  portionsFromNutrientsExtra,
  type FoodPortionOption,
} from "@/lib/food-shared";
import {
  quantityMultiplier,
  quantityUnitFromMode,
  unitModeFromQuantityUnit,
  type QuantityUnitMode,
} from "@/lib/quantity";

export type RecipeIngredientInput = {
  foodId: string;
  quantity: number;
  unitMode: QuantityUnitMode;
  /** When unitMode is food, the unit the user typed (e.g. g vs oz). */
  selectedUnit?: string;
};

export type RecipeNutrientTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
};

type IngredientFood = {
  id: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  servingQty: number;
  servingUnit: string;
  servingsPerRecipe: number | null;
  portions: FoodPortionOption[];
};

const MAX_RECOMPUTE_DEPTH = 4;

export function computeRecipeTotals(
  ingredients: Array<{
    food: IngredientFood;
    quantity: number;
    unitMode: QuantityUnitMode;
    selectedUnit?: string;
  }>,
): RecipeNutrientTotals {
  const totals: RecipeNutrientTotals = {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
    sugarG: 0,
    sodiumMg: 0,
  };

  for (const item of ingredients) {
    const multiplier = quantityMultiplier(
      item.quantity,
      item.unitMode,
      item.food.servingQty,
      item.food.servingsPerRecipe,
      item.unitMode === "food"
        ? {
            foodServingUnit: item.food.servingUnit,
            selectedUnit: item.selectedUnit ?? item.food.servingUnit,
            portions: item.food.portions,
          }
        : undefined,
    );
    totals.calories += item.food.calories * multiplier;
    totals.proteinG += item.food.proteinG * multiplier;
    totals.carbsG += item.food.carbsG * multiplier;
    totals.fatG += item.food.fatG * multiplier;
    totals.fiberG += item.food.fiberG * multiplier;
    totals.sugarG += item.food.sugarG * multiplier;
    totals.sodiumMg += item.food.sodiumMg * multiplier;
  }

  return totals;
}

function perServing(
  totals: RecipeNutrientTotals,
  servingsPerRecipe: number,
): RecipeNutrientTotals {
  return {
    calories: totals.calories / servingsPerRecipe,
    proteinG: totals.proteinG / servingsPerRecipe,
    carbsG: totals.carbsG / servingsPerRecipe,
    fatG: totals.fatG / servingsPerRecipe,
    fiberG: totals.fiberG / servingsPerRecipe,
    sugarG: totals.sugarG / servingsPerRecipe,
    sodiumMg: totals.sodiumMg / servingsPerRecipe,
  };
}

async function loadIngredientFoods(
  userId: string,
  foodIds: string[],
): Promise<Map<string, IngredientFood>> {
  const foods = await prisma.food.findMany({
    where: {
      id: { in: foodIds },
      OR: [{ userId }, { userId: null }],
    },
    select: {
      id: true,
      calories: true,
      proteinG: true,
      carbsG: true,
      fatG: true,
      fiberG: true,
      sugarG: true,
      sodiumMg: true,
      servingQty: true,
      servingUnit: true,
      servingsPerRecipe: true,
      nutrientsExtra: true,
    },
  });
  return new Map(
    foods.map(({ nutrientsExtra, ...f }) => [
      f.id,
      { ...f, portions: portionsFromNutrientsExtra(nutrientsExtra) },
    ]),
  );
}

export async function createRecipe(
  userId: string,
  input: {
    name: string;
    servingsPerRecipe: number;
    ingredients: RecipeIngredientInput[];
  },
) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Recipe name is required");
  }
  if (!(input.servingsPerRecipe > 0)) {
    throw new Error("Servings per recipe must be greater than 0");
  }
  if (input.ingredients.length === 0) {
    throw new Error("Add at least one ingredient");
  }

  const foodIds = input.ingredients.map((i) => i.foodId);
  if (new Set(foodIds).size !== foodIds.length) {
    // duplicates are fine; just note we don't require unique
  }

  const foods = await loadIngredientFoods(userId, foodIds);
  if (foods.size !== new Set(foodIds).size) {
    throw new Error("One or more ingredients were not found");
  }

  const computed = input.ingredients.map((item) => {
    const food = foods.get(item.foodId)!;
    if (!(item.quantity > 0)) {
      throw new Error("Ingredient quantity must be greater than 0");
    }
    if (
      item.unitMode !== "serving" &&
      item.unitMode !== "food" &&
      item.unitMode !== "recipe"
    ) {
      throw new Error("Invalid unit");
    }
    const selectedUnit =
      item.unitMode === "food"
        ? (item.selectedUnit ?? food.servingUnit)
        : undefined;
    const servings = quantityMultiplier(
      item.quantity,
      item.unitMode,
      food.servingQty,
      food.servingsPerRecipe,
      item.unitMode === "food"
        ? {
            foodServingUnit: food.servingUnit,
            selectedUnit,
            portions: food.portions,
          }
        : undefined,
    );
    return {
      food,
      quantity: item.quantity,
      unitMode: item.unitMode,
      selectedUnit,
      servings,
      quantityUnit: quantityUnitFromMode(
        item.unitMode,
        food.servingUnit,
        selectedUnit,
      ),
    };
  });

  const totals = computeRecipeTotals(computed);
  const nutrients = perServing(totals, input.servingsPerRecipe);

  return prisma.$transaction(async (tx) => {
    const recipe = await tx.food.create({
      data: {
        userId,
        source: FoodSource.recipe,
        name,
        brand: null,
        servingQty: 1,
        servingUnit: "serving",
        servingsPerRecipe: input.servingsPerRecipe,
        calories: nutrients.calories,
        proteinG: nutrients.proteinG,
        carbsG: nutrients.carbsG,
        fatG: nutrients.fatG,
        fiberG: nutrients.fiberG,
        sugarG: nutrients.sugarG,
        sodiumMg: nutrients.sodiumMg,
      },
    });

    // Self-reference guard for future edit flows.
    if (computed.some((c) => c.food.id === recipe.id)) {
      throw new Error("A recipe cannot contain itself");
    }

    await tx.recipeIngredient.createMany({
      data: computed.map((c, index) => ({
        recipeId: recipe.id,
        ingredientId: c.food.id,
        servings: c.servings,
        quantityValue: c.quantity,
        quantityUnit: c.quantityUnit,
        position: index,
      })),
    });

    return recipe;
  });
}

async function recomputeRecipeFood(
  recipeId: string,
): Promise<string | null> {
  const recipe = await prisma.food.findUnique({
    where: { id: recipeId },
    select: {
      id: true,
      servingsPerRecipe: true,
      recipeIngredients: {
        orderBy: { position: "asc" },
        select: {
          quantityValue: true,
          quantityUnit: true,
          ingredient: {
            select: {
              id: true,
              calories: true,
              proteinG: true,
              carbsG: true,
              fatG: true,
              fiberG: true,
              sugarG: true,
              sodiumMg: true,
              servingQty: true,
              servingUnit: true,
              servingsPerRecipe: true,
              nutrientsExtra: true,
            },
          },
        },
      },
    },
  });

  if (!recipe || !(recipe.servingsPerRecipe != null && recipe.servingsPerRecipe > 0)) {
    return null;
  }

  const totals = computeRecipeTotals(
    recipe.recipeIngredients.map((row) => {
      const unitMode = unitModeFromQuantityUnit(row.quantityUnit);
      const { nutrientsExtra, ...ingredient } = row.ingredient;
      return {
        food: {
          ...ingredient,
          portions: portionsFromNutrientsExtra(nutrientsExtra),
        },
        quantity: row.quantityValue,
        unitMode,
        selectedUnit: unitMode === "food" ? row.quantityUnit : undefined,
      };
    }),
  );
  const nutrients = perServing(totals, recipe.servingsPerRecipe);

  await prisma.food.update({
    where: { id: recipe.id },
    data: {
      calories: nutrients.calories,
      proteinG: nutrients.proteinG,
      carbsG: nutrients.carbsG,
      fatG: nutrients.fatG,
      fiberG: nutrients.fiberG,
      sugarG: nutrients.sugarG,
      sodiumMg: nutrients.sodiumMg,
    },
  });

  return recipe.id;
}

/** Recalculate every recipe that uses `foodId`, including nested parents. */
export async function recomputeRecipesUsing(foodId: string): Promise<void> {
  let frontier = [foodId];
  const visited = new Set<string>();

  for (let depth = 0; depth < MAX_RECOMPUTE_DEPTH && frontier.length > 0; depth++) {
    const links = await prisma.recipeIngredient.findMany({
      where: { ingredientId: { in: frontier } },
      select: { recipeId: true },
      distinct: ["recipeId"],
    });
    const next: string[] = [];
    for (const link of links) {
      if (visited.has(link.recipeId)) continue;
      visited.add(link.recipeId);
      await recomputeRecipeFood(link.recipeId);
      next.push(link.recipeId);
    }
    frontier = next;
  }
}
