import type {
  DiaryDayDto,
  DiaryEntryDto,
  MealWindows,
  SessionUserDto,
  UserGoals,
} from "@food-tracker/contracts";
import { isMealType, mealLabel, type MealType } from "@food-tracker/contracts";
import type { DiaryDateInfo } from "@food-tracker/domain";
import { goalsFromUser } from "@/lib/goals";
import { mealWindowsFromUser } from "@/lib/meal-windows";
import type { DiaryDay } from "@/lib/diary";
import type { User } from "@/generated/prisma/client";

export function toSessionUser(user: User): SessionUserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    timezone: user.timezone,
    goals: goalsFromUser(user),
    mealWindows: mealWindowsFromUser(user),
    calorieNagEnabled: user.calorieNagEnabled,
  };
}

function asMealType(meal: string): MealType {
  return isMealType(meal) ? meal : "snack";
}

export function toDiaryEntryDto(entry: {
  id: string;
  foodId: string;
  meal: string;
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
}): DiaryEntryDto {
  return {
    id: entry.id,
    foodId: entry.foodId,
    meal: asMealType(entry.meal),
    quantityValue: entry.quantityValue,
    quantityUnit: entry.quantityUnit,
    foodNameSnapshot: entry.foodNameSnapshot,
    caloriesSnapshot: entry.caloriesSnapshot,
    proteinGSnapshot: entry.proteinGSnapshot,
    carbsGSnapshot: entry.carbsGSnapshot,
    fatGSnapshot: entry.fatGSnapshot,
    fiberGSnapshot: entry.fiberGSnapshot,
    sugarGSnapshot: entry.sugarGSnapshot,
    sodiumMgSnapshot: entry.sodiumMgSnapshot,
  };
}

export function toDiaryDayDto(
  day: DiaryDay,
  resolved: DiaryDateInfo,
): DiaryDayDto {
  return {
    dateKey: resolved.key,
    label: resolved.label,
    isToday: resolved.isToday,
    prevKey: resolved.prevKey,
    nextKey: resolved.nextKey,
    totals: day.totals,
    meals: day.meals.map((group) => {
      const meal = asMealType(group.meal);
      return {
        meal,
        label: group.label || mealLabel(meal),
        entries: group.entries.map(toDiaryEntryDto),
      };
    }),
  };
}

export function toGoals(user: User): UserGoals | null {
  return goalsFromUser(user);
}

export function toMealWindows(user: User): MealWindows {
  return mealWindowsFromUser(user);
}
