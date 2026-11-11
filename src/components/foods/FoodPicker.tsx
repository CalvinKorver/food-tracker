"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { FoodResultRow } from "@/components/foods/FoodResultRow";
import { BarcodeScannerScreen } from "@/components/foods/BarcodeScannerScreen";
import { BarcodeIcon } from "@/components/icons/BarcodeIcon";
import {
  searchCatalogAction,
  searchOffCatalogAction,
  selectCatalogFoodAction,
  selectUsdaFoodAction,
  toggleFavoriteAction,
  type OffSearchHit,
  type UsdaSearchHit,
} from "@/app/diary/actions";
import { type AddFoodTab, type FoodListItem } from "@/lib/food-shared";
import { formatNutrient } from "@/lib/nutrients";
import { dataTypeBadge } from "@/lib/sources/rank-usda-hits";

type FoodPickerProps = {
  initialRecents: FoodListItem[];
  initialFavorites: FoodListItem[];
  initialAll: FoodListItem[];
  subtitle?: ReactNode;
  footer?: ReactNode;
  onSelect: (food: FoodListItem) => void;
  onClose: () => void;
};

const TABS: { id: AddFoodTab; label: string }[] = [
  { id: "recents", label: "Recents" },
  { id: "favorites", label: "Favorites" },
  { id: "all", label: "All" },
];

const SEARCH_DEBOUNCE_MS = 450;
const MIN_REMOTE_QUERY = 3;

export function FoodPicker({
  initialRecents,
  initialFavorites,
  initialAll,
  subtitle,
  footer,
  onSelect,
  onClose,
}: FoodPickerProps) {
  const [tab, setTab] = useState<AddFoodTab>("favorites");
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState(initialRecents);
  const [favorites, setFavorites] = useState(initialFavorites);
  const [allFoods, setAllFoods] = useState(initialAll);
  const [scanOpen, setScanOpen] = useState(false);
  const [usdaHits, setUsdaHits] = useState<UsdaSearchHit[]>([]);
  const [usdaStatus, setUsdaStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [usdaError, setUsdaError] = useState<string | null>(null);
  const [offHits, setOffHits] = useState<OffSearchHit[]>([]);
  const [offStatus, setOffStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [offError, setOffError] = useState<string | null>(null);
  const [selectingKey, setSelectingKey] = useState<string | null>(null);
  const [expandedUsda, setExpandedUsda] = useState<Set<string>>(() => new Set());
  const [, startFavoriteTransition] = useTransition();

  const lists = useMemo(
    () => ({
      recents,
      favorites,
      all: allFoods,
    }),
    [recents, favorites, allFoods],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = lists[tab];
    if (!q) return base;
    return base.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.brand?.toLowerCase().includes(q) ?? false),
    );
  }, [lists, tab, query]);

  const trimmedQuery = query.trim();
  const showRemote = trimmedQuery.length >= MIN_REMOTE_QUERY;

  useEffect(() => {
    if (trimmedQuery.length < MIN_REMOTE_QUERY) {
      setUsdaHits([]);
      setUsdaStatus("idle");
      setUsdaError(null);
      setExpandedUsda(new Set());
      setOffHits([]);
      setOffStatus("idle");
      setOffError(null);
      return;
    }

    let cancelled = false;
    setUsdaStatus("loading");
    setUsdaError(null);
    setExpandedUsda(new Set());
    setOffHits([]);
    setOffStatus("idle");
    setOffError(null);

    const timer = window.setTimeout(() => {
      void (async () => {
        const result = await searchCatalogAction(trimmedQuery);
        if (cancelled) return;
        if (!result.ok) {
          setUsdaHits([]);
          setUsdaStatus("error");
          setUsdaError(result.error);
          return;
        }
        setUsdaHits(result.foods);
        setUsdaStatus("ready");
        if (result.foods.length === 0) {
          void runOffSearch(trimmedQuery, () => cancelled);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmedQuery]);

  async function runOffSearch(
    q: string,
    isCancelled?: () => boolean,
  ) {
    setOffStatus("loading");
    setOffError(null);
    const result = await searchOffCatalogAction(q);
    if (isCancelled?.()) return;
    if (!result.ok) {
      setOffHits([]);
      setOffStatus("error");
      setOffError(result.error);
      return;
    }
    setOffHits(result.foods);
    setOffStatus("ready");
  }

  const emptyCopy =
    tab === "recents"
      ? "No recent foods yet"
      : tab === "favorites"
        ? "Star foods to see them here"
        : "No foods yet";

  function applyFavorite(foodId: string, isFavorite: boolean) {
    const patch = (items: FoodListItem[]) =>
      items.map((f) => (f.id === foodId ? { ...f, isFavorite } : f));

    setRecents(patch);
    setAllFoods(patch);
    setFavorites((prev) => {
      if (isFavorite) {
        const fromAll =
          allFoods.find((f) => f.id === foodId) ??
          recents.find((f) => f.id === foodId) ??
          prev.find((f) => f.id === foodId);
        if (!fromAll) return prev;
        if (prev.some((f) => f.id === foodId)) {
          return patch(prev);
        }
        return [...prev, { ...fromAll, isFavorite: true }].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      }
      return prev.filter((f) => f.id !== foodId);
    });
  }

  async function pickUsda(fdcId: string) {
    setSelectingKey(`usda:${fdcId}`);
    setUsdaError(null);
    try {
      const result = await selectUsdaFoodAction(fdcId);
      if (!result.ok) {
        setUsdaError(result.error);
        return;
      }
      onSelect(result.food);
    } finally {
      setSelectingKey(null);
    }
  }

  function usdaDetail(caloriesPer100g: number | null) {
    return caloriesPer100g != null
      ? `100 g · ${formatNutrient(caloriesPer100g)} kcal`
      : "Tap to load nutrition";
  }

  function renderUsdaHit(
    hit: Pick<
      UsdaSearchHit,
      | "fdcId"
      | "name"
      | "displayName"
      | "brand"
      | "dataType"
      | "caloriesPer100g"
    >,
  ) {
    return (
      <FoodResultRow
        key={hit.fdcId}
        food={{
          name: hit.displayName,
          brand: hit.brand,
          isFavorite: false,
        }}
        badge={dataTypeBadge(hit.dataType)}
        detail={usdaDetail(hit.caloriesPer100g)}
        onSelect={() => {
          if (selectingKey) return;
          void pickUsda(hit.fdcId);
        }}
      />
    );
  }

  async function pickOff(hit: OffSearchHit) {
    setSelectingKey(`off:${hit.barcode}`);
    setOffError(null);
    try {
      const result = await selectCatalogFoodAction(hit.barcode);
      if (!result.ok) {
        setOffError(result.error);
        return;
      }
      onSelect(result.food);
    } finally {
      setSelectingKey(null);
    }
  }

  const showOffSection = offStatus !== "idle";
  const showOffButton =
    showRemote &&
    usdaStatus === "ready" &&
    offStatus === "idle" &&
    usdaHits.length > 0;

  return (
    <>
      <header className="flex items-center gap-2 border-b border-border px-3 py-3">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-text-muted hover:bg-surface-hover"
          aria-label="Close"
        >
          ✕
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search foods…"
            className="w-full rounded-full border border-border bg-surface py-2.5 pl-4 pr-10 text-base text-text outline-none placeholder:text-text-muted focus:border-accent"
          />
        </div>
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text transition hover:bg-surface-hover"
          aria-label="Scan barcode"
          title="Scan barcode"
        >
          <BarcodeIcon size={22} />
        </button>
      </header>

      <div className="border-b border-border px-3 py-2">
        {subtitle ? <div className="mb-2 text-xs text-text-muted">{subtitle}</div> : null}
        <div className="flex gap-1 rounded-full bg-surface p-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition"
                style={{
                  background: active ? "var(--text)" : "transparent",
                  color: active ? "var(--bg)" : "var(--text-muted)",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {showRemote ? (
          <div className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Your foods
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-text-muted">
            {showRemote ? "No matching foods of yours" : emptyCopy}
          </p>
        ) : (
          filtered.map((food) => (
            <FoodResultRow
              key={food.id}
              food={food}
              onSelect={() => onSelect(food)}
              onToggleFavorite={(foodId) => {
                startFavoriteTransition(async () => {
                  const result = await toggleFavoriteAction(foodId);
                  if (result.ok) {
                    applyFavorite(foodId, result.isFavorite);
                  }
                });
              }}
            />
          ))
        )}

        {showRemote ? (
          <>
            <div className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
              USDA
            </div>
            {usdaStatus === "loading" ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">
                Searching…
              </p>
            ) : null}
            {usdaStatus === "error" ? (
              <p className="px-4 py-6 text-center text-sm text-danger">
                {usdaError ?? "Search failed"}
              </p>
            ) : null}
            {usdaStatus === "ready" && usdaHits.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">
                No USDA matches
              </p>
            ) : null}
            {usdaStatus === "ready"
              ? usdaHits.map((hit) => {
                  const expanded = expandedUsda.has(hit.fdcId);
                  return (
                    <div key={hit.fdcId}>
                      {renderUsdaHit(hit)}
                      {hit.variants.length > 0 ? (
                        <div className="border-b border-border px-4 pb-2">
                          <button
                            type="button"
                            className="text-xs font-medium text-accent hover:text-accent-hover"
                            onClick={() => {
                              setExpandedUsda((prev) => {
                                const next = new Set(prev);
                                if (next.has(hit.fdcId)) next.delete(hit.fdcId);
                                else next.add(hit.fdcId);
                                return next;
                              });
                            }}
                          >
                            {expanded
                              ? "Hide similar"
                              : `${hit.variants.length} similar`}
                          </button>
                        </div>
                      ) : null}
                      {expanded
                        ? hit.variants.map((variant) => renderUsdaHit(variant))
                        : null}
                    </div>
                  );
                })
              : null}
            {usdaError && usdaStatus === "ready" ? (
              <p className="px-4 py-2 text-center text-sm text-danger">
                {usdaError}
              </p>
            ) : null}

            {showOffButton ? (
              <div className="px-4 py-3">
                <button
                  type="button"
                  className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-text transition hover:bg-surface-hover"
                  onClick={() => {
                    void runOffSearch(trimmedQuery);
                  }}
                >
                  Search packaged foods (Open Food Facts)
                </button>
              </div>
            ) : null}

            {showOffSection ? (
              <>
                <div className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Open Food Facts
                </div>
                {offStatus === "loading" ? (
                  <p className="px-4 py-6 text-center text-sm text-text-muted">
                    Searching packaged foods…
                  </p>
                ) : null}
                {offStatus === "error" ? (
                  <p className="px-4 py-6 text-center text-sm text-danger">
                    {offError ?? "Search failed"}
                  </p>
                ) : null}
                {offStatus === "ready" && offHits.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-text-muted">
                    No packaged matches
                  </p>
                ) : null}
                {offStatus === "ready"
                  ? offHits.map((hit) => (
                      <FoodResultRow
                        key={hit.barcode}
                        food={{
                          name: hit.name,
                          brand: hit.brand,
                          isFavorite: false,
                        }}
                        badge="OFF"
                        detail="Tap to load nutrition"
                        onSelect={() => {
                          if (selectingKey) return;
                          void pickOff(hit);
                        }}
                      />
                    ))
                  : null}
                {offError && offStatus === "ready" ? (
                  <p className="px-4 py-2 text-center text-sm text-danger">
                    {offError}
                  </p>
                ) : null}
              </>
            ) : null}

            {selectingKey ? (
              <p className="px-4 py-3 text-center text-sm text-text-muted">
                Opening…
              </p>
            ) : null}
          </>
        ) : null}

        {footer && tab === "all" ? footer : null}
      </div>

      <BarcodeScannerScreen
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onFound={(food) => {
          setScanOpen(false);
          onSelect(food);
        }}
      />
    </>
  );
}
