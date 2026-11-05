"use client";

import { formatNutrient } from "@/lib/nutrients";
import { sourceBadge, type FoodListItem } from "@/lib/food-shared";

type FoodResultRowProps = {
  food: FoodListItem;
  onSelect: (food: FoodListItem) => void;
  onToggleFavorite: (foodId: string) => void;
};

export function FoodResultRow({
  food,
  onSelect,
  onToggleFavorite,
}: FoodResultRowProps) {
  const servingLabel = `${formatNutrient(food.servingQty)} ${food.servingUnit}`;

  return (
    <div className="flex items-stretch border-b border-border">
      <button
        type="button"
        className="min-w-0 flex-1 px-4 py-3 text-left transition hover:bg-surface-hover"
        onClick={() => onSelect(food)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium text-text">{food.name}</div>
            {food.brand ? (
              <div className="truncate text-xs text-text-muted">{food.brand}</div>
            ) : null}
            <div className="mt-0.5 text-sm text-text-muted">
              {servingLabel} · {formatNutrient(food.calories)} kcal
            </div>
          </div>
          <span className="shrink-0 text-xs text-text-muted">
            {sourceBadge(food.source)}
          </span>
        </div>
      </button>
      <button
        type="button"
        className="flex w-12 shrink-0 items-center justify-center text-lg transition hover:bg-surface-hover"
        aria-label={food.isFavorite ? "Remove favorite" : "Add favorite"}
        onClick={() => onToggleFavorite(food.id)}
      >
        <span style={{ color: food.isFavorite ? "var(--accent)" : "var(--text-muted)" }}>
          {food.isFavorite ? "★" : "☆"}
        </span>
      </button>
    </div>
  );
}
