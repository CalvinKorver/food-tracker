"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleFoodFavoriteAction } from "@/app/foods/actions";
import { formatNutrient } from "@/lib/nutrients";
import type { FoodListItem } from "@/lib/food-shared";

type FoodListRowProps = {
  food: FoodListItem;
};

export function FoodListRow({ food }: FoodListRowProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const serving = `${formatNutrient(food.servingQty)} ${food.servingUnit}`;

  return (
    <div className="relative border-b border-border last:border-b-0">
      <Link
        href={`/foods/${food.id}/edit`}
        className="block min-w-0 px-4 py-3 pr-14 transition hover:bg-surface-hover"
      >
        <div className="truncate font-medium text-text">{food.name}</div>
        {food.brand ? (
          <div className="truncate text-xs text-text-muted">{food.brand}</div>
        ) : null}
        <div className="mt-0.5 text-sm text-text-muted">
          {serving} · {formatNutrient(food.calories)} kcal
        </div>
      </Link>
      <button
        type="button"
        disabled={pending}
        className="absolute right-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-lg transition hover:bg-surface-hover disabled:opacity-50"
        aria-label={food.isFavorite ? "Remove favorite" : "Add favorite"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startTransition(async () => {
            await toggleFoodFavoriteAction(food.id);
            router.refresh();
          });
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
