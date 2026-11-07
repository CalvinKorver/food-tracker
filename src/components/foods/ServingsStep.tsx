"use client";

import { useMemo, useState, useTransition } from "react";
import { formatNutrient, netCarbs } from "@/lib/nutrients";
import { type FoodListItem } from "@/lib/food-shared";
import {
  quantityMultiplier,
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
  meal: MealType;
  onBack: () => void;
  onConfirm: (input: {
    quantity: number;
    unitMode: QuantityUnitMode;
    meal: MealType;
  }) => Promise<void>;
};

export function ServingsStep({
  food,
  meal,
  onBack,
  onConfirm,
}: ServingsStepProps) {
  const [quantity, setQuantity] = useState("1");
  const [unitMode, setUnitMode] = useState<QuantityUnitMode>("serving");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const amount = Number(quantity);
  const valid = Number.isFinite(amount) && amount > 0;

  const preview = useMemo(() => {
    if (!valid) return null;
    try {
      const multiplier = quantityMultiplier(
        amount,
        unitMode,
        food.servingQty,
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
  }, [food, amount, unitMode, valid]);

  function confirmMeal(chosenMeal: MealType) {
    if (!valid) return;
    setError(null);
    setPickerOpen(false);
    startTransition(async () => {
      try {
        await onConfirm({ quantity: amount, unitMode, meal: chosenMeal });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add");
      }
    });
  }

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
              value={unitMode}
              onChange={(e) =>
                setUnitMode(e.target.value as QuantityUnitMode)
              }
              className="min-w-[8rem] flex-1 rounded-xl border border-border bg-bg px-3 py-3 text-base text-text outline-none focus:border-accent"
              aria-label="Unit"
            >
              <option value="serving">serving(s)</option>
              <option value="food">{food.servingUnit}</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {unitMode === "serving"
              ? `Enter how many servings (${formatNutrient(food.servingQty)} ${food.servingUnit} each).`
              : `Enter amount in ${food.servingUnit} (1 serving = ${formatNutrient(food.servingQty)} ${food.servingUnit}).`}
          </p>
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
        {pickerOpen ? (
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
                  onClick={() => confirmMeal(optionMeal)}
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
          aria-expanded={pickerOpen}
          className="w-full rounded-2xl bg-accent py-3.5 text-center text-base font-semibold text-bg transition hover:bg-accent-hover disabled:opacity-50"
          onClick={() => {
            if (!valid) return;
            setPickerOpen((open) => !open);
          }}
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}
