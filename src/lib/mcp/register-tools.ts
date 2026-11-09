import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { createCustomFood } from "@/lib/custom-food";
import { resolveDiaryDate } from "@/lib/dates";
import { getDiaryDay } from "@/lib/diary";
import { prisma } from "@/lib/db";
import { isMealType } from "@/lib/food-shared";
import {
  createFoodEntry,
  selectUsdaFood,
} from "@/lib/foods";
import { goalsFromUser, parseGoalInput } from "@/lib/goals";
import { parseLogFoodItemInput } from "@/lib/mcp/log-food-item";
import type { MealType } from "@/generated/prisma/client";

function text(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorText(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

function serializeDiaryDay(
  day: Awaited<ReturnType<typeof getDiaryDay>>,
  meta: { key: string; label: string },
) {
  return {
    date: meta.key,
    label: meta.label,
    totals: day.totals,
    meals: day.meals.map((group) => ({
      meal: group.meal,
      label: group.label,
      entries: group.entries.map((entry) => ({
        id: entry.id,
        foodId: entry.foodId,
        name: entry.foodNameSnapshot,
        quantityValue: entry.quantityValue,
        quantityUnit: entry.quantityUnit,
        calories: entry.caloriesSnapshot,
        proteinG: entry.proteinGSnapshot,
        carbsG: entry.carbsGSnapshot,
        fatG: entry.fatGSnapshot,
      })),
    })),
  };
}

async function loadUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }
  return user;
}

/** Register diary/goals/search/log tools bound to a resolved user id. */
export function registerFoodTrackerTools(
  server: McpServer,
  getUserId: () => Promise<string>,
) {
  server.registerTool(
    "get_diary_day",
    {
      description:
        "Get diary totals and meal entries for a day. Pass today or YYYY-MM-DD.",
      inputSchema: {
        date: z
          .string()
          .default("today")
          .describe('Diary day: "today" or YYYY-MM-DD'),
      },
    },
    async ({ date }) => {
      try {
        const user = await loadUser(await getUserId());
        const resolved = resolveDiaryDate(date, user.timezone);
        if (!resolved) {
          return errorText(`Invalid date: ${date}`);
        }
        const day = await getDiaryDay(user.id, resolved.date);
        return text(serializeDiaryDay(day, resolved));
      } catch (err) {
        return errorText(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    "get_goals",
    {
      description: "Get the current user's daily calorie and macro gram goals.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const user = await loadUser(await getUserId());
        return text({ goals: goalsFromUser(user) });
      } catch (err) {
        return errorText(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    "update_goals",
    {
      description:
        "Set daily calorie and macro gram goals. Macro calories (P×4 + C×4 + F×9) must match the calorie goal within 1%.",
      inputSchema: {
        calorieGoal: z.number().positive().describe("Daily calorie target"),
        proteinGoalG: z.number().nonnegative().describe("Protein grams per day"),
        carbsGoalG: z.number().nonnegative().describe("Carb grams per day"),
        fatGoalG: z.number().nonnegative().describe("Fat grams per day"),
      },
    },
    async (args) => {
      try {
        const parsed = parseGoalInput(args);
        if (!parsed.ok) {
          return errorText(parsed.error.message);
        }
        const user = await loadUser(await getUserId());
        await prisma.user.update({
          where: { id: user.id },
          data: {
            calorieGoal: parsed.data.calorieGoal,
            proteinGoalG: parsed.data.proteinGoalG,
            carbsGoalG: parsed.data.carbsGoalG,
            fatGoalG: parsed.data.fatGoalG,
          },
        });
        return text({ ok: true, goals: parsed.data });
      } catch (err) {
        return errorText(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    "search_foods",
    {
      description:
        "Search the USDA FoodData Central catalog (same ranking as the app). Returns hits with fdcId for log_food_item.",
      inputSchema: {
        query: z
          .string()
          .min(3)
          .describe("Food name query (at least 3 characters)"),
      },
    },
    async ({ query }) => {
      try {
        await loadUser(await getUserId());
        const { searchFdcFoods } = await import("@/lib/sources/usda-fdc");
        const foods = await searchFdcFoods(query.trim());
        return text({
          foods: foods.map((hit) => ({
            fdcId: hit.fdcId,
            name: hit.name,
            displayName: hit.displayName,
            brand: hit.brand,
            dataType: hit.dataType,
            caloriesPer100g: hit.caloriesPer100g,
            variantCount: hit.variants.length,
          })),
        });
      } catch (err) {
        return errorText(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    "log_food_item",
    {
      description:
        "Log a food to the diary. Provide exactly one of: fdcId (from search_foods) + grams; foodId + grams (or quantity/unitMode); or food_name + grams with optional macros.",
      inputSchema: {
        fdcId: z.string().optional().describe("USDA FDC id from search_foods"),
        foodId: z.string().optional().describe("Existing food UUID in the DB"),
        food_name: z
          .string()
          .optional()
          .describe("Ad-hoc custom food name when macros are known"),
        grams: z.number().positive().optional().describe("Amount in grams"),
        quantity: z
          .number()
          .positive()
          .optional()
          .describe("Amount when using foodId without grams"),
        unitMode: z
          .enum(["serving", "food", "recipe"])
          .optional()
          .describe("Unit mode with foodId + quantity (default serving)"),
        selectedUnit: z
          .string()
          .optional()
          .describe("Native unit when unitMode is food"),
        calories: z.number().nonnegative().optional(),
        protein: z.number().nonnegative().optional(),
        carbs: z.number().nonnegative().optional(),
        fat: z.number().nonnegative().optional(),
        date: z
          .string()
          .default("today")
          .describe('Diary day: "today" or YYYY-MM-DD'),
        meal: z
          .enum(["breakfast", "lunch", "dinner", "snack"])
          .default("snack")
          .describe("Meal slot (default snack)"),
      },
    },
    async (args) => {
      try {
        const user = await loadUser(await getUserId());
        const meal = args.meal ?? "snack";
        if (!isMealType(meal)) {
          return errorText("Invalid meal");
        }
        const resolved = resolveDiaryDate(args.date ?? "today", user.timezone);
        if (!resolved) {
          return errorText(`Invalid date: ${args.date}`);
        }

        const parsed = parseLogFoodItemInput(args);
        if (!parsed.ok) {
          return errorText(parsed.error);
        }

        let foodId: string;
        let quantity: number;
        let unitMode: "serving" | "food" | "recipe";
        let selectedUnit: string | undefined;

        if (parsed.mode.kind === "catalog") {
          const food = await selectUsdaFood(parsed.mode.fdcId, user.id);
          foodId = food.id;
          quantity = parsed.mode.grams;
          unitMode = "food";
          selectedUnit = "g";
        } else if (parsed.mode.kind === "existing") {
          foodId = parsed.mode.foodId;
          quantity = parsed.mode.quantity;
          unitMode = parsed.mode.unitMode;
          selectedUnit = parsed.mode.selectedUnit;
        } else {
          const custom = await createCustomFood(user.id, {
            name: parsed.mode.foodName,
            brand: null,
            servingQty: parsed.mode.grams,
            servingUnit: "g",
            calories: parsed.mode.calories,
            proteinG: parsed.mode.proteinG,
            carbsG: parsed.mode.carbsG,
            fatG: parsed.mode.fatG,
            fiberG: 0,
            sugarG: 0,
            sodiumMg: 0,
          });
          foodId = custom.id;
          quantity = 1;
          unitMode = "serving";
        }

        const entry = await createFoodEntry({
          userId: user.id,
          foodId,
          loggedOn: resolved.date,
          meal: meal as MealType,
          quantity,
          unitMode,
          selectedUnit,
        });

        return text({
          ok: true,
          entry: {
            id: entry.id,
            foodId: entry.foodId,
            name: entry.foodNameSnapshot,
            date: resolved.key,
            meal: entry.meal,
            quantityValue: entry.quantityValue,
            quantityUnit: entry.quantityUnit,
            calories: entry.caloriesSnapshot,
            proteinG: entry.proteinGSnapshot,
            carbsG: entry.carbsGSnapshot,
            fatG: entry.fatGSnapshot,
          },
        });
      } catch (err) {
        return errorText(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
