import { z } from "zod";
import { FOOD_SOURCES, MEAL_TYPES, QUANTITY_UNIT_MODES } from "./enums";

export const mealTypeSchema = z.enum(MEAL_TYPES);
export const foodSourceSchema = z.enum(FOOD_SOURCES);
export const quantityUnitModeSchema = z.enum(QUANTITY_UNIT_MODES);

export const foodPortionSchema = z.object({
  label: z.string().min(1),
  grams: z.number().positive(),
});

export const foodListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  brand: z.string().nullable(),
  source: foodSourceSchema,
  servingQty: z.number(),
  servingUnit: z.string(),
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  fiberG: z.number(),
  sugarG: z.number(),
  sodiumMg: z.number(),
  servingsPerRecipe: z.number().nullable(),
  portions: z.array(foodPortionSchema),
  isFavorite: z.boolean(),
});

export const dayTotalsSchema = z.object({
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  fiberG: z.number(),
  sugarG: z.number(),
  sodiumMg: z.number(),
  netCarbsG: z.number(),
});

export const diaryEntrySchema = z.object({
  id: z.string().uuid(),
  foodId: z.string().uuid(),
  meal: mealTypeSchema,
  quantityValue: z.number(),
  quantityUnit: z.string(),
  foodNameSnapshot: z.string(),
  caloriesSnapshot: z.number(),
  proteinGSnapshot: z.number(),
  carbsGSnapshot: z.number(),
  fatGSnapshot: z.number(),
  fiberGSnapshot: z.number(),
  sugarGSnapshot: z.number(),
  sodiumMgSnapshot: z.number(),
});

export const mealGroupSchema = z.object({
  meal: mealTypeSchema,
  label: z.string(),
  entries: z.array(diaryEntrySchema),
});

export const diaryDaySchema = z.object({
  dateKey: z.string(),
  label: z.string(),
  isToday: z.boolean(),
  prevKey: z.string(),
  nextKey: z.string(),
  meals: z.array(mealGroupSchema),
  totals: dayTotalsSchema,
});

export const userGoalsSchema = z.object({
  calorieGoal: z.number().positive(),
  proteinGoalG: z.number().nonnegative(),
  carbsGoalG: z.number().nonnegative(),
  fatGoalG: z.number().nonnegative(),
});

export const mealWindowSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const mealWindowsSchema = z.object({
  breakfast: mealWindowSchema,
  lunch: mealWindowSchema,
  dinner: mealWindowSchema,
});

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  timezone: z.string(),
  goals: userGoalsSchema.nullable(),
  mealWindows: mealWindowsSchema,
  calorieNagEnabled: z.boolean(),
});

export const addFoodEntrySchema = z.object({
  foodId: z.string().uuid(),
  dateKey: z.string().min(1),
  loggedOnKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal: mealTypeSchema,
  quantity: z.number().positive(),
  unitMode: quantityUnitModeSchema,
  selectedUnit: z.string().optional(),
});

export const createRecipeSchema = z.object({
  name: z.string().trim().min(1),
  servingsPerRecipe: z.number().positive(),
  ingredients: z
    .array(
      z.object({
        foodId: z.string().uuid(),
        quantity: z.number().positive(),
        unitMode: quantityUnitModeSchema,
        selectedUnit: z.string().optional(),
      }),
    )
    .min(1),
});

export const customFoodBodySchema = z.object({
  name: z.string().trim().min(1),
  brand: z.string().nullable().optional(),
  servingQty: z.number().positive(),
  servingUnit: z.string().trim().min(1),
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative().optional(),
  carbsG: z.number().nonnegative().optional(),
  fatG: z.number().nonnegative().optional(),
  fiberG: z.number().nonnegative().optional(),
  sugarG: z.number().nonnegative().optional(),
  sodiumMg: z.number().nonnegative().optional(),
  satFatG: z.number().nonnegative().optional(),
  transFatG: z.number().nonnegative().optional(),
  cholesterolMg: z.number().nonnegative().optional(),
  source: z.enum(["custom", "ocr"]).optional(),
});

export const parseNutritionLabelSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export const barcodeSchema = z.object({
  code: z.string().regex(/^\d{8,14}$/),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(3),
});

export const saveMealWindowsSchema = z.object({
  breakfastStart: z.string(),
  breakfastEnd: z.string(),
  lunchStart: z.string(),
  lunchEnd: z.string(),
  dinnerStart: z.string(),
  dinnerEnd: z.string(),
});

export const signInPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const nativeTokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.string().datetime(),
  user: sessionUserSchema,
});

export const apiOkSchema = <T extends z.ZodType>(data: T) =>
  z.object({ ok: z.literal(true), data });

export const apiErrSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  field: z.string().optional(),
});
