import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type {
  DiscoverSummaryDto,
  DiscoverWindowDto,
} from "@food-tracker/contracts";
import { formatNutrient } from "@food-tracker/domain";
import { useApi } from "../config";
import { CalorieDeltaChart } from "../components/discover/CalorieDeltaChart";

function buildDeterministicFallback(window: DiscoverWindowDto): string | null {
  if (!window.averages || window.loggedDaysCount === 0) return null;
  const daysPhrase =
    window.loggedDaysCount === 7
      ? "Over the last 7 days"
      : `Over ${window.loggedDaysCount} logged ${window.loggedDaysCount === 1 ? "day" : "days"}`;
  const cal = Math.round(window.averages.calories).toLocaleString("en-US");
  const p = formatNutrient(window.averages.proteinG, 0);
  const c = formatNutrient(window.averages.netCarbsG, 0);
  const f = formatNutrient(window.averages.fatG, 0);

  if (window.avgCalorieDelta != null) {
    const rounded = Math.round(window.avgCalorieDelta);
    const balancePhrase =
      rounded === 0
        ? "right on your daily calorie target"
        : `${Math.abs(rounded).toLocaleString("en-US")} kcal/day ${rounded < 0 ? "below" : "above"} your goal`;
    return `${daysPhrase}, you averaged ${cal} kcal (${balancePhrase}). Daily macros averaged ${p}g protein, ${c}g net carbs, and ${f}g fat.`;
  }

  return `${daysPhrase}, you averaged ${cal} kcal per day with ${p}g protein, ${c}g net carbs, and ${f}g fat.`;
}

function SummaryCard({
  window,
  summary,
  loadingSummary,
}: {
  window: DiscoverWindowDto;
  summary: DiscoverSummaryDto | undefined;
  loadingSummary: boolean;
}) {
  const fallbackText = buildDeterministicFallback(window);
  const readyText =
    summary?.status === "ready" && summary.summary ? summary.summary : null;

  const macroItems = window.averages
    ? [
        {
          label: "Avg Cal",
          value: `${Math.round(window.averages.calories).toLocaleString("en-US")}`,
          unit: "kcal",
          color: "var(--nutrient-energy)",
        },
        {
          label: "Protein",
          value: formatNutrient(window.averages.proteinG, 0),
          unit: "g",
          color: "var(--nutrient-protein)",
        },
        {
          label: "Net Carbs",
          value: formatNutrient(window.averages.netCarbsG, 0),
          unit: "g",
          color: "var(--nutrient-carbs)",
        },
        {
          label: "Fat",
          value: formatNutrient(window.averages.fatG, 0),
          unit: "g",
          color: "var(--nutrient-fat)",
        },
      ]
    : null;

  return (
    <section className="rounded-xl bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
          7-Day Summary
        </h2>
        <span className="rounded-full bg-surface-hover px-2.5 py-0.5 text-[12px] font-medium tabular-nums text-text-muted">
          {window.loggedDaysCount} of 7 days logged
        </span>
      </div>

      <div className="mt-2.5">
        {window.loggedDaysCount === 0 ? (
          <p className="text-[15px] leading-relaxed text-text-muted">
            No completed days logged over the past week yet.{" "}
            <Link to="/diary/today" className="font-medium text-accent">
              Log meals in your diary →
            </Link>
          </p>
        ) : loadingSummary ? (
          <div
            className="flex animate-pulse flex-col gap-2 py-0.5"
            aria-label="Generating 7-day summary"
          >
            <div className="h-3.5 w-full rounded bg-surface-hover" />
            <div className="h-3.5 w-11/12 rounded bg-surface-hover" />
            <div className="h-3.5 w-3/4 rounded bg-surface-hover" />
          </div>
        ) : (
          <p className="text-[15px] leading-relaxed text-text">
            {readyText ?? fallbackText}
          </p>
        )}
      </div>

      {macroItems ? (
        <div className="mt-3.5 grid grid-cols-4 gap-2 border-t border-border pt-3">
          {macroItems.map((item) => (
            <div key={item.label} className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.label}</span>
              </div>
              <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-text">
                {item.value}
                <span className="ml-0.5 text-[12px] font-normal text-text-muted">
                  {item.unit}
                </span>
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function NoCalorieGoalCard() {
  return (
    <section className="rounded-xl bg-surface p-4">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
        Calorie Balance
      </p>
      <p className="mt-1.5 text-[15px] leading-relaxed text-text-muted">
        Set a daily calorie target to track your 7-day surplus or deficit and
        average daily balance.
      </p>
      <Link
        to="/more/goals"
        className="mt-3 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"
      >
        Set calorie goal
      </Link>
    </section>
  );
}

export function DiscoverPage() {
  const api = useApi();

  const discover = useQuery({
    queryKey: ["discover", "window"],
    queryFn: () => api.getDiscover(),
  });

  const summary = useQuery({
    queryKey: ["discover", "summary"],
    queryFn: () => api.getDiscoverSummary(),
  });

  return (
    <div className="flex flex-col gap-4 pt-1">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Discover</h1>
        {discover.data ? (
          <span className="text-[13px] tabular-nums text-text-muted">
            {discover.data.rangeLabel}
          </span>
        ) : null}
      </header>

      {discover.isLoading ? (
        <div className="flex flex-col gap-4">
          <div className="h-36 animate-pulse rounded-xl bg-surface" />
          <div className="h-72 animate-pulse rounded-xl bg-surface" />
        </div>
      ) : discover.isError ? (
        <p className="rounded-xl bg-danger/15 px-4 py-3 text-sm text-danger">
          {(discover.error as Error).message || "Could not load Discover."}
        </p>
      ) : discover.data ? (
        <>
          <SummaryCard
            window={discover.data}
            summary={summary.data}
            loadingSummary={
              discover.data.loggedDaysCount > 0 && summary.isLoading
            }
          />
          {discover.data.goals ? (
            <CalorieDeltaChart
              days={discover.data.days}
              calorieGoal={discover.data.goals.calorieGoal}
              avgCalorieDelta={discover.data.avgCalorieDelta}
              totalCalorieDelta={discover.data.totalCalorieDelta}
              loggedDaysCount={discover.data.loggedDaysCount}
            />
          ) : (
            <NoCalorieGoalCard />
          )}
        </>
      ) : null}
    </div>
  );
}
