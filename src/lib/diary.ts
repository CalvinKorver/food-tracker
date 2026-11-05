import { prisma } from "@/lib/db";
import { sumDayTotals, type DayTotals } from "@/lib/nutrients";
import { MealType, type FoodEntry, type Food } from "@/generated/prisma/client";

export type DiaryEntryWithFood = FoodEntry & {
  food: Pick<Food, "id" | "servingQty" | "servingUnit" | "name">;
};

export type MealGroup = {
  meal: MealType;
  label: string;
  entries: DiaryEntryWithFood[];
};

export type DiaryDay = {
  loggedOn: Date;
  meals: MealGroup[];
  totals: DayTotals;
  allEntries: DiaryEntryWithFood[];
};

const MEAL_ORDER: { meal: MealType; label: string }[] = [
  { meal: MealType.breakfast, label: "Breakfast" },
  { meal: MealType.lunch, label: "Lunch" },
  { meal: MealType.dinner, label: "Dinner" },
  { meal: MealType.snack, label: "Snacks" },
];

export async function getDiaryDay(
  userId: string,
  loggedOn: Date,
): Promise<DiaryDay> {
  const allEntries = await prisma.foodEntry.findMany({
    where: { userId, loggedOn },
    include: {
      food: {
        select: {
          id: true,
          servingQty: true,
          servingUnit: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const meals: MealGroup[] = MEAL_ORDER.map(({ meal, label }) => ({
    meal,
    label,
    entries: allEntries.filter((e) => e.meal === meal),
  }));

  return {
    loggedOn,
    meals,
    totals: sumDayTotals(allEntries),
    allEntries,
  };
}

export async function deleteFoodEntry(
  userId: string,
  entryId: string,
): Promise<boolean> {
  const result = await prisma.foodEntry.deleteMany({
    where: { id: entryId, userId },
  });
  return result.count > 0;
}

export { MEAL_ORDER };
