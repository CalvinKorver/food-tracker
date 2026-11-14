import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatNutrient } from "@food-tracker/domain";
import type { FoodListItem } from "@food-tracker/contracts";
import { useApi } from "../config";
import { SwipeToDeleteRow } from "../components/ui/SwipeToDeleteRow";

function FoodRow({ food }: { food: FoodListItem }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const del = useMutation({
    mutationFn: () => api.deleteCustomFood(food.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["foods"] }),
  });
  const fav = useMutation({
    mutationFn: () => api.toggleFavorite(food.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["foods"] }),
  });
  const serving = `${formatNutrient(food.servingQty)} ${food.servingUnit}`;
  const isRecipe = food.source === "recipe";

  const body = (
    <div className="relative bg-surface">
      {isRecipe ? (
        <div className="min-w-0 px-4 py-3 pr-14">
          <div className="truncate font-medium">{food.name}</div>
          <div className="mt-0.5 text-sm text-text-muted">
            Recipe · {serving} · {formatNutrient(food.calories)} kcal
          </div>
        </div>
      ) : (
        <Link
          to={`/foods/${food.id}/edit`}
          className="block min-w-0 px-4 py-3 pr-14 hover:bg-surface-hover"
        >
          <div className="truncate font-medium">{food.name}</div>
          {food.brand ? (
            <div className="truncate text-xs text-text-muted">{food.brand}</div>
          ) : null}
          <div className="mt-0.5 text-sm text-text-muted">
            {serving} · {formatNutrient(food.calories)} kcal
          </div>
        </Link>
      )}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          fav.mutate();
        }}
        className="absolute right-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-lg"
        aria-label={food.isFavorite ? "Remove favorite" : "Add favorite"}
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

  if (isRecipe) {
    return <div className="border-b border-border last:border-b-0">{body}</div>;
  }

  return (
    <SwipeToDeleteRow
      className="border-b border-border last:border-b-0"
      onDelete={() => del.mutateAsync()}
      disabled={del.isPending}
    >
      {body}
    </SwipeToDeleteRow>
  );
}

export function FoodsPage() {
  const api = useApi();
  const foods = useQuery({
    queryKey: ["foods", "custom"],
    queryFn: () => api.listFoods({ tab: "custom" }),
  });

  return (
    <div className="flex flex-col gap-4 pt-1">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Foods</h1>
        <div className="flex gap-2">
          <Link
            to="/foods/new"
            className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-white"
          >
            Custom
          </Link>
          <Link
            to="/foods/recipes/new"
            className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-white"
          >
            Recipe
          </Link>
        </div>
      </header>

      {foods.isLoading ? (
        <p className="text-sm text-text-muted">Loading foods…</p>
      ) : (foods.data?.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-4 py-10 text-center text-sm text-text-muted">
          No custom foods yet
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-surface">
          {foods.data!.map((food) => (
            <FoodRow key={food.id} food={food} />
          ))}
        </div>
      )}
    </div>
  );
}
