export type CustomFoodFormValues = {
  id?: string;
  name: string;
  brand: string;
  servingQty: string;
  servingUnit: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  fiberG: string;
  sugarG: string;
  sodiumMg: string;
  satFatG: string;
  transFatG: string;
  cholesterolMg: string;
};

export type OcrFoodPrefill = CustomFoodFormValues & {
  source: "ocr";
};

export const OCR_PREFILL_STORAGE_KEY = "food-tracker:ocr-prefill";

export function emptyCustomFoodFormValues(): CustomFoodFormValues {
  return {
    name: "",
    brand: "",
    servingQty: "100",
    servingUnit: "g",
    calories: "0",
    proteinG: "",
    carbsG: "",
    fatG: "",
    fiberG: "",
    sugarG: "",
    sodiumMg: "",
    satFatG: "",
    transFatG: "",
    cholesterolMg: "",
  };
}

export function extrasFromNutrientsExtra(
  raw: unknown,
): Pick<CustomFoodFormValues, "satFatG" | "transFatG" | "cholesterolMg"> {
  const obj =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  const toStr = (v: unknown) =>
    v === null || v === undefined || v === "" ? "" : String(v);

  return {
    satFatG: toStr(obj.satFatG),
    transFatG: toStr(obj.transFatG),
    cholesterolMg: toStr(obj.cholesterolMg),
  };
}

export function safeReturnTo(raw: string | null | undefined): string {
  const value = raw ?? "";
  if (value.startsWith("/diary/") || value.startsWith("/foods")) {
    return value;
  }
  return "/foods";
}

export function withFoodIdOnReturnTo(returnTo: string, foodId: string): string {
  if (!returnTo.startsWith("/diary/") || !returnTo.includes("add=")) {
    return returnTo;
  }
  const url = new URL(returnTo, "http://local.invalid");
  url.searchParams.set("foodId", foodId);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function foodRecordToFormValues(food: {
  id: string;
  name: string;
  brand: string | null;
  servingQty: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  nutrientsExtra: unknown;
}): CustomFoodFormValues {
  const extras = extrasFromNutrientsExtra(food.nutrientsExtra);
  return {
    id: food.id,
    name: food.name,
    brand: food.brand ?? "",
    servingQty: String(food.servingQty),
    servingUnit: food.servingUnit,
    calories: String(food.calories),
    proteinG: String(food.proteinG),
    carbsG: String(food.carbsG),
    fatG: String(food.fatG),
    fiberG: String(food.fiberG),
    sugarG: String(food.sugarG),
    sodiumMg: String(food.sodiumMg),
    ...extras,
  };
}
