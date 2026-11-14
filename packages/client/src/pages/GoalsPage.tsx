import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { macroCalories, macroPercents } from "@food-tracker/domain";
import { useAuth } from "../auth";
import { useApi } from "../config";

function Field({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-base tabular-nums outline-none focus:border-accent"
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

export function GoalsPage() {
  const { user, refreshUser } = useAuth();
  const api = useApi();
  const initial = user?.goals ?? null;
  const [calorieGoal, setCalorieGoal] = useState(numOrEmpty(initial?.calorieGoal));
  const [proteinGoalG, setProteinGoalG] = useState(numOrEmpty(initial?.proteinGoalG));
  const [carbsGoalG, setCarbsGoalG] = useState(numOrEmpty(initial?.carbsGoalG));
  const [fatGoalG, setFatGoalG] = useState(numOrEmpty(initial?.fatGoalG));
  const [saved, setSaved] = useState(false);

  const preview = useMemo(() => {
    const cal = Number(calorieGoal);
    const p = Number(proteinGoalG);
    const c = Number(carbsGoalG);
    const f = Number(fatGoalG);
    if (![cal, p, c, f].every((n) => Number.isFinite(n) && n >= 0) || !(cal > 0)) {
      return null;
    }
    return { macros: macroCalories(p, c, f), pct: macroPercents(cal, p, c, f) };
  }, [calorieGoal, proteinGoalG, carbsGoalG, fatGoalG]);

  const save = useMutation({
    mutationFn: () =>
      api.saveGoals({
        calorieGoal: Number(calorieGoal),
        proteinGoalG: Number(proteinGoalG),
        carbsGoalG: Number(carbsGoalG),
        fatGoalG: Number(fatGoalG),
      }),
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
        <h1 className="text-lg font-semibold tracking-tight">Goals</h1>
      </div>
      <p className="text-sm text-text-muted">
        Set daily calorie and macro targets. Macro calories should add up to your
        calorie goal.
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          save.mutate();
        }}
      >
        <Field label="Daily calories" value={calorieGoal} onChange={setCalorieGoal} unit="kcal" />
        <Field label="Protein" value={proteinGoalG} onChange={setProteinGoalG} unit="g" />
        <Field label="Carbs" value={carbsGoalG} onChange={setCarbsGoalG} unit="g" />
        <Field label="Fat" value={fatGoalG} onChange={setFatGoalG} unit="g" />
        {preview ? (
          <p className="text-sm text-text-muted">
            Macros = {Math.round(preview.macros)} kcal (
            {Math.round(preview.pct.proteinPct)}% /{" "}
            {Math.round(preview.pct.carbsPct)}% / {Math.round(preview.pct.fatPct)}%)
          </p>
        ) : (
          <p className="text-sm text-text-muted">
            Enter calories and grams so macros add up to ~100% of calories.
          </p>
        )}
        {save.error ? (
          <p className="text-sm text-danger">{(save.error as Error).message}</p>
        ) : null}
        {saved ? <p className="text-sm text-text-muted">Goals saved.</p> : null}
        <button
          type="submit"
          disabled={save.isPending}
          className="mt-1 rounded-xl bg-accent px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save goals"}
        </button>
      </form>
    </div>
  );
}
