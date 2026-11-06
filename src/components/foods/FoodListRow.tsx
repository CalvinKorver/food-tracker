"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteCustomFoodAction,
  toggleFoodFavoriteAction,
} from "@/app/foods/actions";
import { SwipeToDeleteRow } from "@/components/ui/SwipeToDeleteRow";
import { formatNutrient } from "@/lib/nutrients";
import type { FoodListItem } from "@/lib/food-shared";

type FoodListRowProps = {
  food: FoodListItem;
};

export function FoodListRow({ food }: FoodListRowProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const serving = `${formatNutrient(food.servingQty)} ${food.servingUnit}`;

  return (
    <div>
      <SwipeToDeleteRow
        className="border-b border-border last:border-b-0"
        onDelete={async () => {
          setError(null);
          const result = await deleteCustomFoodAction(food.id);
          if (!result.ok) {
            setError(result.error);
            throw new Error(result.error);
          }
          router.refresh();
        }}
      >
        <div className="relative bg-surface">
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
            onPointerDown={(e) => e.stopPropagation()}
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
      </SwipeToDeleteRow>
      {error ? (
        <p className="bg-danger/10 px-4 py-1.5 text-xs text-danger">{error}</p>
      ) : null}
    </div>
  );
}
