import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatNutrient } from "@food-tracker/domain";
import type {
  FoodListItem,
  OffSearchHit,
  UsdaSearchHit,
} from "@food-tracker/contracts";
import { useApi } from "../../config";

type FoodSearchSheetProps = {
  title?: string;
  onClose: () => void;
  onSelect: (food: FoodListItem) => void;
  onCreateCustom?: () => void;
};

export function FoodSearchSheet({
  title = "Pick a food",
  onClose,
  onSelect,
  onCreateCustom,
}: FoodSearchSheetProps) {
  const api = useApi();
  const [tab, setTab] = useState<"recents" | "favorites" | "all">("recents");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [offEnabled, setOffEnabled] = useState(false);

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
  });
  const favorites = useQuery({
    queryKey: ["foods", "favorites"],
    queryFn: () => api.listFoods({ tab: "favorites" }),
    enabled: tab === "favorites",
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
    if (
      debouncedQuery.length >= 3 &&
      usda.isSuccess &&
      (usda.data?.foods.length ?? 0) === 0
    ) {
      setOffEnabled(true);
    }
  }, [debouncedQuery, usda.isSuccess, usda.data?.foods.length]);

  const off = useQuery({
    queryKey: ["off", debouncedQuery],
    queryFn: () => api.searchOff(debouncedQuery),
    enabled: offEnabled && debouncedQuery.length >= 3,
  });

  const list =
    tab === "recents"
      ? (recents.data ?? [])
      : tab === "favorites"
        ? (favorites.data ?? [])
        : (allFoods.data ?? []);

  const filtered = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) return list;
    return list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.brand?.toLowerCase().includes(q) ?? false),
    );
  }, [list, trimmed]);

  const selectUsda = useMutation({
    mutationFn: (fdcId: string) => api.selectUsda(fdcId),
    onSuccess: (result) => {
      setError(null);
      onSelect(result.food);
    },
    onError: (err: Error) => setError(err.message),
  });

  const selectOff = useMutation({
    mutationFn: (barcode: string) => api.lookupBarcode(barcode),
    onSuccess: (result) => {
      setError(null);
      onSelect(result.food);
    },
    onError: (err: Error) => setError(err.message),
  });

  const selectingRemote = selectUsda.isPending || selectOff.isPending;
  const showOffButton =
    trimmed.length >= 3 &&
    usda.isSuccess &&
    (usda.data?.foods.length ?? 0) > 0 &&
    !offEnabled;
  const listLoading =
    (tab === "recents" && recents.isLoading) ||
    (tab === "favorites" && favorites.isLoading) ||
    (tab === "all" && allFoods.isLoading);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="text-[17px] text-accent"
        >
          Close
        </button>
        <h2 className="text-[17px] font-semibold">{title}</h2>
        <span className="w-12" />
      </header>

      <div className="px-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods"
          autoFocus
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
        {listLoading ? (
          <p className="px-4 py-3 text-sm text-text-muted">Loading foods…</p>
        ) : filtered.length === 0 && trimmed.length < 3 ? (
          <p className="px-4 py-3 text-sm text-text-muted">
            No foods here yet. Search USDA below, or create a custom food.
          </p>
        ) : (
          filtered.map((food) => (
            <button
              key={food.id}
              type="button"
              onClick={() => onSelect(food)}
              className="block w-full border-b border-border px-4 py-3 text-left hover:bg-surface-hover"
            >
              <div className="truncate font-medium">{food.name}</div>
              {food.brand ? (
                <div className="truncate text-xs text-text-muted">
                  {food.brand}
                </div>
              ) : null}
              <div className="mt-0.5 text-sm text-text-muted">
                {formatNutrient(food.servingQty)} {food.servingUnit} ·{" "}
                {formatNutrient(food.calories)} kcal
              </div>
            </button>
          ))
        )}

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
                  className="mb-1 block w-full rounded-xl bg-surface px-3 py-2.5 text-left disabled:opacity-60"
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

            {offEnabled ? (
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
                  <p className="text-sm text-text-muted">No packaged matches</p>
                ) : (
                  off.data?.foods.map((hit: OffSearchHit) => (
                    <button
                      key={hit.barcode}
                      type="button"
                      disabled={selectingRemote}
                      onClick={() => selectOff.mutate(hit.barcode)}
                      className="mb-1 block w-full rounded-xl bg-surface px-3 py-2.5 text-left disabled:opacity-60"
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

      {onCreateCustom ? (
        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={onCreateCustom}
            className="flex w-full items-center justify-center rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-accent"
          >
            + Create custom food
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="px-4 pb-4 text-sm text-danger">{error}</p>
      ) : null}
    </div>
  );
}
