"use client";

import { formatNutrient } from "@/lib/nutrients";
import type { FoodListItem } from "@/lib/food-shared";

type FoodResultRowProps = {
  food: Pick<FoodListItem, "name" | "brand" | "isFavorite"> & {
    id?: string;
    servingQty?: number;
    servingUnit?: string;
    calories?: number;
  };
  onSelect: () => void;
  onToggleFavorite?: (foodId: string) => void;
  badge?: string;
  /** When set, shown instead of serving · kcal (e.g. catalog search previews). */
  detail?: string;
};

export function FoodResultRow({
  food,
  onSelect,
  onToggleFavorite,
  badge,
  detail,
}: FoodResultRowProps) {
  const hasNutrition =
    food.servingQty != null &&
    food.servingUnit != null &&
    food.calories != null;
  const servingLabel = hasNutrition
    ? `${formatNutrient(food.servingQty!)} ${food.servingUnit}`
    : null;
  const canFavorite = Boolean(food.id && onToggleFavorite);

  return (
    <div className="relative border-b border-border">
      <button
        type="button"
        className={`block w-full min-w-0 px-4 py-3 text-left transition hover:bg-surface-hover ${canFavorite ? "pr-14" : "pr-4"}`}
        onClick={onSelect}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate font-medium text-text">{food.name}</div>
            {badge ? (
              <span className="shrink-0 rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                {badge}
              </span>
            ) : null}
          </div>
          {food.brand ? (
            <div className="truncate text-xs text-text-muted">{food.brand}</div>
          ) : null}
          <div className="mt-0.5 text-sm text-text-muted">
            {detail
              ? detail
              : hasNutrition
                ? `${servingLabel} · ${formatNutrient(food.calories!)} kcal`
                : "Open Food Facts"}
          </div>
        </div>
      </button>
      {canFavorite ? (
        <button
          type="button"
          className="absolute right-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-lg transition hover:bg-surface-hover"
          aria-label={food.isFavorite ? "Remove favorite" : "Add favorite"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite?.(food.id!);
          }}
        >
          <span
            style={{
              color: food.isFavorite ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {food.isFavorite ? "★" : "☆"}
          </span>
        </button>
      ) : null}
    </div>
  );
}
