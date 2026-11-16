import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  formatNutrient,
  formatQuantityLabel,
  modeFromSelected,
  optionLabel,
  quantityMultiplier,
  quantityUnitFromMode,
  SERVING_UNIT_KEY,
  unitOptionsFor,
  type QuantityUnitMode,
} from "@food-tracker/domain";
import type { FoodListItem } from "@food-tracker/contracts";
import { useApi } from "../config";
import { FoodSearchSheet } from "../components/foods/FoodSearchSheet";
import { SwipeToDeleteRow } from "../components/ui/SwipeToDeleteRow";

type Draft = {
  food: FoodListItem;
  quantity: number;
  unitMode: QuantityUnitMode;
  selectedUnit?: string;
};

function ingredientCalories(item: Draft): number {
  try {
    const mult = quantityMultiplier(
      item.quantity,
      item.unitMode,
      item.food.servingQty,
      item.food.servingsPerRecipe,
      item.unitMode === "food"
        ? {
            foodServingUnit: item.food.servingUnit,
            selectedUnit: item.selectedUnit,
            portions: item.food.portions,
          }
        : undefined,
    );
    return item.food.calories * mult;
  } catch {
    return 0;
  }
}

export function RecipePage() {
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [servings, setServings] = useState("1");
  const [ingredients, setIngredients] = useState<Draft[]>([]);
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<FoodListItem | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [selectedUnit, setSelectedUnit] = useState(SERVING_UNIT_KEY);

  const unitOptions = useMemo(
    () => (selected ? unitOptionsFor(selected) : [SERVING_UNIT_KEY]),
    [selected],
  );

  useEffect(() => {
    if (!selected) return;
    setSelectedUnit(unitOptions[0] ?? SERVING_UNIT_KEY);
    setQuantity("1");
  }, [selected, unitOptions]);

  const totalCalories = useMemo(
    () => ingredients.reduce((sum, item) => sum + ingredientCalories(item), 0),
    [ingredients],
  );

  const create = useMutation({
    mutationFn: () =>
      api.createRecipe({
        name: name.trim(),
        servingsPerRecipe: Number(servings),
        ingredients: ingredients.map((item) => ({
          foodId: item.food.id,
          quantity: item.quantity,
          unitMode: item.unitMode,
          selectedUnit:
            item.unitMode === "food" ? item.selectedUnit : undefined,
        })),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["foods"] });
      navigate("/foods");
    },
  });

  function closePicker() {
    setPicking(false);
    setSelected(null);
    setQuantity("1");
    setSelectedUnit(SERVING_UNIT_KEY);
  }

  function addIngredient() {
    if (!selected) return;
    const amount = Number(quantity);
    if (!(amount > 0)) return;
    const unitMode = modeFromSelected(selectedUnit);
    setIngredients((rows) => [
      ...rows.filter((row) => row.food.id !== selected.id),
      {
        food: selected,
        quantity: amount,
        unitMode,
        selectedUnit: unitMode === "food" ? selectedUnit : undefined,
      },
    ]);
    closePicker();
  }

  const amount = Number(quantity);
  const amountValid = Number.isFinite(amount) && amount > 0;
  const unitMode = modeFromSelected(selectedUnit);
  const previewCalories = useMemo(() => {
    if (!selected || !amountValid) return 0;
    return ingredientCalories({
      food: selected,
      quantity: amount,
      unitMode,
      selectedUnit: unitMode === "food" ? selectedUnit : undefined,
    });
  }, [amount, amountValid, selected, selectedUnit, unitMode]);

  return (
    <div className="flex flex-col gap-4 pt-1">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/foods")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-text-muted hover:bg-surface"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-lg font-semibold tracking-tight">New recipe</h1>
      </header>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-text-muted">Name</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-[17px] outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-text-muted">Servings per recipe</span>
        <input
          type="number"
          min="0.01"
          step="any"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-[17px] outline-none focus:border-accent"
        />
      </label>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">Ingredients</h2>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="text-sm font-medium text-accent"
          >
            + Add
          </button>
        </div>
        {ingredients.length === 0 ? (
          <p className="rounded-xl bg-surface px-4 py-3 text-sm text-text-muted">
            Search your foods or USDA to add ingredients.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl bg-surface">
            {ingredients.map((item) => {
              const unit = quantityUnitFromMode(
                item.unitMode,
                item.food.servingUnit,
                item.selectedUnit,
              );
              return (
                <SwipeToDeleteRow
                  key={item.food.id}
                  onDelete={async () => {
                    setIngredients((rows) =>
                      rows.filter((row) => row.food.id !== item.food.id),
                    );
                  }}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{item.food.name}</div>
                      <div className="text-sm text-text-muted">
                        {formatQuantityLabel(item.quantity, unit)} ·{" "}
                        {formatNutrient(ingredientCalories(item))} kcal
                      </div>
                    </div>
                  </div>
                </SwipeToDeleteRow>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-sm text-text-muted">
          Total {formatNutrient(totalCalories)} kcal
        </p>
      </section>

      {create.error ? (
        <p className="text-sm text-danger">{(create.error as Error).message}</p>
      ) : null}

      <button
        type="button"
        disabled={
          create.isPending ||
          !name.trim() ||
          ingredients.length < 1 ||
          !(Number(servings) > 0)
        }
        onClick={() => create.mutate()}
        className="rounded-xl bg-accent px-4 py-3 text-[17px] font-semibold text-white disabled:opacity-60"
      >
        {create.isPending ? "Creating…" : "Create recipe"}
      </button>

      {picking ? (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/50">
          <div className="flex h-dvh w-full max-w-[var(--app-max-width)] flex-col overflow-hidden bg-bg">
            {selected ? (
              <>
                <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="text-[17px] text-accent"
                  >
                    Back
                  </button>
                  <h2 className="text-[17px] font-semibold">Amount</h2>
                  <span className="w-12" />
                </header>
                <div className="flex flex-1 flex-col gap-4 overflow-auto px-4 pb-8">
                  <div>
                    <p className="text-lg font-semibold">{selected.name}</p>
                    {selected.brand ? (
                      <p className="text-sm text-text-muted">{selected.brand}</p>
                    ) : null}
                    <p className="mt-1 text-sm text-text-muted">
                      {formatQuantityLabel(
                        selected.servingQty,
                        selected.servingUnit,
                      )}{" "}
                      · {formatNutrient(selected.calories)} kcal / serving
                    </p>
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
                        className="rounded-xl border border-border bg-surface px-3 py-2.5 text-[17px] outline-none focus:border-accent"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="text-text-muted">Unit</span>
                      <select
                        value={selectedUnit}
                        onChange={(e) => setSelectedUnit(e.target.value)}
                        className="rounded-xl border border-border bg-surface px-3 py-2.5 text-[17px] outline-none focus:border-accent"
                      >
                        {unitOptions.map((unit) => (
                          <option key={unit} value={unit}>
                            {optionLabel(unit)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="text-sm text-text-muted">
                    {formatNutrient(previewCalories)} kcal for this ingredient
                  </p>
                  <button
                    type="button"
                    disabled={!amountValid}
                    onClick={addIngredient}
                    className="rounded-xl bg-accent px-4 py-3 text-[17px] font-semibold text-white disabled:opacity-60"
                  >
                    Add ingredient
                  </button>
                </div>
              </>
            ) : (
              <FoodSearchSheet
                title="Add ingredient"
                onClose={closePicker}
                onSelect={setSelected}
                onCreateCustom={() =>
                  navigate("/foods/new", {
                    state: { returnTo: "/foods/recipes/new" },
                  })
                }
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
