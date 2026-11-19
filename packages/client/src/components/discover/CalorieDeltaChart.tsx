import { useState } from "react";
import { Link } from "react-router-dom";
import type { DiscoverDayDto } from "@food-tracker/contracts";
import {
  computeDivergingScale,
  formatSignedCalories,
} from "@food-tracker/domain";

type CalorieDeltaChartProps = {
  days: DiscoverDayDto[];
  calorieGoal: number;
  avgCalorieDelta: number | null;
  totalCalorieDelta: number | null;
  loggedDaysCount: number;
};

function defaultSelectedKey(days: DiscoverDayDto[]): string {
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i]?.logged) return days[i]!.dateKey;
  }
  return days[days.length - 1]?.dateKey ?? "";
}

export function CalorieDeltaChart({
  days,
  calorieGoal,
  avgCalorieDelta,
  totalCalorieDelta,
  loggedDaysCount,
}: CalorieDeltaChartProps) {
  const [pickedKey, setPickedKey] = useState<string | null>(null);

  const activeKey =
    pickedKey && days.some((d) => d.dateKey === pickedKey)
      ? pickedKey
      : defaultSelectedKey(days);
  const selectedDay =
    days.find((d) => d.dateKey === activeKey) ?? days[days.length - 1] ?? null;

  const scale = computeDivergingScale(days.map((d) => d.calorieDelta));
  const roundedAvg =
    avgCalorieDelta != null ? Math.round(avgCalorieDelta) : null;

  const kpiLabel =
    roundedAvg == null
      ? "Avg Daily Balance"
      : roundedAvg < 0
        ? "Avg Daily Deficit"
        : roundedAvg > 0
          ? "Avg Daily Surplus"
          : "On Target";

  const kpiColor =
    roundedAvg == null || roundedAvg === 0
      ? "var(--text)"
      : roundedAvg < 0
        ? "var(--accent-teal)"
        : "var(--nutrient-carbs)";

  return (
    <section className="rounded-xl bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
            {kpiLabel}
          </p>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span
              className="text-2xl font-semibold tracking-tight tabular-nums"
              style={{ color: kpiColor }}
            >
              {avgCalorieDelta != null
                ? `${formatSignedCalories(avgCalorieDelta)} kcal`
                : "— kcal"}
            </span>
            {avgCalorieDelta != null ? (
              <span className="text-xs text-text-muted">/ day</span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[13px] tabular-nums text-text-muted">
            Goal {Math.round(calorieGoal).toLocaleString("en-US")} kcal/day
            {totalCalorieDelta != null && loggedDaysCount > 0
              ? ` · Net ${formatSignedCalories(totalCalorieDelta)} kcal`
              : ""}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 pt-0.5 text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--nutrient-carbs)" }}
            />
            Surplus
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--accent-teal)" }}
            />
            Deficit
          </span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <div
          className="flex h-44 w-11 shrink-0 flex-col justify-between py-0.5 text-right text-[11px] tabular-nums text-text-muted"
          aria-hidden
        >
          <span>+{scale.toLocaleString("en-US")}</span>
          <span className="font-medium">Goal</span>
          <span>-{scale.toLocaleString("en-US")}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-44 border-y border-border/70">
            <div
              className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-px border-t border-dashed border-text-muted/50"
              aria-hidden
            />

            <div
              className="grid h-full grid-cols-7 gap-1.5"
              role="listbox"
              aria-label="7-day calorie surplus and deficit"
            >
              {days.map((day) => {
                const isSelected = day.dateKey === selectedDay?.dateKey;
                const delta = day.calorieDelta;
                const roundedDelta = delta != null ? Math.round(delta) : null;
                const pct =
                  delta != null
                    ? Math.min(100, Math.max(6, (Math.abs(delta) / scale) * 100))
                    : 0;

                return (
                  <button
                    key={day.dateKey}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    aria-label={
                      day.logged && roundedDelta != null
                        ? `${day.weekdayLabel} ${day.shortDateLabel}: ${formatSignedCalories(roundedDelta)} kcal`
                        : `${day.weekdayLabel} ${day.shortDateLabel}: not logged`
                    }
                    onClick={() => setPickedKey(day.dateKey)}
                    className={`group relative flex h-full flex-col rounded-lg px-1 transition-colors focus:outline-none ${
                      isSelected
                        ? "bg-surface-hover/65"
                        : "hover:bg-surface-hover/35"
                    }`}
                  >
                    <div className=" flex w-full flex-1 items-end justify-center pb-[1px]">
                      {day.logged && roundedDelta != null && roundedDelta > 0 ? (
                        <div
                          className="w-full max-w-[1.35rem] rounded-t-md transition-all"
                          style={{
                            height: `${pct}%`,
                            backgroundColor: "var(--nutrient-carbs)",
                            opacity: isSelected ? 1 : 0.85,
                          }}
                        />
                      ) : null}
                    </div>

                    <div className="flex w-full flex-1 items-start justify-center pt-[1px]">
                      {day.logged && roundedDelta != null && roundedDelta < 0 ? (
                        <div
                          className="w-full max-w-[1.35rem] rounded-b-md transition-all"
                          style={{
                            height: `${pct}%`,
                            backgroundColor: "var(--accent-teal)",
                            opacity: isSelected ? 1 : 0.85,
                          }}
                        />
                      ) : null}
                    </div>

                    {day.logged && roundedDelta === 0 ? (
                      <span
                        className="pointer-events-none absolute inset-x-2 top-1/2 mx-auto h-1 max-w-[1.35rem] -translate-y-1/2 rounded-full"
                        style={{ backgroundColor: "var(--accent-teal)" }}
                      />
                    ) : null}

                    {!day.logged ? (
                      <span
                        className="pointer-events-none absolute inset-x-2 top-1/2 mx-auto h-0.5 w-3.5 -translate-y-1/2 rounded-full bg-text-muted/40"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {days.map((day) => {
              const isSelected = day.dateKey === selectedDay?.dateKey;
              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => setPickedKey(day.dateKey)}
                  className={`rounded py-0.5 text-center text-[12px] transition-colors ${
                    isSelected
                      ? "font-semibold text-text"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {day.weekdayLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedDay ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-bg/60 px-3 py-2 text-[13px]">
          <p className="min-w-0 truncate tabular-nums">
            <span className="font-medium text-text">
              {selectedDay.weekdayLabel}, {selectedDay.shortDateLabel}
            </span>
            {selectedDay.logged ? (
              <span className="text-text-muted">
                {" · "}
                {Math.round(selectedDay.totals.calories).toLocaleString("en-US")}
                {" / "}
                {Math.round(calorieGoal).toLocaleString("en-US")} kcal (
                <span
                  className="font-medium"
                  style={{
                    color:
                      selectedDay.calorieDelta != null &&
                      Math.round(selectedDay.calorieDelta) <= 0
                        ? "var(--accent-teal)"
                        : "var(--nutrient-carbs)",
                  }}
                >
                  {selectedDay.calorieDelta != null
                    ? `${formatSignedCalories(selectedDay.calorieDelta)} kcal`
                    : "0 kcal"}
                </span>
                )
              </span>
            ) : (
              <span className="text-text-muted"> · Not logged</span>
            )}
          </p>
          <Link
            to={`/diary/${selectedDay.dateKey}`}
            className="shrink-0 font-medium text-accent"
          >
            Diary →
          </Link>
        </div>
      ) : null}
    </section>
  );
}
