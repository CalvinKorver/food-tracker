import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  formatNutrient,
  formatQuantityLabel,
  mealLabel,
  type MealType,
} from "@food-tracker/domain";
import type { FoodListItem, UsdaSearchHit } from "@food-tracker/contracts";
import { MEAL_TYPES } from "@food-tracker/contracts";
import { useApi } from "../../config";

type AddFoodSheetProps = {
  dateKey: string;
  loggedOnKey: string;
  meal: MealType;
  initialFoodId?: string | null;
  onClose: () => void;
  onCreatedCustom: () => void;
};

export function AddFoodSheet({
  dateKey,
  loggedOnKey,
  meal,
  initialFoodId,
  onClose,
  onCreatedCustom,
}: AddFoodSheetProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"recents" | "all">("recents");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<FoodListItem | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [pickedMeal, setPickedMeal] = useState<MealType>(meal);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(handle);
  }, [query]);

  const recents = useQuery({
    queryKey: ["foods", "recents"],
    queryFn: () => api.listFoods({ tab: "recents" }),
  });
  const allFoods = useQuery({
    queryKey: ["foods", "all"],
    queryFn: () => api.listFoods({ tab: "all" }),
    enabled: tab === "all",
  });

  const trimmed = query.trim();
  const usda = useQuery({
    queryKey: ["usda", debouncedQuery],
    queryFn: () => api.searchUsda(debouncedQuery),
    enabled: debouncedQuery.length >= 3,
  });

  useEffect(() => {
    if (!initialFoodId) return;
    let cancelled = false;
    void api.getFood(initialFoodId).then((food) => {
      if (!cancelled) setSelected(food);
    });
    return () => {
      cancelled = true;
    };
  }, [api, initialFoodId]);

  const list = tab === "recents" ? recents.data ?? [] : allFoods.data ?? [];
  const filtered = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) return list;
    return list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.brand?.toLowerCase().includes(q) ?? false),
    );
  }, [list, trimmed]);

  const add = useMutation({
    mutationFn: () =>
      api.addEntry({
        foodId: selected!.id,
        dateKey,
        loggedOnKey,
        meal: pickedMeal,
        quantity: Number(quantity),
        unitMode: "serving",
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

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/50">
      <div className="relative flex h-dvh w-full max-w-[var(--app-max-width)] flex-col overflow-hidden bg-bg shadow-2xl">
        <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={selected ? () => setSelected(null) : onClose}
            className="text-[17px] text-accent"
          >
            {selected ? "Back" : "Close"}
          </button>
          <h2 className="text-[17px] font-semibold">
            {selected ? "Servings" : `Add to ${mealLabel(pickedMeal)}`}
          </h2>
          <span className="w-12" />
        </header>

        {selected ? (
          <div className="flex flex-1 flex-col gap-4 overflow-auto px-4 pb-8">
            <div>
              <p className="text-lg font-semibold">{selected.name}</p>
              {selected.brand ? (
                <p className="text-sm text-text-muted">{selected.brand}</p>
              ) : null}
              <p className="mt-1 text-sm text-text-muted">
                {formatQuantityLabel(1, "serving")} · {formatNutrient(selected.calories)} kcal
              </p>
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-muted">Servings</span>
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
              disabled={add.isPending || !(Number(quantity) > 0)}
              onClick={() => add.mutate()}
              className="rounded-xl bg-accent px-4 py-3 text-[17px] font-semibold text-white disabled:opacity-60"
            >
              {add.isPending ? "Adding…" : `Add to ${mealLabel(pickedMeal)}`}
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
                {(["recents", "all"] as const).map((id) => (
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
                    {id === "recents" ? "Recents" : "All"}
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
                        disabled={selectUsda.isPending}
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
