"use client";

import { useMemo, useState } from "react";
import { formatNutrient, netCarbs } from "@/lib/nutrients";

export type ConfirmationNutrients = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
};

export type ServingOption = {
  id: string;
  label: string;
  /** Multiplier against the provided per-serving nutrients. */
  multiplier: number;
};

type NutritionConfirmationProps = {
  title: string;
  nutrients: ConfirmationNutrients;
  servingOptions: ServingOption[];
  saveLabel?: string;
  pending?: boolean;
  error?: string | null;
  onBack: () => void;
  onSave: () => void;
};

const PROTEIN_COLOR = "#30d158";
const CARBS_COLOR = "#64d2ff";
const FAT_COLOR = "#bf5af2";

function Donut({
  proteinCal,
  carbsCal,
  fatCal,
  calories,
}: {
  proteinCal: number;
  carbsCal: number;
  fatCal: number;
  calories: number;
}) {
  const total = proteinCal + carbsCal + fatCal;
  const size = 120;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const segments =
    total <= 0
      ? [{ color: "var(--border)", length: c }]
      : [
          { color: PROTEIN_COLOR, length: (proteinCal / total) * c },
          { color: CARBS_COLOR, length: (carbsCal / total) * c },
          { color: FAT_COLOR, length: (fatCal / total) * c },
        ];

  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map((seg, i) => {
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${seg.length} ${c - seg.length}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += seg.length;
          return el;
        })}
      </g>
      <text
        x="50%"
        y="48%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-text text-[18px] font-semibold"
      >
        {formatNutrient(calories, 0)}
      </text>
      <text
        x="50%"
        y="62%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-text-muted text-[11px]"
      >
        kcal
      </text>
    </svg>
  );
}

export function NutritionConfirmation({
  title,
  nutrients,
  servingOptions,
  saveLabel = "Save",
  pending = false,
  error = null,
  onBack,
  onSave,
}: NutritionConfirmationProps) {
  const [servingId, setServingId] = useState(servingOptions[0]?.id ?? "");
  const option =
    servingOptions.find((o) => o.id === servingId) ?? servingOptions[0];
  const m = option?.multiplier ?? 1;

  const shown = useMemo(() => {
    const proteinG = nutrients.proteinG * m;
    const carbsG = nutrients.carbsG * m;
    const fatG = nutrients.fatG * m;
    const fiberG = nutrients.fiberG * m;
    const netCarbsG = netCarbs(carbsG, fiberG);
    const calories = nutrients.calories * m;
    const proteinCal = proteinG * 4;
    const carbsCal = netCarbsG * 4;
    const fatCal = fatG * 9;
    const macroCal = proteinCal + carbsCal + fatCal;
    const pct = (part: number) =>
      macroCal <= 0 ? 0 : Math.round((part / macroCal) * 100);

    return {
      calories,
      proteinG,
      netCarbsG,
      fatG,
      sodiumMg: nutrients.sodiumMg * m,
      proteinCal,
      carbsCal,
      fatCal,
      proteinPct: pct(proteinCal),
      carbsPct: pct(carbsCal),
      fatPct: pct(fatCal),
    };
  }, [nutrients, m]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <h2 className="mb-4 text-center text-xl font-semibold">{title}</h2>

        <label className="mb-4 block rounded-xl bg-surface px-4 py-3">
          <span className="mb-1.5 block text-sm text-text-muted">
            Serving Size
          </span>
          <select
            value={option?.id}
            onChange={(e) => setServingId(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-base text-text outline-none focus:border-accent"
          >
            {servingOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <section className="rounded-xl bg-surface px-4 py-4">
          <h3 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-text-muted">
            Energy Summary
          </h3>
          <div className="flex items-center gap-4">
            <Donut
              proteinCal={shown.proteinCal}
              carbsCal={shown.carbsCal}
              fatCal={shown.fatCal}
              calories={shown.calories}
            />
            <ul className="min-w-0 flex-1 space-y-2 text-[15px]">
              <li className="flex justify-between gap-2">
                <span style={{ color: PROTEIN_COLOR }}>
                  Protein ({shown.proteinPct}%)
                </span>
                <span className="tabular-nums text-text">
                  {formatNutrient(shown.proteinG)} g
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span style={{ color: CARBS_COLOR }}>
                  Net Carbs ({shown.carbsPct}%)
                </span>
                <span className="tabular-nums text-text">
                  {formatNutrient(shown.netCarbsG)} g
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span style={{ color: FAT_COLOR }}>Fat ({shown.fatPct}%)</span>
                <span className="tabular-nums text-text">
                  {formatNutrient(shown.fatG)} g
                </span>
              </li>
              <li className="flex justify-between gap-2 border-t border-border pt-2">
                <span className="text-text-muted">Sodium</span>
                <span className="tabular-nums text-text">
                  {formatNutrient(shown.sodiumMg, 0)} mg
                </span>
              </li>
            </ul>
          </div>
        </section>

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </div>

      <div className="flex gap-3 border-t border-border p-4">
        <button
          type="button"
          onClick={onBack}
          disabled={pending}
          className="flex-1 rounded-2xl border border-border py-3.5 text-base font-semibold text-text transition hover:bg-surface disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="flex-1 rounded-2xl bg-accent py-3.5 text-base font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}
