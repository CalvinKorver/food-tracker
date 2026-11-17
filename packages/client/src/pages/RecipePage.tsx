import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  formatNutrient,
  formatQuantityLabel,
  modeFromSelected,
  netCarbs,
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

type Nutrients = {
  calories: number;
  proteinG: number;
  netCarbsG: number;
  fatG: number;
};

const ZERO_NUTRIENTS: Nutrients = {
  calories: 0,
  proteinG: 0,
  netCarbsG: 0,
  fatG: 0,
};

function ingredientNutrients(item: Draft): Nutrients {
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
    return {
      calories: item.food.calories * mult,
      proteinG: item.food.proteinG * mult,
      netCarbsG: netCarbs(item.food.carbsG * mult, item.food.fiberG * mult),
      fatG: item.food.fatG * mult,
    };
  } catch {
    return ZERO_NUTRIENTS;
  }
}

export function RecipePage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [servings, setServings] = useState("1");
  const [ingredients, setIngredients] = useState<Draft[]>([]);
  const [seededForId, setSeededForId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(false);
  const [selected, setSelected] = useState<FoodListItem | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [selectedUnit, setSelectedUnit] = useState(SERVING_UNIT_KEY);

  const existing = useQuery({
    queryKey: ["recipe", id],
    queryFn: () => api.getRecipe(id!),
    enabled: isEdit && Boolean(id),
  });

  useEffect(() => {
    if (!isEdit || !existing.data || seededForId === existing.data.id) return;
    setName(existing.data.name);
    setServings(String(existing.data.servingsPerRecipe));
    setIngredients(existing.data.ingredients);
    setSeededForId(existing.data.id);
  }, [existing.data, isEdit, seededForId]);

  const unitOptions = useMemo(() => {
    if (!selected) return [SERVING_UNIT_KEY];
    const opts = unitOptionsFor(selected);
    if (selectedUnit && !opts.includes(selectedUnit)) {
      return [...opts, selectedUnit];
    }
    return opts;
  }, [selected, selectedUnit]);

  const totals = useMemo(
    () =>
      ingredients.reduce((acc, item) => {
        const n = ingredientNutrients(item);
        return {
          calories: acc.calories + n.calories,
          proteinG: acc.proteinG + n.proteinG,
          netCarbsG: acc.netCarbsG + n.netCarbsG,
          fatG: acc.fatG + n.fatG,
        };
      }, ZERO_NUTRIENTS),
    [ingredients],
  );

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        servingsPerRecipe: Number(servings),
        ingredients: ingredients.map((item) => ({
          foodId: item.food.id,
          quantity: item.quantity,
          unitMode: item.unitMode,
          selectedUnit:
            item.unitMode === "food" ? item.selectedUnit : undefined,
        })),
      };
      return isEdit && id
        ? api.updateRecipe(id, payload)
        : api.createRecipe(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["foods"] });
      if (isEdit && id) {
        await queryClient.invalidateQueries({ queryKey: ["recipe", id] });
      }
      navigate("/foods");
    },
  });

  function closePicker() {
    setPicking(false);
    setEditingIngredient(false);
    setSelected(null);
    setQuantity("1");
    setSelectedUnit(SERVING_UNIT_KEY);
  }

  function selectFromSearch(food: FoodListItem) {
    const existingRow = ingredients.find((row) => row.food.id === food.id);
    setEditingIngredient(false);
    setSelected(food);
    if (existingRow) {
      setSelectedUnit(
        quantityUnitFromMode(
          existingRow.unitMode,
          existingRow.food.servingUnit,
          existingRow.selectedUnit,
        ),
      );
      setQuantity(String(existingRow.quantity));
    } else {
      const opts = unitOptionsFor(food);
      setSelectedUnit(opts[0] ?? SERVING_UNIT_KEY);
      setQuantity("1");
    }
  }

  function openEditIngredient(item: Draft) {
    setSelected(item.food);
    setSelectedUnit(
      quantityUnitFromMode(
        item.unitMode,
        item.food.servingUnit,
        item.selectedUnit,
      ),
    );
    setQuantity(String(item.quantity));
    setEditingIngredient(true);
    setPicking(true);
  }

  function commitIngredient() {
    if (!selected) return;
    const amount = Number(quantity);
    if (!(amount > 0)) return;
    const unitMode = modeFromSelected(selectedUnit);
    const next: Draft = {
      food: selected,
      quantity: amount,
      unitMode,
      selectedUnit: unitMode === "food" ? selectedUnit : undefined,
    };
    setIngredients((rows) => {
      const idx = rows.findIndex((row) => row.food.id === selected.id);
      if (idx === -1) return [...rows, next];
      const copy = [...rows];
      copy[idx] = next;
      return copy;
    });
    closePicker();
  }

  const amount = Number(quantity);
  const amountValid = Number.isFinite(amount) && amount > 0;
  const unitMode = modeFromSelected(selectedUnit);
  const preview = useMemo(() => {
    if (!selected || !amountValid) return ZERO_NUTRIENTS;
    return ingredientNutrients({
      food: selected,
      quantity: amount,
      unitMode,
      selectedUnit: unitMode === "food" ? selectedUnit : undefined,
    });
  }, [amount, amountValid, selected, selectedUnit, unitMode]);

  const returnTo =
    isEdit && id ? `/foods/recipes/${id}/edit` : "/foods/recipes/new";

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
        <h1 className="text-lg font-semibold tracking-tight">
          {isEdit ? "Edit recipe" : "New recipe"}
        </h1>
      </header>

      {isEdit && existing.isLoading ? (
        <p className="text-sm text-text-muted">Loading recipe…</p>
      ) : isEdit && existing.isError ? (
        <p className="text-sm text-danger">
          {(existing.error as Error).message}
        </p>
      ) : (
        <>
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
                onClick={() => {
                  setEditingIngredient(false);
                  setSelected(null);
                  setPicking(true);
                }}
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
                  const n = ingredientNutrients(item);
                  return (
                    <SwipeToDeleteRow
                      key={item.food.id}
                      className="border-b border-border last:border-b-0"
                      onEdit={() => openEditIngredient(item)}
                      onDelete={async () => {
                        setIngredients((rows) =>
                          rows.filter((row) => row.food.id !== item.food.id),
                        );
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openEditIngredient(item)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-hover"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {item.food.name}
                          </div>
                          <div className="text-sm text-text-muted">
                            {formatQuantityLabel(item.quantity, unit)} ·{" "}
                            {formatNutrient(n.calories)} kcal ·{" "}
                            {formatNutrient(n.proteinG)}g P ·{" "}
                            {formatNutrient(n.netCarbsG)}g C ·{" "}
                            {formatNutrient(n.fatG)}g F
                          </div>
                        </div>
                      </button>
                    </SwipeToDeleteRow>
                  );
                })}
              </div>
            )}
            <p className="mt-2 text-sm text-text-muted">
              Total {formatNutrient(totals.calories)} kcal ·{" "}
              {formatNutrient(totals.proteinG)}g P ·{" "}
              {formatNutrient(totals.netCarbsG)}g C ·{" "}
              {formatNutrient(totals.fatG)}g F
            </p>
          </section>

          {save.error ? (
            <p className="text-sm text-danger">
              {(save.error as Error).message}
            </p>
          ) : null}

          <button
            type="button"
            disabled={
              save.isPending ||
              !name.trim() ||
              ingredients.length < 1 ||
              !(Number(servings) > 0)
            }
            onClick={() => save.mutate()}
            className="rounded-xl bg-accent px-4 py-3 text-[17px] font-semibold text-white disabled:opacity-60"
          >
            {save.isPending
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
                ? "Save changes"
                : "Create recipe"}
          </button>
        </>
      )}

      {picking ? (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/50">
          <div className="flex h-dvh w-full max-w-[var(--app-max-width)] flex-col overflow-hidden bg-bg">
            {selected ? (
              <>
                <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
                  <button
                    type="button"
                    onClick={() =>
                      editingIngredient ? closePicker() : setSelected(null)
                    }
                    className="text-[17px] text-accent"
                  >
                    {editingIngredient ? "Cancel" : "Back"}
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
                  <div className="rounded-xl bg-surface px-4 py-3">
                    <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-text-muted">
                      This ingredient
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
                  <button
                    type="button"
                    disabled={!amountValid}
                    onClick={commitIngredient}
                    className="rounded-xl bg-accent px-4 py-3 text-[17px] font-semibold text-white disabled:opacity-60"
                  >
                    {editingIngredient ? "Update ingredient" : "Add ingredient"}
                  </button>
                </div>
              </>
            ) : (
              <FoodSearchSheet
                title="Add ingredient"
                onClose={closePicker}
                onSelect={(food) => {
                  if (isEdit && id && food.id === id) return;
                  selectFromSearch(food);
                }}
                onCreateCustom={() =>
                  navigate("/foods/new", {
                    state: { returnTo },
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
