export type UserGoals = {
  calorieGoal: number;
  proteinGoalG: number;
  carbsGoalG: number;
  fatGoalG: number;
};

export type GoalValidationError = {
  field?: string;
  message: string;
};

const MACRO_CALORIE_TOLERANCE = 0.01;

export function macroCalories(
  proteinG: number,
  carbsG: number,
  fatG: number,
): number {
  return proteinG * 4 + carbsG * 4 + fatG * 9;
}

export function macroPercents(
  calorieGoal: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
): { proteinPct: number; carbsPct: number; fatPct: number; totalPct: number } {
  if (!(calorieGoal > 0)) {
    return { proteinPct: 0, carbsPct: 0, fatPct: 0, totalPct: 0 };
  }
  const proteinPct = ((proteinG * 4) / calorieGoal) * 100;
  const carbsPct = ((carbsG * 4) / calorieGoal) * 100;
  const fatPct = ((fatG * 9) / calorieGoal) * 100;
  return {
    proteinPct,
    carbsPct,
    fatPct,
    totalPct: proteinPct + carbsPct + fatPct,
  };
}

export function macrosMatchCalories(
  calorieGoal: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
): boolean {
  if (!(calorieGoal > 0)) return false;
  const macros = macroCalories(proteinG, carbsG, fatG);
  return Math.abs(macros - calorieGoal) / calorieGoal <= MACRO_CALORIE_TOLERANCE;
}

/** Ring fill fraction, clamped to 0..1. Overshoot only in legend text. */
export function ringProgress(current: number, goal: number | null | undefined): number {
  if (goal == null || !(goal > 0) || !Number.isFinite(current)) return 0;
  return Math.min(1, Math.max(0, current / goal));
}

export function goalsFromUser(user: {
  calorieGoal: number | null;
  proteinGoalG: number | null;
  carbsGoalG: number | null;
  fatGoalG: number | null;
}): UserGoals | null {
  const { calorieGoal, proteinGoalG, carbsGoalG, fatGoalG } = user;
  if (
    calorieGoal == null ||
    proteinGoalG == null ||
    carbsGoalG == null ||
    fatGoalG == null
  ) {
    return null;
  }
  return { calorieGoal, proteinGoalG, carbsGoalG, fatGoalG };
}

function requiredPositive(
  raw: unknown,
  field: string,
  label: string,
): number | GoalValidationError {
  if (raw === undefined || raw === null || raw === "") {
    return { field, message: `${label} is required` };
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return { field, message: `${label} must be zero or positive` };
  }
  if (field === "calorieGoal" && !(n > 0)) {
    return { field, message: "Calories must be greater than 0" };
  }
  return n;
}

export function parseGoalInput(
  raw: Record<string, unknown>,
): { ok: true; data: UserGoals } | { ok: false; error: GoalValidationError } {
  const calorieGoal = requiredPositive(raw.calorieGoal, "calorieGoal", "Calories");
  if (typeof calorieGoal === "object") return { ok: false, error: calorieGoal };

  const proteinG = requiredPositive(raw.proteinGoalG, "proteinGoalG", "Protein");
  if (typeof proteinG === "object") return { ok: false, error: proteinG };

  const carbsG = requiredPositive(raw.carbsGoalG, "carbsGoalG", "Carbs");
  if (typeof carbsG === "object") return { ok: false, error: carbsG };

  const fatG = requiredPositive(raw.fatGoalG, "fatGoalG", "Fat");
  if (typeof fatG === "object") return { ok: false, error: fatG };

  if (!macrosMatchCalories(calorieGoal, proteinG, carbsG, fatG)) {
    const pct = macroPercents(calorieGoal, proteinG, carbsG, fatG).totalPct;
    return {
      ok: false,
      error: {
        message: `Macros are ${Math.round(pct)}% of calories — adjust grams or the calorie target`,
      },
    };
  }

  return {
    ok: true,
    data: {
      calorieGoal,
      proteinGoalG: proteinG,
      carbsGoalG: carbsG,
      fatGoalG: fatG,
    },
  };
}
