import type {
  DiscoverAveragesDto,
  DiscoverDayDto,
  DiscoverWindowDto,
  UserGoals,
} from "@food-tracker/contracts";
import { dateFromKey, shiftDiaryDate, todayKey } from "./dates";
import { sumDayTotals, type NutrientSnapshot } from "./nutrients";

export type DiscoverEntryInput = NutrientSnapshot & {
  dateKey: string;
};

/** Format a Prisma `@db.Date` (UTC midnight) into `YYYY-MM-DD`. */
export function dateKeyFromUtcDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns the 7 completed calendar date keys `[today - 7 .. yesterday]`
 * in chronological order for the given IANA timezone.
 */
export function discoverDateKeys(
  timeZone: string,
  now = new Date(),
): string[] {
  const today = todayKey(timeZone, now);
  return Array.from({ length: 7 }, (_, idx) =>
    shiftDiaryDate(today, idx - 7),
  );
}

function formatWeekday(key: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(dateFromKey(key));
}

function formatShortDate(key: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(dateFromKey(key));
}

export function formatDiscoverRangeLabel(
  startDateKey: string,
  endDateKey: string,
): string {
  return `${formatShortDate(startDateKey)} – ${formatShortDate(endDateKey)}`;
}

export function computeDiscoverWindow(input: {
  timeZone: string;
  now?: Date;
  goals: UserGoals | null;
  entries: DiscoverEntryInput[];
}): DiscoverWindowDto {
  const keys = discoverDateKeys(input.timeZone, input.now);
  const startDateKey = keys[0]!;
  const endDateKey = keys[keys.length - 1]!;
  const hasCalorieGoal =
    input.goals != null &&
    Number.isFinite(input.goals.calorieGoal) &&
    input.goals.calorieGoal > 0;
  const calorieGoal = hasCalorieGoal ? input.goals!.calorieGoal : null;

  const grouped = new Map<string, DiscoverEntryInput[]>();
  for (const key of keys) {
    grouped.set(key, []);
  }
  for (const entry of input.entries) {
    const bucket = grouped.get(entry.dateKey);
    if (bucket) {
      bucket.push(entry);
    }
  }

  const days: DiscoverDayDto[] = keys.map((dateKey) => {
    const dayEntries = grouped.get(dateKey) ?? [];
    const entryCount = dayEntries.length;
    const logged = entryCount > 0;
    const totals = sumDayTotals(dayEntries);
    const calorieDelta =
      logged && calorieGoal != null ? totals.calories - calorieGoal : null;

    return {
      dateKey,
      weekdayLabel: formatWeekday(dateKey),
      shortDateLabel: formatShortDate(dateKey),
      entryCount,
      logged,
      totals,
      calorieDelta,
    };
  });

  const loggedDays = days.filter((d) => d.logged);
  const loggedDaysCount = loggedDays.length;

  let averages: DiscoverAveragesDto | null = null;
  let avgCalorieDelta: number | null = null;
  let totalCalorieDelta: number | null = null;

  if (loggedDaysCount > 0) {
    const sums = loggedDays.reduce(
      (acc, day) => {
        acc.calories += day.totals.calories;
        acc.proteinG += day.totals.proteinG;
        acc.carbsG += day.totals.carbsG;
        acc.netCarbsG += day.totals.netCarbsG;
        acc.fatG += day.totals.fatG;
        return acc;
      },
      { calories: 0, proteinG: 0, carbsG: 0, netCarbsG: 0, fatG: 0 },
    );

    averages = {
      calories: sums.calories / loggedDaysCount,
      proteinG: sums.proteinG / loggedDaysCount,
      carbsG: sums.carbsG / loggedDaysCount,
      netCarbsG: sums.netCarbsG / loggedDaysCount,
      fatG: sums.fatG / loggedDaysCount,
    };

    if (calorieGoal != null) {
      totalCalorieDelta = loggedDays.reduce(
        (acc, day) => acc + (day.calorieDelta ?? 0),
        0,
      );
      avgCalorieDelta = totalCalorieDelta / loggedDaysCount;
    }
  }

  return {
    startDateKey,
    endDateKey,
    rangeLabel: formatDiscoverRangeLabel(startDateKey, endDateKey),
    goals: input.goals,
    loggedDaysCount,
    averages,
    avgCalorieDelta,
    totalCalorieDelta,
    days,
  };
}

/**
 * Symmetric bound `±scale` for the diverging calorie bar chart.
 * Enforces a minimum bound (default 300 kcal) so minor daily variances
 * stay visually proportional.
 */
export function computeDivergingScale(
  deltas: ReadonlyArray<number | null | undefined>,
  minBound = 300,
): number {
  let maxAbs = 0;
  for (const delta of deltas) {
    if (delta != null && Number.isFinite(delta)) {
      const abs = Math.abs(delta);
      if (abs > maxAbs) maxAbs = abs;
    }
  }
  if (maxAbs <= minBound) return minBound;

  const step = maxAbs <= 600 ? 100 : maxAbs <= 1500 ? 250 : 500;
  return Math.ceil(maxAbs / step) * step;
}

export function formatSignedCalories(delta: number): string {
  const rounded = Math.round(delta);
  if (rounded === 0) return "0";
  return rounded > 0
    ? `+${rounded.toLocaleString("en-US")}`
    : `-${Math.abs(rounded).toLocaleString("en-US")}`;
}
