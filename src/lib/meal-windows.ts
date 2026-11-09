import { MealType } from "@/generated/prisma/enums";

export type MealWindow = { start: string; end: string }; // "HH:MM"

export type MealWindows = {
  breakfast: MealWindow;
  lunch: MealWindow;
  dinner: MealWindow;
};

export const DEFAULT_MEAL_WINDOWS: MealWindows = {
  breakfast: { start: "05:00", end: "10:59" },
  lunch: { start: "11:00", end: "14:59" },
  dinner: { start: "17:00", end: "20:59" },
};

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function minutesOf(hhmm: string): number | null {
  const match = HHMM.exec(hhmm);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isWindow(value: unknown): value is MealWindow {
  if (!value || typeof value !== "object") return false;
  const start = (value as MealWindow).start;
  const end = (value as MealWindow).end;
  if (typeof start !== "string" || typeof end !== "string") return false;
  const startMin = minutesOf(start);
  const endMin = minutesOf(end);
  return startMin != null && endMin != null && startMin <= endMin;
}

/** Merge raw JSON with defaults; invalid meals fall back to default. */
export function parseMealWindows(raw: unknown): MealWindows {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_MEAL_WINDOWS };
  const obj = raw as Partial<MealWindows>;
  return {
    breakfast: isWindow(obj.breakfast)
      ? obj.breakfast
      : DEFAULT_MEAL_WINDOWS.breakfast,
    lunch: isWindow(obj.lunch) ? obj.lunch : DEFAULT_MEAL_WINDOWS.lunch,
    dinner: isWindow(obj.dinner) ? obj.dinner : DEFAULT_MEAL_WINDOWS.dinner,
  };
}

export function mealWindowsFromUser(user: {
  mealWindows?: unknown;
} | null): MealWindows {
  return parseMealWindows(user?.mealWindows ?? null);
}

function inWindow(minutes: number, window: MealWindow): boolean {
  const start = minutesOf(window.start);
  const end = minutesOf(window.end);
  if (start == null || end == null) return false;
  return minutes >= start && minutes <= end;
}

/** Device-local clock; snack when outside breakfast/lunch/dinner. */
export function suggestedMealForLocalTime(
  now: Date = new Date(),
  windows: MealWindows = DEFAULT_MEAL_WINDOWS,
): MealType {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (inWindow(minutes, windows.breakfast)) return MealType.breakfast;
  if (inWindow(minutes, windows.lunch)) return MealType.lunch;
  if (inWindow(minutes, windows.dinner)) return MealType.dinner;
  return MealType.snack;
}

export type MealWindowsInput = {
  breakfastStart: string;
  breakfastEnd: string;
  lunchStart: string;
  lunchEnd: string;
  dinnerStart: string;
  dinnerEnd: string;
};

export function parseMealWindowsInput(
  input: Record<string, unknown>,
): { ok: true; data: MealWindows } | { ok: false; error: string } {
  const windows: MealWindows = {
    breakfast: {
      start: String(input.breakfastStart ?? ""),
      end: String(input.breakfastEnd ?? ""),
    },
    lunch: {
      start: String(input.lunchStart ?? ""),
      end: String(input.lunchEnd ?? ""),
    },
    dinner: {
      start: String(input.dinnerStart ?? ""),
      end: String(input.dinnerEnd ?? ""),
    },
  };

  for (const [label, window] of [
    ["Breakfast", windows.breakfast],
    ["Lunch", windows.lunch],
    ["Dinner", windows.dinner],
  ] as const) {
    const start = minutesOf(window.start);
    const end = minutesOf(window.end);
    if (start == null || end == null) {
      return { ok: false, error: `${label} needs valid start and end times` };
    }
    if (start > end) {
      return { ok: false, error: `${label} start must be before or equal to end` };
    }
  }

  return { ok: true, data: windows };
}
