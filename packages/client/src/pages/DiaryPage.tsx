import { useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  formatNutrient,
  formatQuantityLabel,
  goalPercent,
  isMealType,
  type MealType,
} from "@food-tracker/domain";
import type {
  DayTotals,
  DiaryEntryDto,
  FoodListItem,
  UserGoals,
} from "@food-tracker/contracts";
import { useAuth } from "../auth";
import { useApi } from "../config";
import { AddFoodSheet } from "../components/foods/AddFoodSheet";
import { CalorieNagConcedeModal } from "../components/foods/CalorieNagConcedeModal";
import { SwipeToDeleteRow } from "../components/ui/SwipeToDeleteRow";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="12"
      height="20"
      viewBox="0 0 12 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={direction === "left" ? "M10 2 2 10l8 8" : "M2 2l8 8-8 8"} />
    </svg>
  );
}

function DayTargetsCard({
  totals,
  goals,
}: {
  totals: DayTotals;
  goals: UserGoals | null;
}) {
  const rows = [
    {
      key: "energy",
      label: "Energy",
      unit: "kcal",
      current: totals.calories,
      goal: goals?.calorieGoal,
    },
    {
      key: "protein",
      label: "Protein",
      unit: "g",
      current: totals.proteinG,
      goal: goals?.proteinGoalG,
    },
    {
      key: "carbs",
      label: "Net Carbs",
      unit: "g",
      current: totals.netCarbsG,
      goal: goals?.carbsGoalG,
    },
    {
      key: "fat",
      label: "Fat",
      unit: "g",
      current: totals.fatG,
      goal: goals?.fatGoalG,
    },
  ] as const;

  return (
    <section className="rounded-xl bg-surface px-4 py-3.5">
      <ul className="flex flex-col gap-3.5">
        {rows.map((row) => {
          const hasGoal = row.goal != null && row.goal > 0;
          const percent = goalPercent(row.current, row.goal);
          return (
            <li key={row.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-[15px]">
                <p className="min-w-0">
                  <span className="font-semibold text-text">{row.label}</span>
                  <span className="text-text-muted">
                    {" "}
                    – {formatNutrient(row.current)} /{" "}
                    {hasGoal ? formatNutrient(row.goal!) : "—"} {row.unit}
                  </span>
                </p>
                <span className="shrink-0 tabular-nums text-text-muted">
                  {percent}%
                </span>
              </div>
              <progress
                className={`nutrient-progress nutrient-progress--${row.key}`}
                value={hasGoal ? row.current : 0}
                max={hasGoal ? row.goal : 1}
                aria-label={`${row.label} ${percent}%`}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EntryRow({
  entry,
  dateKey,
  onEdit,
}: {
  entry: DiaryEntryDto;
  dateKey: string;
  onEdit: (entry: DiaryEntryDto) => void;
}) {
  const api = useApi();
  const queryClient = useQueryClient();
  const del = useMutation({
    mutationFn: () => api.deleteEntry(entry.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["diary", dateKey] }),
        queryClient.invalidateQueries({ queryKey: ["discover"] }),
      ]);
    },
  });

  return (
    <SwipeToDeleteRow
      onDelete={() => del.mutateAsync()}
      onEdit={() => onEdit(entry)}
      disabled={del.isPending}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] leading-snug text-text">
            {entry.foodNameSnapshot}
          </div>
          <div className="text-[13px] leading-snug text-text-muted">
            {formatQuantityLabel(entry.quantityValue, entry.quantityUnit)}
          </div>
        </div>
        <div className="shrink-0 text-right text-[15px] tabular-nums">
          {Math.ceil(entry.caloriesSnapshot)} cal
        </div>
      </div>
    </SwipeToDeleteRow>
  );
}

export function DiaryPage() {
  const { date = "today" } = useParams();
  const [search] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const api = useApi();
  const { user } = useAuth();
  const [editingEntry, setEditingEntry] = useState<DiaryEntryDto | null>(null);
  const add = search.get("add");
  const addMeal: MealType | null =
    editingEntry
      ? null
      : add && isMealType(add)
        ? add
        : add
          ? "snack"
          : null;
  const foodId = search.get("foodId");
  const selectedFood = (
    location.state as { selectedFood?: FoodListItem } | null
  )?.selectedFood;
  const initialFood =
    selectedFood && (!foodId || selectedFood.id === foodId)
      ? selectedFood
      : null;
  const nagConceded = search.get("nagConceded") === "1";

  const diary = useQuery({
    queryKey: ["diary", date],
    queryFn: () => api.getDiary(date),
  });

  if (diary.isError) {
    const message = (diary.error as Error).message;
    if (/invalid date/i.test(message)) return <Navigate to="/diary/today" replace />;
  }

  const day = diary.data;
  const calorieNag =
    user && day
      ? {
          enabled: user.calorieNagEnabled,
          dayCalories: day.totals.calories,
          dayProteinG: day.totals.proteinG,
          dayFatG: day.totals.fatG,
          calorieGoal: user.goals?.calorieGoal ?? null,
          proteinGoalG: user.goals?.proteinGoalG ?? null,
          fatGoalG: user.goals?.fatGoalG ?? null,
        }
      : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-center gap-6">
        <Link
          to={`/diary/${day?.prevKey ?? "today"}`}
          className="flex h-8 w-8 items-center justify-center text-accent"
          aria-label="Previous day"
        >
          <Chevron direction="left" />
        </Link>
        <h1 className="min-w-[8rem] text-center text-[17px] font-semibold">
          {day?.label ?? "Diary"}
        </h1>
        <Link
          to={`/diary/${day?.nextKey ?? "today"}`}
          className="flex h-8 w-8 items-center justify-center text-accent"
          aria-label="Next day"
        >
          <Chevron direction="right" />
        </Link>
      </header>

      {diary.isLoading ? (
        <p className="text-sm text-text-muted">Loading diary…</p>
      ) : day ? (
        <>
          <DayTargetsCard totals={day.totals} goals={user?.goals ?? null} />
          <div className="space-y-4">
            {day.meals.map((group) => (
              <section key={group.meal}>
                <h2 className="px-4 pb-2 text-[13px] font-medium uppercase tracking-wide text-text-muted">
                  {group.label}
                </h2>
                <div className="divide-y divide-border overflow-hidden rounded-xl bg-surface">
                  {group.entries.length === 0 ? (
                    <p className="px-4 py-3 text-[15px] text-text-muted">
                      No foods logged
                    </p>
                  ) : (
                    group.entries.map((entry) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        dateKey={date}
                        onEdit={setEditingEntry}
                      />
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : null}

      {editingEntry ? (
        <AddFoodSheet
          dateKey={date}
          loggedOnKey={day?.dateKey ?? date}
          meal={editingEntry.meal}
          editEntry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onCreatedCustom={() => undefined}
        />
      ) : addMeal ? (
        <AddFoodSheet
          dateKey={date}
          loggedOnKey={day?.dateKey ?? date}
          meal={addMeal}
          initialFoodId={foodId}
          initialFood={initialFood}
          calorieNag={calorieNag}
          onClose={(opts) =>
            navigate(
              opts?.nagConceded
                ? `/diary/${date}?nagConceded=1`
                : `/diary/${date}`,
              { replace: true },
            )
          }
          onCreatedCustom={() =>
            navigate("/foods/new", {
              state: { returnTo: `/diary/${date}?add=${addMeal}` },
            })
          }
        />
      ) : null}
      {!addMeal && !editingEntry && nagConceded ? (
        <CalorieNagConcedeModal
          onDismiss={() => navigate(`/diary/${date}`, { replace: true })}
        />
      ) : null}
    </div>
  );
}
