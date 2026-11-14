import type { FoodSource, MealType, QuantityUnitMode } from "./enums";

export type FoodPortionOption = { label: string; grams: number };

export type FoodListItem = {
  id: string;
  name: string;
  brand: string | null;
  source: FoodSource;
  servingQty: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  servingsPerRecipe: number | null;
  portions: FoodPortionOption[];
  isFavorite: boolean;
};

export type DiaryEntryDto = {
  id: string;
  foodId: string;
  meal: MealType;
  quantityValue: number;
  quantityUnit: string;
  foodNameSnapshot: string;
  caloriesSnapshot: number;
  proteinGSnapshot: number;
  carbsGSnapshot: number;
  fatGSnapshot: number;
  fiberGSnapshot: number;
  sugarGSnapshot: number;
  sodiumMgSnapshot: number;
};

export type DayTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  netCarbsG: number;
};

export type MealGroupDto = {
  meal: MealType;
  label: string;
  entries: DiaryEntryDto[];
};

export type DiaryDayDto = {
  dateKey: string;
  label: string;
  isToday: boolean;
  prevKey: string;
  nextKey: string;
  meals: MealGroupDto[];
  totals: DayTotals;
};

export type UserGoals = {
  calorieGoal: number;
  proteinGoalG: number;
  carbsGoalG: number;
  fatGoalG: number;
};

export type MealWindow = { start: string; end: string };

export type MealWindows = {
  breakfast: MealWindow;
  lunch: MealWindow;
  dinner: MealWindow;
};

export type SessionUserDto = {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  goals: UserGoals | null;
  mealWindows: MealWindows;
  calorieNagEnabled: boolean;
};

export type UsdaSearchHit = {
  fdcId: string;
  name: string;
  displayName: string;
  brand: string | null;
  dataType: string | null;
  caloriesPer100g: number | null;
  variants: Array<{
    fdcId: string;
    name: string;
    displayName: string;
    brand: string | null;
    dataType: string | null;
    caloriesPer100g: number | null;
  }>;
};

export type OffSearchHit = {
  barcode: string;
  name: string;
  brand: string | null;
};

export type OcrFoodPrefill = {
  name: string;
  brand: string;
  servingQty: string;
  servingUnit: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  fiberG: string;
  sugarG: string;
  sodiumMg: string;
  satFatG: string;
  transFatG: string;
  cholesterolMg: string;
};

export type AddFoodEntryInput = {
  foodId: string;
  dateKey: string;
  loggedOnKey: string;
  meal: MealType;
  quantity: number;
  unitMode: QuantityUnitMode;
  selectedUnit?: string;
};

export type UpdateFoodEntryInput = {
  quantity: number;
  meal: MealType;
};

export type CreateRecipeInput = {
  name: string;
  servingsPerRecipe: number;
  ingredients: Array<{
    foodId: string;
    quantity: number;
    unitMode: QuantityUnitMode;
    selectedUnit?: string;
  }>;
};

export type CustomFoodInputDto = {
  name: string;
  brand?: string | null;
  servingQty: number;
  servingUnit: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  satFatG?: number;
  transFatG?: number;
  cholesterolMg?: number;
  source?: "custom" | "ocr";
};

export type NativeTokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: SessionUserDto;
};

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; field?: string };
export type ApiResult<T> = ApiOk<T> | ApiErr;
