export type NutrientSnapshot = {
  caloriesSnapshot: number;
  proteinGSnapshot: number;
  carbsGSnapshot: number;
  fatGSnapshot: number;
  fiberGSnapshot: number;
  sugarGSnapshot: number;
  sodiumMgSnapshot: number;
};

export type DayTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  netCarbsG: number;
};

export function netCarbs(carbs: number, fiber: number): number {
  return Math.max(0, carbs - fiber);
}

export function sumDayTotals(entries: NutrientSnapshot[]): DayTotals {
  const totals = entries.reduce(
    (acc, e) => {
      acc.calories += e.caloriesSnapshot;
      acc.proteinG += e.proteinGSnapshot;
      acc.carbsG += e.carbsGSnapshot;
      acc.fatG += e.fatGSnapshot;
      acc.fiberG += e.fiberGSnapshot;
      acc.sugarG += e.sugarGSnapshot;
      acc.sodiumMg += e.sodiumMgSnapshot;
      return acc;
    },
    {
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
    },
  );

  return {
    ...totals,
    netCarbsG: netCarbs(totals.carbsG, totals.fiberG),
  };
}

/** Format for display: whole numbers when close, else one decimal. */
export function formatNutrient(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Number(value.toFixed(digits));
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(digits);
}
