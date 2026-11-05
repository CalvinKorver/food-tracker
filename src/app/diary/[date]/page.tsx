import { redirect } from "next/navigation";
import { AddFoodStubBanner } from "@/components/diary/AddFoodStubBanner";
import { DayHeader } from "@/components/diary/DayHeader";
import { DayTotalsCard } from "@/components/diary/DayTotalsCard";
import { MealCard } from "@/components/diary/MealCard";
import { getCurrentUser } from "@/lib/current-user";
import { resolveDiaryDate } from "@/lib/dates";
import { getDiaryDay } from "@/lib/diary";

type DiaryPageProps = {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ add?: string }>;
};

export default async function DiaryPage({
  params,
  searchParams,
}: DiaryPageProps) {
  const { date: dateParam } = await params;
  const { add } = await searchParams;
  const user = await getCurrentUser();
  const resolved = resolveDiaryDate(dateParam, user.timezone);

  if (!resolved) {
    redirect("/diary/today");
  }

  // Canonicalize /diary/today → keep "today" in URL; dated keys stay as YYYY-MM-DD
  const pathKey = dateParam === "today" ? "today" : resolved.key;
  if (dateParam !== "today" && dateParam !== resolved.key) {
    redirect(`/diary/${resolved.key}`);
  }

  const day = await getDiaryDay(user.id, resolved.date);

  const mealCards = day.meals.map((group) => ({
    meal: group.meal,
    label: group.label,
    entries: group.entries.map((e) => ({
      id: e.id,
      foodNameSnapshot: e.foodNameSnapshot,
      servings: e.servings,
      servingUnit: e.food.servingUnit,
      caloriesSnapshot: e.caloriesSnapshot,
    })),
  }));

  return (
    <div className="flex flex-col gap-4">
      <DayHeader
        label={resolved.label}
        prevKey={resolved.prevKey}
        nextKey={resolved.nextKey}
      />

      {add ? <AddFoodStubBanner meal={add} dateKey={pathKey} /> : null}

      <DayTotalsCard totals={day.totals} />

      <section className="space-y-3">
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
    </div>
  );
}
