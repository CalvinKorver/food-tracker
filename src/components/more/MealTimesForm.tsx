"use client";

import { useState, useTransition } from "react";
import { saveMealWindowsAction } from "@/app/more/actions";
import type { MealWindows } from "@/lib/meal-windows";

const ROWS = [
  { meal: "Breakfast", startName: "breakfastStart", endName: "breakfastEnd" },
  { meal: "Lunch", startName: "lunchStart", endName: "lunchEnd" },
  { meal: "Dinner", startName: "dinnerStart", endName: "dinnerEnd" },
] as const;

type MealTimesFormProps = {
  initial: MealWindows;
};

export function MealTimesForm({ initial }: MealTimesFormProps) {
  const [values, setValues] = useState({
    breakfastStart: initial.breakfast.start,
    breakfastEnd: initial.breakfast.end,
    lunchStart: initial.lunch.start,
    lunchEnd: initial.lunch.end,
    dinnerStart: initial.dinner.start,
    dinnerEnd: initial.dinner.end,
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveMealWindowsAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
            <span className="text-[17px] text-text">{meal}</span>
            <input
              type="time"
              name={startName}
              required
              value={values[startName]}
              onChange={(e) =>
                setValues((v) => ({ ...v, [startName]: e.target.value }))
              }
              className="w-full rounded-lg border border-border bg-bg px-1.5 py-2 text-sm tabular-nums text-text outline-none focus:border-accent"
            />
            <input
              type="time"
              name={endName}
              required
              value={values[endName]}
              onChange={(e) =>
                setValues((v) => ({ ...v, [endName]: e.target.value }))
              }
              className="w-full rounded-lg border border-border bg-bg px-1.5 py-2 text-sm tabular-nums text-text outline-none focus:border-accent"
            />
          </div>
        ))}
      </div>

      <p className="text-sm text-text-muted">
        Times outside these windows count as snack.
      </p>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {saved ? <p className="text-sm text-text-muted">Meal times saved.</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-accent px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save meal times"}
      </button>
    </form>
  );
}
