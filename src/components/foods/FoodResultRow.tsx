"use client";

import { formatNutrient } from "@/lib/nutrients";
import type { FoodListItem } from "@/lib/food-shared";

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
    <div className="relative border-b border-border">
      <button
        type="button"
        className="block w-full min-w-0 px-4 py-3 pr-14 text-left transition hover:bg-surface-hover"
        onClick={() => onSelect(food)}
      >
        <div className="min-w-0">
          <div className="truncate font-medium text-text">{food.name}</div>
          {food.brand ? (
            <div className="truncate text-xs text-text-muted">{food.brand}</div>
          ) : null}
          <div className="mt-0.5 text-sm text-text-muted">
            {servingLabel} · {formatNutrient(food.calories)} kcal
          </div>
        </div>
      </button>
      <button
        type="button"
        className="absolute right-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-lg transition hover:bg-surface-hover"
        aria-label={food.isFavorite ? "Remove favorite" : "Add favorite"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite(food.id);
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
    </div>
  );
}
