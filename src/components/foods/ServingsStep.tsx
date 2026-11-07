"use client";

import { useMemo, useState, useTransition } from "react";
import { formatNutrient, netCarbs } from "@/lib/nutrients";
import { type FoodListItem } from "@/lib/food-shared";
import {
  isWeightUnit,
  normalizeUnitKey,
  quantityMultiplier,
  RECIPE_UNIT_KEY,
  SERVING_UNIT_KEY,
  type QuantityUnitMode,
} from "@/lib/quantity";
import { MealType } from "@/generated/prisma/enums";

const MEAL_OPTIONS: { meal: MealType; label: string }[] = [
  { meal: MealType.breakfast, label: "Breakfast" },
  { meal: MealType.lunch, label: "Lunch" },
  { meal: MealType.dinner, label: "Dinner" },
  { meal: MealType.snack, label: "Snack" },
];

type ServingsStepProps = {
  food: FoodListItem;
  meal?: MealType;
  confirmLabel?: string;
  onBack: () => void;
  onConfirm: (input: {
    quantity: number;
    unitMode: QuantityUnitMode;
    selectedUnit?: string;
    meal?: MealType;
  }) => Promise<void>;
};

function unitOptionsFor(food: FoodListItem): string[] {
  const options: string[] = [SERVING_UNIT_KEY];
  const native = food.servingUnit.trim();
  if (isWeightUnit(native)) {
    options.push("g");
    if (normalizeUnitKey(native) !== "g") {
      options.push(native);
    }
  } else if (native && normalizeUnitKey(native) !== SERVING_UNIT_KEY) {
    options.push(native);
  }
  if (food.servingsPerRecipe != null && food.servingsPerRecipe > 0) {
    options.push(RECIPE_UNIT_KEY);
  }
  return options;
}

function modeFromSelected(selected: string): QuantityUnitMode {
  if (selected === SERVING_UNIT_KEY) return "serving";
  if (selected === RECIPE_UNIT_KEY) return "recipe";
  return "food";
}

function optionLabel(unit: string): string {
  if (unit === SERVING_UNIT_KEY) return "serving(s)";
  if (unit === RECIPE_UNIT_KEY) return "recipe(s)";
  return unit;
}

export function ServingsStep({
  food,
  meal,
  confirmLabel,
  onBack,
  onConfirm,
}: ServingsStepProps) {
  const options = useMemo(() => unitOptionsFor(food), [food]);
  const [quantity, setQuantity] = useState("1");
  const [selectedUnit, setSelectedUnit] = useState(options[0] ?? SERVING_UNIT_KEY);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const amount = Number(quantity);
  const valid = Number.isFinite(amount) && amount > 0;
  const needsMeal = meal != null;
  const buttonLabel = confirmLabel ?? (needsMeal ? "Add" : "Add to recipe");
  const unitMode = modeFromSelected(selectedUnit);

  const preview = useMemo(() => {
    if (!valid) return null;
    try {
      const multiplier = quantityMultiplier(
        amount,
        unitMode,
        food.servingQty,
        food.servingsPerRecipe,
        unitMode === "food"
          ? {
              foodServingUnit: food.servingUnit,
              selectedUnit,
            }
          : undefined,
      );
      return {
        calories: food.calories * multiplier,
        proteinG: food.proteinG * multiplier,
        netCarbsG: netCarbs(
          food.carbsG * multiplier,
          food.fiberG * multiplier,
        ),
        fatG: food.fatG * multiplier,
      };
    } catch {
      return null;
    }
  }, [food, amount, unitMode, selectedUnit, valid]);

  function submit(chosenMeal?: MealType) {
    if (!valid) return;
    setError(null);
    setPickerOpen(false);
    startTransition(async () => {
      try {
        await onConfirm({
          quantity: amount,
          unitMode,
          selectedUnit: unitMode === "food" ? selectedUnit : undefined,
          meal: chosenMeal,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add");
      }
    });
  }

  const helper =
    unitMode === "serving"
      ? `Enter how many servings (${formatNutrient(food.servingQty)} ${food.servingUnit} each).`
      : unitMode === "recipe"
        ? `Enter how many full recipes (${formatNutrient(food.servingsPerRecipe ?? 0)} servings each).`
        : `Enter amount in ${selectedUnit} (1 serving = ${formatNutrient(food.servingQty)} ${food.servingUnit}).`;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-border px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-text-muted hover:bg-surface-hover"
          aria-label="Back"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{food.name}</h2>
          <p className="text-xs text-text-muted">
            1 serving = {formatNutrient(food.servingQty)} {food.servingUnit}
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-4 py-6">
        <label className="block">
          <span className="mb-2 block text-sm text-text-muted">Amount</span>
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="decimal"
              min="0.1"
              step="0.1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-28 rounded-xl border border-border bg-bg px-3 py-3 text-lg font-semibold tabular-nums text-text outline-none focus:border-accent"
            />
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="min-w-[8rem] flex-1 rounded-xl border border-border bg-bg px-3 py-3 text-base text-text outline-none focus:border-accent"
              aria-label="Unit"
            >
              {options.map((unit) => (
                <option key={unit} value={unit}>
                  {optionLabel(unit)}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-xs text-text-muted">{helper}</p>
        </label>

        {preview ? (
          <div className="rounded-2xl bg-bg-elevated p-4 text-sm">
            <div className="mb-2 text-xs font-semibold tracking-wide text-text-muted">
              THIS ENTRY
            </div>
            <ul className="space-y-2">
              <li className="flex justify-between">
                <span className="text-text-muted">Energy</span>
                <span className="tabular-nums font-medium">
                  {formatNutrient(preview.calories)} kcal
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-text-muted">Protein</span>
                <span className="tabular-nums">
                  {formatNutrient(preview.proteinG)} g
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-text-muted">Net Carbs</span>
                <span className="tabular-nums">
                  {formatNutrient(preview.netCarbsG)} g
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-text-muted">Fat</span>
                <span className="tabular-nums">
                  {formatNutrient(preview.fatG)} g
                </span>
              </li>
            </ul>
          </div>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>

      <div className="border-t border-border p-4">
        {needsMeal && pickerOpen ? (
          <div
            className="mb-3 overflow-hidden rounded-2xl border border-border bg-bg-elevated"
            role="listbox"
            aria-label="Choose meal"
          >
            {MEAL_OPTIONS.map(({ meal: optionMeal, label }) => {
              const selected = optionMeal === meal;
              return (
                <button
                  key={optionMeal}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={pending}
                  className="flex w-full items-center justify-between border-b border-border px-4 py-3.5 text-left text-base font-medium text-text transition last:border-b-0 hover:bg-surface-hover disabled:opacity-50"
                  onClick={() => submit(optionMeal)}
                >
                  <span>{label}</span>
                  {selected ? (
                    <span className="text-sm text-accent" aria-hidden>
                      ●
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
        <button
          type="button"
          disabled={!valid || pending || !preview}
          aria-expanded={needsMeal ? pickerOpen : undefined}
          className="w-full rounded-2xl bg-accent py-3.5 text-center text-base font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
          onClick={() => {
            if (!valid) return;
            if (needsMeal) {
              setPickerOpen((open) => !open);
              return;
            }
            submit();
          }}
        >
          {pending ? "Adding…" : buttonLabel}
        </button>
      </div>
    </div>
  );
}
