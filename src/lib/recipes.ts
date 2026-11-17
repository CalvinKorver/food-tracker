import type { RecipeDetailDto } from "@food-tracker/contracts";
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

type RecipeMutationInput = {
  name: string;
  servingsPerRecipe: number;
  ingredients: RecipeIngredientInput[];
};

async function prepareRecipeMutation(
  userId: string,
  input: RecipeMutationInput,
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
  return { name, computed, nutrients };
}

function nutrientColumns(nutrients: RecipeNutrientTotals) {
  return {
    calories: nutrients.calories,
    proteinG: nutrients.proteinG,
    carbsG: nutrients.carbsG,
    fatG: nutrients.fatG,
    fiberG: nutrients.fiberG,
    sugarG: nutrients.sugarG,
    sodiumMg: nutrients.sodiumMg,
  };
}

function ingredientRows(
  recipeId: string,
  computed: Array<{
    food: { id: string };
    servings: number;
    quantity: number;
    quantityUnit: string;
  }>,
) {
  return computed.map((c, index) => ({
    recipeId,
    ingredientId: c.food.id,
    servings: c.servings,
    quantityValue: c.quantity,
    quantityUnit: c.quantityUnit,
    position: index,
  }));
}

/** Reject direct or transitive recipe cycles before saving `recipeId`. */
async function assertNoRecipeCycle(
  recipeId: string,
  ingredientIds: string[],
): Promise<void> {
  if (ingredientIds.includes(recipeId)) {
    throw new Error("A recipe cannot contain itself");
  }
  let frontier = [...new Set(ingredientIds)];
  const visited = new Set<string>(frontier);
  for (
    let depth = 0;
    depth < MAX_RECOMPUTE_DEPTH && frontier.length > 0;
    depth++
  ) {
    const children = await prisma.recipeIngredient.findMany({
      where: { recipeId: { in: frontier } },
      select: { ingredientId: true },
      distinct: ["ingredientId"],
    });
    const next: string[] = [];
    for (const row of children) {
      if (row.ingredientId === recipeId) {
        throw new Error("A recipe cannot contain itself");
      }
      if (visited.has(row.ingredientId)) continue;
      visited.add(row.ingredientId);
      next.push(row.ingredientId);
    }
    frontier = next;
  }
}

export async function createRecipe(
  userId: string,
  input: RecipeMutationInput,
) {
  const { name, computed, nutrients } = await prepareRecipeMutation(
    userId,
    input,
  );

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
        ...nutrientColumns(nutrients),
      },
    });

    await tx.recipeIngredient.createMany({
      data: ingredientRows(recipe.id, computed),
    });

    return recipe;
  });
}

export async function getRecipeDetail(
  userId: string,
  recipeId: string,
): Promise<RecipeDetailDto | null> {
  const [recipe, favorites] = await Promise.all([
    prisma.food.findFirst({
      where: {
        id: recipeId,
        userId,
        source: FoodSource.recipe,
      },
      select: {
        id: true,
        name: true,
        servingsPerRecipe: true,
        recipeIngredients: {
          orderBy: { position: "asc" },
          select: {
            quantityValue: true,
            quantityUnit: true,
            ingredient: {
              select: {
                id: true,
                name: true,
                brand: true,
                source: true,
                servingQty: true,
                servingUnit: true,
                calories: true,
                proteinG: true,
                carbsG: true,
                fatG: true,
                fiberG: true,
                sugarG: true,
                sodiumMg: true,
                servingsPerRecipe: true,
                nutrientsExtra: true,
              },
            },
          },
        },
      },
    }),
    prisma.favorite.findMany({
      where: { userId },
      select: { foodId: true },
    }),
  ]);

  if (!recipe) return null;
  const favIds = new Set(favorites.map((f) => f.foodId));

  return {
    id: recipe.id,
    name: recipe.name,
    servingsPerRecipe: recipe.servingsPerRecipe ?? 1,
    ingredients: recipe.recipeIngredients.map((row) => {
      const unitMode = unitModeFromQuantityUnit(row.quantityUnit);
      const { nutrientsExtra, ...food } = row.ingredient;
      return {
        food: {
          ...food,
          portions: portionsFromNutrientsExtra(nutrientsExtra),
          isFavorite: favIds.has(food.id),
        },
        quantity: row.quantityValue,
        unitMode,
        selectedUnit: unitMode === "food" ? row.quantityUnit : undefined,
      };
    }),
  };
}

export async function updateRecipe(
  userId: string,
  recipeId: string,
  input: RecipeMutationInput,
) {
  const existing = await prisma.food.findFirst({
    where: {
      id: recipeId,
      userId,
      source: FoodSource.recipe,
    },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Recipe not found");
  }

  await assertNoRecipeCycle(
    recipeId,
    input.ingredients.map((i) => i.foodId),
  );

  const { name, computed, nutrients } = await prepareRecipeMutation(
    userId,
    input,
  );

  const updated = await prisma.$transaction(async (tx) => {
    const recipe = await tx.food.update({
      where: { id: recipeId },
      data: {
        name,
        servingsPerRecipe: input.servingsPerRecipe,
        ...nutrientColumns(nutrients),
      },
    });

    await tx.recipeIngredient.deleteMany({ where: { recipeId } });
    await tx.recipeIngredient.createMany({
      data: ingredientRows(recipeId, computed),
    });

    return recipe;
  });

  await recomputeRecipesUsing(recipeId);
  return updated;
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
    data: nutrientColumns(nutrients),
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
