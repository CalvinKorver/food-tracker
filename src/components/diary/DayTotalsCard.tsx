import { formatNutrient, type DayTotals } from "@/lib/nutrients";

type DayTotalsCardProps = {
  totals: DayTotals;
};

export function DayTotalsCard({ totals }: DayTotalsCardProps) {
  const rows: [string, string][] = [
    ["Energy", `${formatNutrient(totals.calories)} kcal`],
    ["Protein", `${formatNutrient(totals.proteinG)} g`],
    ["Net Carbs", `${formatNutrient(totals.netCarbsG)} g`],
    ["Fat", `${formatNutrient(totals.fatG)} g`],
    ["Sodium", `${formatNutrient(totals.sodiumMg, 0)} mg`],
  ];

  return (
    <section className="rounded-2xl bg-surface px-4 py-3">
      <div className="mb-1.5 text-base font-bold tracking-tight text-text">
        Totals
      </div>
      <ul className="space-y-1 text-sm leading-snug">
        {rows.map(([name, value]) => (
          <li key={name} className="flex items-center justify-between">
            <span className="text-text-muted">{name}</span>
            <span className="font-medium tabular-nums">{value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
