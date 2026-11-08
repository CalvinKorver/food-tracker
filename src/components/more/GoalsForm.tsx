"use client";

import { useMemo, useState, useTransition } from "react";
import { saveGoalsAction } from "@/app/more/actions";
import { macroCalories, macroPercents, type UserGoals } from "@/lib/goals";

type GoalsFormProps = {
  initial: UserGoals | null;
};

function Field({
  label,
  name,
  value,
  onChange,
  unit,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <input
          name={name}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-base tabular-nums text-text outline-none focus:border-accent"
        />
        <span className="shrink-0 text-sm text-text-muted">{unit}</span>
      </div>
    </label>
  );
}

function numOrEmpty(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return String(n);
}

export function GoalsForm({ initial }: GoalsFormProps) {
  const [calorieGoal, setCalorieGoal] = useState(numOrEmpty(initial?.calorieGoal));
  const [proteinGoalG, setProteinGoalG] = useState(
    numOrEmpty(initial?.proteinGoalG),
  );
  const [carbsGoalG, setCarbsGoalG] = useState(numOrEmpty(initial?.carbsGoalG));
  const [fatGoalG, setFatGoalG] = useState(numOrEmpty(initial?.fatGoalG));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const preview = useMemo(() => {
    const cal = Number(calorieGoal);
    const p = Number(proteinGoalG);
    const c = Number(carbsGoalG);
    const f = Number(fatGoalG);
    if (![cal, p, c, f].every((n) => Number.isFinite(n) && n >= 0) || !(cal > 0)) {
      return null;
    }
    const macros = macroCalories(p, c, f);
    const pct = macroPercents(cal, p, c, f);
    return { macros, pct };
  }, [calorieGoal, proteinGoalG, carbsGoalG, fatGoalG]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveGoalsAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field
        label="Daily calories"
        name="calorieGoal"
        value={calorieGoal}
        onChange={setCalorieGoal}
        unit="kcal"
      />
      <Field
        label="Protein"
        name="proteinGoalG"
        value={proteinGoalG}
        onChange={setProteinGoalG}
        unit="g"
      />
      <Field
        label="Carbs"
        name="carbsGoalG"
        value={carbsGoalG}
        onChange={setCarbsGoalG}
        unit="g"
      />
      <Field
        label="Fat"
        name="fatGoalG"
        value={fatGoalG}
        onChange={setFatGoalG}
        unit="g"
      />

      {preview ? (
        <p className="text-sm text-text-muted">
          Macros = {Math.round(preview.macros)} kcal (
          {Math.round(preview.pct.proteinPct)}% /{" "}
          {Math.round(preview.pct.carbsPct)}% /{" "}
          {Math.round(preview.pct.fatPct)}%)
        </p>
      ) : (
        <p className="text-sm text-text-muted">
          Enter calories and grams so macros add up to ~100% of calories.
        </p>
      )}

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {saved ? <p className="text-sm text-text-muted">Goals saved.</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-accent px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save goals"}
      </button>
    </form>
  );
}
