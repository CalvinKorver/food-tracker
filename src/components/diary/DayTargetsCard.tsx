import { formatNutrient, type DayTotals } from "@/lib/nutrients";
import { goalPercent, type UserGoals } from "@/lib/goals";

type NutrientKey = "energy" | "protein" | "carbs" | "fat";

type DayTargetsCardProps = {
  totals: DayTotals;
  goals: UserGoals | null;
};

const ROWS: {
  key: NutrientKey;
  label: string;
  unit: string;
  current: (totals: DayTotals) => number;
  goal: (goals: UserGoals) => number;
}[] = [
  {
    key: "energy",
    label: "Energy",
    unit: "kcal",
    current: (t) => t.calories,
    goal: (g) => g.calorieGoal,
  },
  {
    key: "protein",
    label: "Protein",
    unit: "g",
    current: (t) => t.proteinG,
    goal: (g) => g.proteinGoalG,
  },
  {
    key: "carbs",
    label: "Net Carbs",
    unit: "g",
    current: (t) => t.netCarbsG,
    goal: (g) => g.carbsGoalG,
  },
  {
    key: "fat",
    label: "Fat",
    unit: "g",
    current: (t) => t.fatG,
    goal: (g) => g.fatGoalG,
  },
];

export function DayTargetsCard({ totals, goals }: DayTargetsCardProps) {
  return (
    <section className="rounded-xl bg-surface px-4 py-3.5">
      <ul className="flex flex-col gap-3.5">
        {ROWS.map((row) => {
          const current = row.current(totals);
          const goalValue = goals ? row.goal(goals) : null;
          const hasGoal = goalValue != null && goalValue > 0;
          const percent = goalPercent(current, goalValue);
          const goalLabel = hasGoal
            ? formatNutrient(goalValue)
            : "—";

          return (
            <li key={row.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-[15px]">
                <p className="min-w-0">
                  <span className="font-semibold text-text">{row.label}</span>
                  <span className="text-text-muted">
                    {" "}
                    – {formatNutrient(current)} / {goalLabel} {row.unit}
                  </span>
                </p>
                <span className="shrink-0 tabular-nums text-text-muted">
                  {percent}%
                </span>
              </div>
              <progress
                className={`nutrient-progress nutrient-progress--${row.key}`}
                value={hasGoal ? current : 0}
                max={hasGoal ? goalValue : 1}
                aria-label={`${row.label} ${percent}%`}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
