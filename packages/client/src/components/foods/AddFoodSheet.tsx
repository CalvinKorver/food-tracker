import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  formatNutrient,
  formatQuantityLabel,
  mealLabel,
  modeFromSelected,
  netCarbs,
  optionLabel,
  quantityMultiplier,
  SERVING_UNIT_KEY,
  unitOptionsFor,
  wouldExceedCalorieGoal,
  type MealType,
} from "@food-tracker/domain";
import type { DiaryEntryDto, FoodListItem } from "@food-tracker/contracts";
import { MEAL_TYPES } from "@food-tracker/contracts";
import { useApi } from "../../config";
import { CalorieNagSheet } from "./CalorieNagSheet";
import { FoodSearchSheet } from "./FoodSearchSheet";

export type CalorieNagContext = {
  enabled: boolean;
  dayCalories: number;
  dayProteinG: number;
  dayFatG: number;
  calorieGoal: number | null;
  proteinGoalG: number | null;
  fatGoalG: number | null;
};

type AddFoodSheetProps = {
  dateKey: string;
  loggedOnKey: string;
  meal: MealType;
  initialFoodId?: string | null;
  editEntry?: DiaryEntryDto | null;
  calorieNag?: CalorieNagContext | null;
  onClose: (opts?: { nagConceded?: boolean }) => void;
  onCreatedCustom: () => void;
};

export function AddFoodSheet({
  dateKey,
  loggedOnKey,
  meal,
  initialFoodId,
  editEntry = null,
  calorieNag = null,
  onClose,
  onCreatedCustom,
}: AddFoodSheetProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const isEditing = Boolean(editEntry);
  const [selected, setSelected] = useState<FoodListItem | null>(null);
  const [quantity, setQuantity] = useState(
    editEntry ? String(editEntry.quantityValue) : "1",
  );
  const [selectedUnit, setSelectedUnit] = useState(SERVING_UNIT_KEY);
  const [pickedMeal, setPickedMeal] = useState<MealType>(
    editEntry?.meal ?? meal,
  );
  const [error, setError] = useState<string | null>(null);
  const [nagOpen, setNagOpen] = useState(false);

  const unitOptions = useMemo(
    () => (selected ? unitOptionsFor(selected) : [SERVING_UNIT_KEY]),
    [selected],
  );

  useEffect(() => {
    if (!selected) return;
    setSelectedUnit(unitOptions[0] ?? SERVING_UNIT_KEY);
    setQuantity("1");
  }, [selected, unitOptions]);

  useEffect(() => {
    if (!initialFoodId || isEditing) return;
    let cancelled = false;
    void api.getFood(initialFoodId).then((food) => {
      if (!cancelled) setSelected(food);
    });
    return () => {
      cancelled = true;
    };
  }, [api, initialFoodId, isEditing]);

  const unitMode = modeFromSelected(selectedUnit);

  const add = useMutation({
    mutationFn: () =>
      api.addEntry({
        foodId: selected!.id,
        dateKey,
        loggedOnKey,
        meal: pickedMeal,
        quantity: Number(quantity),
        unitMode,
        selectedUnit: unitMode === "food" ? selectedUnit : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["diary"] });
    },
    onError: (err: Error) => {
      setNagOpen(false);
      setError(err.message);
    },
  });

  const update = useMutation({
    mutationFn: () =>
      api.updateEntry(editEntry!.id, {
        quantity: Number(quantity),
        meal: pickedMeal,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["diary"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const showServings = isEditing || selected;
  const saving = isEditing ? update.isPending : add.isPending;
  const foodName = isEditing
    ? editEntry!.foodNameSnapshot
    : (selected?.name ?? "");
  const foodBrand = isEditing ? null : selected?.brand;
  const amount = Number(quantity);
  const amountValid = Number.isFinite(amount) && amount > 0;

  const preview = useMemo(() => {
    if (isEditing && editEntry) {
      const ratio = amountValid ? amount / editEntry.quantityValue : 0;
      return {
        calories: editEntry.caloriesSnapshot * ratio,
        proteinG: editEntry.proteinGSnapshot * ratio,
        netCarbsG: netCarbs(
          editEntry.carbsGSnapshot * ratio,
          editEntry.fiberGSnapshot * ratio,
        ),
        fatG: editEntry.fatGSnapshot * ratio,
      };
    }
    if (!selected || !amountValid) {
      return { calories: 0, proteinG: 0, netCarbsG: 0, fatG: 0 };
    }
    try {
      const mult = quantityMultiplier(
        amount,
        unitMode,
        selected.servingQty,
        selected.servingsPerRecipe,
        unitMode === "food"
          ? {
              foodServingUnit: selected.servingUnit,
              selectedUnit,
              portions: selected.portions,
            }
          : undefined,
      );
      return {
        calories: selected.calories * mult,
        proteinG: selected.proteinG * mult,
        netCarbsG: netCarbs(selected.carbsG * mult, selected.fiberG * mult),
        fatG: selected.fatG * mult,
      };
    } catch {
      return { calories: 0, proteinG: 0, netCarbsG: 0, fatG: 0 };
    }
  }, [
    amount,
    amountValid,
    editEntry,
    isEditing,
    selected,
    selectedUnit,
    unitMode,
  ]);

  async function commitAdd(viaCalorieNag: boolean) {
    await add.mutateAsync();
    setNagOpen(false);
    onClose(viaCalorieNag ? { nagConceded: true } : undefined);
  }

  function onConfirmAdd() {
    setError(null);
    if (
      calorieNag?.enabled &&
      wouldExceedCalorieGoal(
        calorieNag.dayCalories,
        preview.calories,
        calorieNag.calorieGoal,
      )
    ) {
      setNagOpen(true);
      return;
    }
    void commitAdd(false).catch(() => {
      // error set in mutation onError
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/50">
      {nagOpen && calorieNag ? (
        <CalorieNagSheet
          dayProteinG={calorieNag.dayProteinG}
          dayFatG={calorieNag.dayFatG}
          proteinGoalG={calorieNag.proteinGoalG}
          fatGoalG={calorieNag.fatGoalG}
          onDecline={() => setNagOpen(false)}
          onAllow={() => commitAdd(true)}
        />
      ) : null}
      <div className="relative flex h-dvh w-full max-w-[var(--app-max-width)] flex-col overflow-hidden bg-bg shadow-2xl">
        {showServings ? (
          <>
            <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
              <button
                type="button"
                onClick={
                  selected && !isEditing
                    ? () => setSelected(null)
                    : () => onClose()
                }
                className="text-[17px] text-accent"
              >
                {selected && !isEditing ? "Back" : "Close"}
              </button>
              <h2 className="text-[17px] font-semibold">
                {isEditing ? "Edit entry" : "Servings"}
              </h2>
              <span className="w-12" />
            </header>
            <div className="flex flex-1 flex-col gap-4 overflow-auto px-4 pb-8">
              <div>
                <p className="text-lg font-semibold">{foodName}</p>
                {foodBrand ? (
                  <p className="text-sm text-text-muted">{foodBrand}</p>
                ) : null}
                {selected ? (
                  <p className="mt-1 text-sm text-text-muted">
                    {formatQuantityLabel(
                      selected.servingQty,
                      selected.servingUnit,
                    )}{" "}
                    · {formatNutrient(selected.calories)} kcal / serving
                  </p>
                ) : editEntry ? (
                  <p className="mt-1 text-sm text-text-muted">
                    Logged as{" "}
                    {formatQuantityLabel(
                      editEntry.quantityValue,
                      editEntry.quantityUnit,
                    )}
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-text-muted">Amount</span>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="rounded-xl border border-border bg-surface px-3 py-2.5 text-[17px] text-text outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-text-muted">Unit</span>
                  {isEditing && editEntry ? (
                    <div className="rounded-xl border border-border bg-surface px-3 py-2.5 text-[17px] text-text-muted">
                      {optionLabel(editEntry.quantityUnit)}
                    </div>
                  ) : (
                    <select
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value)}
                      className="rounded-xl border border-border bg-surface px-3 py-2.5 text-[17px] text-text outline-none focus:border-accent"
                    >
                      {unitOptions.map((unit) => (
                        <option key={unit} value={unit}>
                          {optionLabel(unit)}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              </div>
              <div className="rounded-xl bg-surface px-4 py-3">
                <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-text-muted">
                  This entry
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[15px]">
                  <span className="text-text-muted">Energy</span>
                  <span className="text-right tabular-nums">
                    {formatNutrient(preview.calories)} kcal
                  </span>
                  <span className="text-text-muted">Protein</span>
                  <span className="text-right tabular-nums">
                    {formatNutrient(preview.proteinG)} g
                  </span>
                  <span className="text-text-muted">Net carbs</span>
                  <span className="text-right tabular-nums">
                    {formatNutrient(preview.netCarbsG)} g
                  </span>
                  <span className="text-text-muted">Fat</span>
                  <span className="text-right tabular-nums">
                    {formatNutrient(preview.fatG)} g
                  </span>
                </div>
              </div>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-muted">Meal</span>
                <select
                  value={pickedMeal}
                  onChange={(e) => setPickedMeal(e.target.value as MealType)}
                  className="rounded-xl border border-border bg-surface px-3 py-2.5 text-[17px] text-text outline-none focus:border-accent"
                >
                  {MEAL_TYPES.map((m) => (
                    <option key={m} value={m}>
                      {mealLabel(m)}
                    </option>
                  ))}
                </select>
              </label>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <button
                type="button"
                disabled={saving || !amountValid}
                onClick={() =>
                  isEditing ? update.mutate() : onConfirmAdd()
                }
                className="rounded-xl bg-accent px-4 py-3 text-[17px] font-semibold text-white disabled:opacity-60"
              >
                {saving
                  ? isEditing
                    ? "Saving…"
                    : "Adding…"
                  : isEditing
                    ? "Save changes"
                    : `Add to ${mealLabel(pickedMeal)}`}
              </button>
            </div>
          </>
        ) : (
          <FoodSearchSheet
            title={`Add to ${mealLabel(pickedMeal)}`}
            onClose={() => onClose()}
            onSelect={(food) => {
              setSelected(food);
              setError(null);
            }}
            onCreateCustom={onCreatedCustom}
          />
        )}
      </div>
    </div>
  );
}
