import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  type MealType,
} from "@food-tracker/domain";
import type {
  DiaryEntryDto,
  FoodListItem,
  OffSearchHit,
  UsdaSearchHit,
} from "@food-tracker/contracts";
import { MEAL_TYPES } from "@food-tracker/contracts";
import { useApi } from "../../config";

type AddFoodSheetProps = {
  dateKey: string;
  loggedOnKey: string;
  meal: MealType;
  initialFoodId?: string | null;
  editEntry?: DiaryEntryDto | null;
  onClose: () => void;
  onCreatedCustom: () => void;
};

export function AddFoodSheet({
  dateKey,
  loggedOnKey,
  meal,
  initialFoodId,
  editEntry = null,
  onClose,
  onCreatedCustom,
}: AddFoodSheetProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const isEditing = Boolean(editEntry);
  const [tab, setTab] = useState<"recents" | "favorites" | "all">("recents");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<FoodListItem | null>(null);
  const [quantity, setQuantity] = useState(
    editEntry ? String(editEntry.quantityValue) : "1",
  );
  const [selectedUnit, setSelectedUnit] = useState(SERVING_UNIT_KEY);
  const [pickedMeal, setPickedMeal] = useState<MealType>(
    editEntry?.meal ?? meal,
  );
  const [error, setError] = useState<string | null>(null);
  const [offEnabled, setOffEnabled] = useState(false);

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
    const handle = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    setOffEnabled(false);
  }, [debouncedQuery]);

  const recents = useQuery({
    queryKey: ["foods", "recents"],
    queryFn: () => api.listFoods({ tab: "recents" }),
    enabled: !isEditing,
  });
  const favorites = useQuery({
    queryKey: ["foods", "favorites"],
    queryFn: () => api.listFoods({ tab: "favorites" }),
    enabled: !isEditing && tab === "favorites",
  });
  const allFoods = useQuery({
    queryKey: ["foods", "all"],
    queryFn: () => api.listFoods({ tab: "all" }),
    enabled: !isEditing && tab === "all",
  });

  const trimmed = query.trim();
  const usda = useQuery({
    queryKey: ["usda", debouncedQuery],
    queryFn: () => api.searchUsda(debouncedQuery),
    enabled: !isEditing && debouncedQuery.length >= 3,
  });

  useEffect(() => {
    if (
      !isEditing &&
      debouncedQuery.length >= 3 &&
      usda.isSuccess &&
      (usda.data?.foods.length ?? 0) === 0
    ) {
      setOffEnabled(true);
    }
  }, [isEditing, debouncedQuery, usda.isSuccess, usda.data?.foods.length]);

  const off = useQuery({
    queryKey: ["off", debouncedQuery],
    queryFn: () => api.searchOff(debouncedQuery),
    enabled: !isEditing && offEnabled && debouncedQuery.length >= 3,
  });

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

  const list =
    tab === "recents"
      ? recents.data ?? []
      : tab === "favorites"
        ? favorites.data ?? []
        : allFoods.data ?? [];
  const filtered = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) return list;
    return list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.brand?.toLowerCase().includes(q) ?? false),
    );
  }, [list, trimmed]);

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
      onClose();
    },
    onError: (err: Error) => setError(err.message),
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

  const selectUsda = useMutation({
    mutationFn: (fdcId: string) => api.selectUsda(fdcId),
    onSuccess: (result) => {
      setSelected(result.food);
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const selectOff = useMutation({
    mutationFn: (barcode: string) => api.lookupBarcode(barcode),
    onSuccess: (result) => {
      setSelected(result.food);
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const selectingRemote = selectUsda.isPending || selectOff.isPending;
  const showOffButton =
    trimmed.length >= 3 &&
    usda.isSuccess &&
    (usda.data?.foods.length ?? 0) > 0 &&
    !offEnabled;
  const showOffSection = offEnabled;

  const showServings = isEditing || selected;
  const saving = isEditing ? update.isPending : add.isPending;
  const foodName = isEditing
    ? editEntry!.foodNameSnapshot
    : selected?.name ?? "";
  const foodBrand = isEditing ? null : selected?.brand;
  const amount = Number(quantity);
  const amountValid = Number.isFinite(amount) && amount > 0;

  const preview = useMemo(() => {
    if (isEditing && editEntry) {
      const ratio = amountValid
        ? amount / editEntry.quantityValue
        : 0;
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

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/50">
      <div className="relative flex h-dvh w-full max-w-[var(--app-max-width)] flex-col overflow-hidden bg-bg shadow-2xl">
        <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={
              selected && !isEditing ? () => setSelected(null) : onClose
            }
            className="text-[17px] text-accent"
          >
            {selected && !isEditing ? "Back" : "Close"}
          </button>
          <h2 className="text-[17px] font-semibold">
            {isEditing
              ? "Edit entry"
              : selected
                ? "Servings"
                : `Add to ${mealLabel(pickedMeal)}`}
          </h2>
          <span className="w-12" />
        </header>

        {showServings ? (
          <div className="flex flex-1 flex-col gap-4 overflow-auto px-4 pb-8">
            <div>
              <p className="text-lg font-semibold">{foodName}</p>
              {foodBrand ? (
                <p className="text-sm text-text-muted">{foodBrand}</p>
              ) : null}
              {selected ? (
                <p className="mt-1 text-sm text-text-muted">
                  {formatQuantityLabel(selected.servingQty, selected.servingUnit)}{" "}
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
              onClick={() => (isEditing ? update.mutate() : add.mutate())}
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
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="px-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search foods"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[17px] text-text outline-none focus:border-accent"
              />
              <div className="mt-3 flex gap-2">
                {(
                  [
                    ["recents", "Recents"],
                    ["favorites", "Favorites"],
                    ["all", "All"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className="rounded-full px-3 py-1.5 text-sm font-medium"
                    style={{
                      background: tab === id ? "var(--surface)" : "transparent",
                      color: tab === id ? "var(--text)" : "var(--text-muted)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 min-h-0 flex-1 overflow-auto">
              {filtered.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => setSelected(food)}
                  className="block w-full border-b border-border px-4 py-3 text-left hover:bg-surface-hover"
                >
                  <div className="truncate font-medium">{food.name}</div>
                  {food.brand ? (
                    <div className="truncate text-xs text-text-muted">{food.brand}</div>
                  ) : null}
                  <div className="mt-0.5 text-sm text-text-muted">
                    {formatNutrient(food.servingQty)} {food.servingUnit} ·{" "}
                    {formatNutrient(food.calories)} kcal
                  </div>
                </button>
              ))}
              {trimmed.length >= 3 ? (
                <div className="px-4 py-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                    USDA
                  </p>
                  {usda.isLoading ? (
                    <p className="text-sm text-text-muted">Searching USDA…</p>
                  ) : usda.isError ? (
                    <p className="text-sm text-danger">
                      {(usda.error as Error).message}
                    </p>
                  ) : (usda.data?.foods.length ?? 0) === 0 ? (
                    <p className="text-sm text-text-muted">No USDA matches</p>
                  ) : (
                    usda.data?.foods.map((hit: UsdaSearchHit) => (
                      <button
                        key={hit.fdcId}
                        type="button"
                        disabled={selectingRemote}
                        onClick={() => selectUsda.mutate(hit.fdcId)}
                        className="mb-1 block w-full rounded-xl bg-surface px-3 py-2.5 text-left"
                      >
                        <div className="truncate font-medium">{hit.displayName}</div>
                        <div className="text-xs text-text-muted">
                          {hit.brand ?? hit.dataType ?? "USDA"}
                          {hit.caloriesPer100g != null
                            ? ` · ${formatNutrient(hit.caloriesPer100g)} kcal/100g`
                            : ""}
                        </div>
                      </button>
                    ))
                  )}
                  {showOffButton ? (
                    <button
                      type="button"
                      className="mt-3 w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-text"
                      onClick={() => setOffEnabled(true)}
                    >
                      Search packaged foods (Open Food Facts)
                    </button>
                  ) : null}
                  {showOffSection ? (
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                        Open Food Facts
                      </p>
                      {off.isLoading ? (
                        <p className="text-sm text-text-muted">
                          Searching packaged foods…
                        </p>
                      ) : off.isError ? (
                        <p className="text-sm text-danger">
                          {(off.error as Error).message}
                        </p>
                      ) : (off.data?.foods.length ?? 0) === 0 ? (
                        <p className="text-sm text-text-muted">
                          No packaged matches
                        </p>
                      ) : (
                        off.data?.foods.map((hit: OffSearchHit) => (
                          <button
                            key={hit.barcode}
                            type="button"
                            disabled={selectingRemote}
                            onClick={() => selectOff.mutate(hit.barcode)}
                            className="mb-1 block w-full rounded-xl bg-surface px-3 py-2.5 text-left"
                          >
                            <div className="truncate font-medium">{hit.name}</div>
                            <div className="text-xs text-text-muted">
                              {hit.brand ?? "Open Food Facts"}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="border-t border-border p-4">
              <button
                type="button"
                onClick={onCreatedCustom}
                className="flex w-full items-center justify-center rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-accent"
              >
                + Create custom food
              </button>
            </div>
            {error ? (
              <p className="px-4 pb-4 text-sm text-danger">{error}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
