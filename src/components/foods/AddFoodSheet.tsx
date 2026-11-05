"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FoodResultRow } from "@/components/foods/FoodResultRow";
import { ServingsStep } from "@/components/foods/ServingsStep";
import {
  addFoodEntryAction,
  toggleFavoriteAction,
} from "@/app/diary/actions";
import {
  mealLabel,
  type AddFoodTab,
  type FoodListItem,
} from "@/lib/food-shared";
import type { MealType } from "@/generated/prisma/client";

type AddFoodSheetProps = {
  meal: MealType;
  dateKey: string;
  loggedOnKey: string;
  initialRecents: FoodListItem[];
  initialFavorites: FoodListItem[];
  initialAll: FoodListItem[];
};

const TABS: { id: AddFoodTab; label: string }[] = [
  { id: "recents", label: "Recents" },
  { id: "favorites", label: "Favorites" },
  { id: "all", label: "All" },
];

export function AddFoodSheet({
  meal,
  dateKey,
  loggedOnKey,
  initialRecents,
  initialFavorites,
  initialAll,
}: AddFoodSheetProps) {
  const router = useRouter();
  const [tab, setTab] = useState<AddFoodTab>("recents");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FoodListItem | null>(null);
  const [recents, setRecents] = useState(initialRecents);
  const [favorites, setFavorites] = useState(initialFavorites);
  const [allFoods, setAllFoods] = useState(initialAll);
  const [, startFavoriteTransition] = useTransition();

  const close = () => {
    router.push(`/diary/${dateKey}`);
    router.refresh();
  };

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
    if (selected?.id === foodId) {
      setSelected((s) => (s ? { ...s, isFavorite } : s));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/50">
      <div className="flex h-dvh w-full max-w-[var(--app-max-width)] flex-col bg-bg shadow-2xl">
        {selected ? (
          <ServingsStep
            food={selected}
            meal={meal}
            onBack={() => setSelected(null)}
            onConfirm={async ({ quantity, unitMode }) => {
              const result = await addFoodEntryAction({
                foodId: selected.id,
                dateKey,
                loggedOnKey,
                meal,
                quantity,
                unitMode,
              });
              if (!result.ok) {
                throw new Error(result.error);
              }
              close();
            }}
          />
        ) : (
          <>
            <header className="flex items-center gap-2 border-b border-border px-3 py-3">
              <button
                type="button"
                onClick={close}
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
                  className="w-full rounded-full border border-border bg-surface py-2.5 pl-4 pr-10 text-sm text-text outline-none placeholder:text-text-muted focus:border-accent"
                />
              </div>
              <button
                type="button"
                disabled
                title="Barcode coming later"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-muted opacity-40"
                aria-label="Scan barcode (coming soon)"
              >
                ▦
              </button>
            </header>

            <div className="border-b border-border px-3 py-2">
              <p className="mb-2 text-xs text-text-muted">
                Adding to <span className="font-medium text-text">{mealLabel(meal)}</span>
              </p>
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
                    onSelect={setSelected}
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
