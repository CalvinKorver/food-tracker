"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { FoodResultRow } from "@/components/foods/FoodResultRow";
import { BarcodeScannerScreen } from "@/components/foods/BarcodeScannerScreen";
import { BarcodeIcon } from "@/components/icons/BarcodeIcon";
import { toggleFavoriteAction } from "@/app/diary/actions";
import { type AddFoodTab, type FoodListItem } from "@/lib/food-shared";

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

export function FoodPicker({
  initialRecents,
  initialFavorites,
  initialAll,
  subtitle,
  footer,
  onSelect,
  onClose,
}: FoodPickerProps) {
  const [tab, setTab] = useState<AddFoodTab>("recents");
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState(initialRecents);
  const [favorites, setFavorites] = useState(initialFavorites);
  const [allFoods, setAllFoods] = useState(initialAll);
  const [scanOpen, setScanOpen] = useState(false);
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
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-text-muted">
            {emptyCopy}
          </p>
        ) : (
          filtered.map((food) => (
            <FoodResultRow
              key={food.id}
              food={food}
              onSelect={onSelect}
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
