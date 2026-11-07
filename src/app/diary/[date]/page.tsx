import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { AddFoodSheet } from "@/components/foods/AddFoodSheet";
import { DayHeader } from "@/components/diary/DayHeader";
import { DayTotalsCard } from "@/components/diary/DayTotalsCard";
import { MealCard } from "@/components/diary/MealCard";
import { getCurrentUser } from "@/lib/current-user";
import { resolveDiaryDate } from "@/lib/dates";
import { getDiaryDay } from "@/lib/diary";
import { isMealType } from "@/lib/food-shared";
import {
  getFoodListItem,
  listAllFoods,
  listFavoriteFoods,
  listRecentFoods,
} from "@/lib/foods";

type DiaryPageProps = {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ add?: string; foodId?: string }>;
};

export default async function DiaryPage({
  params,
  searchParams,
}: DiaryPageProps) {
  const { date: dateParam } = await params;
  const { add, foodId } = await searchParams;
  const user = await getCurrentUser();
  const resolved = resolveDiaryDate(dateParam, user.timezone);

  if (!resolved) {
    redirect("/diary/today");
  }

  const pathKey = dateParam === "today" ? "today" : resolved.key;
  if (dateParam !== "today" && dateParam !== resolved.key) {
    redirect(`/diary/${resolved.key}`);
  }

  const addMeal = add && isMealType(add) ? add : add ? "snack" : null;

  const [day, recents, favorites, allFoods, initialSelected] = await Promise.all([
    getDiaryDay(user.id, resolved.date),
    addMeal ? listRecentFoods(user.id) : Promise.resolve([]),
    addMeal ? listFavoriteFoods(user.id) : Promise.resolve([]),
    addMeal ? listAllFoods(user.id) : Promise.resolve([]),
    addMeal && foodId
      ? getFoodListItem(user.id, foodId)
      : Promise.resolve(null),
  ]);

  const mealCards = day.meals.map((group) => ({
    meal: group.meal,
    label: group.label,
    entries: group.entries.map((e) => ({
      id: e.id,
      foodNameSnapshot: e.foodNameSnapshot,
      quantityValue: e.quantityValue,
      quantityUnit: e.quantityUnit,
      caloriesSnapshot: e.caloriesSnapshot,
    })),
  }));

  return (
    <div className="flex flex-col gap-3">
      <DayHeader
        label={resolved.label}
        prevKey={resolved.prevKey}
        nextKey={resolved.nextKey}
      />

      <DayTotalsCard totals={day.totals} />

      <section className="space-y-2">
        {mealCards.map((group) => (
          <MealCard
            key={group.meal}
            meal={group.meal}
            label={group.label}
            dateKey={pathKey}
            entries={group.entries}
          />
        ))}
      </section>

      {addMeal ? (
        <ViewTransition
          enter={{ "sheet-open": "sheet-slide-up", default: "none" }}
          exit={{ "sheet-close": "sheet-slide-down", default: "none" }}
          default="none"
        >
          <AddFoodSheet
            meal={addMeal}
            dateKey={pathKey}
            loggedOnKey={resolved.key}
            initialRecents={recents}
            initialFavorites={favorites}
            initialAll={allFoods}
            initialSelected={initialSelected}
          />
        </ViewTransition>
      ) : null}
    </div>
  );
}
