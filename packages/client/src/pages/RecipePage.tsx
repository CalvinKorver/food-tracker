import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatNutrient } from "@food-tracker/domain";
import type { FoodListItem } from "@food-tracker/contracts";
import { useApi } from "../config";
import { SwipeToDeleteRow } from "../components/ui/SwipeToDeleteRow";

type Draft = {
  food: FoodListItem;
  quantity: number;
};

export function RecipePage() {
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [servings, setServings] = useState("1");
  const [ingredients, setIngredients] = useState<Draft[]>([]);
  const [picking, setPicking] = useState(false);
  const [qtyById, setQtyById] = useState<Record<string, string>>({});

  const foods = useQuery({
    queryKey: ["foods", "all"],
    queryFn: () => api.listFoods({ tab: "all" }),
  });

  const totalCalories = useMemo(
    () =>
      ingredients.reduce(
        (sum, item) => sum + item.food.calories * item.quantity,
        0,
      ),
    [ingredients],
  );

  const create = useMutation({
    mutationFn: () =>
      api.createRecipe({
        name: name.trim(),
        servingsPerRecipe: Number(servings),
        ingredients: ingredients.map((item) => ({
          foodId: item.food.id,
          quantity: item.quantity,
          unitMode: "serving" as const,
        })),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["foods"] });
      navigate("/foods");
    },
  });

  return (
    <div className="flex flex-col gap-4 pt-1">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/foods")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-text-muted hover:bg-surface"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-lg font-semibold tracking-tight">New recipe</h1>
      </header>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-text-muted">Name</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-[17px] outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-text-muted">Servings per recipe</span>
        <input
          type="number"
          min="0.01"
          step="any"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-[17px] outline-none focus:border-accent"
        />
      </label>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">Ingredients</h2>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="text-sm font-medium text-accent"
          >
            + Add
          </button>
        </div>
        {ingredients.length === 0 ? (
          <p className="rounded-xl bg-surface px-4 py-3 text-sm text-text-muted">
            Add at least one ingredient from your food list.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl bg-surface">
            {ingredients.map((item) => (
              <SwipeToDeleteRow
                key={item.food.id}
                onDelete={async () => {
                  setIngredients((rows) =>
                    rows.filter((row) => row.food.id !== item.food.id),
                  );
                }}
              >
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{item.food.name}</div>
                    <div className="text-sm text-text-muted">
                      {item.quantity} serving
                      {item.quantity === 1 ? "" : "s"} ·{" "}
                      {formatNutrient(item.food.calories * item.quantity)} kcal
                    </div>
                  </div>
                </div>
              </SwipeToDeleteRow>
            ))}
          </div>
        )}
        <p className="mt-2 text-sm text-text-muted">
          Total {formatNutrient(totalCalories)} kcal
        </p>
      </section>

      {create.error ? (
        <p className="text-sm text-danger">{(create.error as Error).message}</p>
      ) : null}

      <button
        type="button"
        disabled={
          create.isPending ||
          !name.trim() ||
          ingredients.length < 1 ||
          !(Number(servings) > 0)
        }
        onClick={() => create.mutate()}
        className="rounded-xl bg-accent px-4 py-3 text-[17px] font-semibold text-white disabled:opacity-60"
      >
        {create.isPending ? "Creating…" : "Create recipe"}
      </button>

      {picking ? (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/50">
          <div className="flex h-dvh w-full max-w-[var(--app-max-width)] flex-col bg-bg">
            <header className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
              <button
                type="button"
                className="text-accent"
                onClick={() => setPicking(false)}
              >
                Close
              </button>
              <h2 className="text-[17px] font-semibold">Pick a food</h2>
              <span className="w-12" />
            </header>
            <div className="min-h-0 flex-1 overflow-auto">
              {(foods.data ?? []).map((food) => (
                <div
                  key={food.id}
                  className="flex items-center gap-3 border-b border-border px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{food.name}</div>
                    <div className="text-sm text-text-muted">
                      {formatNutrient(food.calories)} kcal / serving
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-sm"
                    placeholder="1"
                    value={qtyById[food.id] ?? "1"}
                    onChange={(e) =>
                      setQtyById((m) => ({ ...m, [food.id]: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="text-sm font-medium text-accent"
                    onClick={() => {
                      const quantity = Number(qtyById[food.id] ?? "1");
                      if (!(quantity > 0)) return;
                      setIngredients((rows) => [
                        ...rows.filter((row) => row.food.id !== food.id),
                        { food, quantity },
                      ]);
                      setPicking(false);
                    }}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
