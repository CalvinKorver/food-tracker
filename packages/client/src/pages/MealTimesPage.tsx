import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { DEFAULT_MEAL_WINDOWS } from "@food-tracker/domain";
import { useAuth } from "../auth";
import { useApi } from "../config";

const ROWS = [
  { meal: "Breakfast", startName: "breakfastStart", endName: "breakfastEnd" },
  { meal: "Lunch", startName: "lunchStart", endName: "lunchEnd" },
  { meal: "Dinner", startName: "dinnerStart", endName: "dinnerEnd" },
] as const;

export function MealTimesPage() {
  const { user, refreshUser } = useAuth();
  const api = useApi();
  const initial = user?.mealWindows ?? DEFAULT_MEAL_WINDOWS;
  const [values, setValues] = useState({
    breakfastStart: initial.breakfast.start,
    breakfastEnd: initial.breakfast.end,
    lunchStart: initial.lunch.start,
    lunchEnd: initial.lunch.end,
    dinnerStart: initial.dinner.start,
    dinnerEnd: initial.dinner.end,
  });
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () => api.saveMealWindows(values),
    onSuccess: async () => {
      setSaved(true);
      await refreshUser();
    },
  });

  return (
    <div className="flex flex-col gap-6 pt-1">
      <div className="flex items-center gap-2">
        <Link
          to="/more"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-text-muted hover:bg-surface-hover"
          aria-label="Back to More"
        >
          ←
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">Meal times</h1>
      </div>
      <p className="text-sm text-text-muted">
        Used to pre-select a meal when you add food. Times outside these windows
        count as snack.
      </p>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          save.mutate();
        }}
      >
        <div className="overflow-hidden rounded-xl bg-surface">
          <div className="grid grid-cols-[1fr_5.5rem_5.5rem] gap-2 border-b border-border px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted">
            <span>Meal</span>
            <span>Start</span>
            <span>End</span>
          </div>
          {ROWS.map(({ meal, startName, endName }) => (
            <div
              key={meal}
              className="grid grid-cols-[1fr_5.5rem_5.5rem] items-center gap-2 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span className="text-[17px]">{meal}</span>
              <input
                type="time"
                required
                value={values[startName]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [startName]: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-bg px-1.5 py-2 text-sm tabular-nums outline-none focus:border-accent"
              />
              <input
                type="time"
                required
                value={values[endName]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [endName]: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-bg px-1.5 py-2 text-sm tabular-nums outline-none focus:border-accent"
              />
            </div>
          ))}
        </div>
        {save.error ? (
          <p className="text-sm text-danger">{(save.error as Error).message}</p>
        ) : null}
        {saved ? <p className="text-sm text-text-muted">Meal times saved.</p> : null}
        <button
          type="submit"
          disabled={save.isPending}
          className="rounded-xl bg-accent px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save meal times"}
        </button>
      </form>
    </div>
  );
}
