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
    <section className="rounded-xl bg-surface px-4 py-3.5">
      <h2 className="mb-2 text-[17px] font-semibold text-text">Totals</h2>
      <ul className="space-y-1.5 text-[15px]">
        {rows.map(([name, value]) => (
          <li key={name} className="flex items-center justify-between">
            <span className="text-text-muted">{name}</span>
            <span className="tabular-nums text-text">{value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
