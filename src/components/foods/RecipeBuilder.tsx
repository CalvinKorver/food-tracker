"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRecipeAction } from "@/app/foods/actions";
import { FoodPicker } from "@/components/foods/FoodPicker";
import {
  NutritionConfirmation,
  type ConfirmationNutrients,
} from "@/components/foods/NutritionConfirmation";
import { ServingsStep } from "@/components/foods/ServingsStep";
import { SwipeToDeleteRow } from "@/components/ui/SwipeToDeleteRow";
import type { FoodListItem } from "@/lib/food-shared";
import { formatNutrient } from "@/lib/nutrients";
import {
  formatQuantityLabel,
  quantityMultiplier,
  quantityUnitFromMode,
  type QuantityUnitMode,
} from "@/lib/quantity";

type RecipeBuilderProps = {
  initialRecents: FoodListItem[];
  initialFavorites: FoodListItem[];
  initialAll: FoodListItem[];
};

type DraftIngredient = {
  key: string;
  food: FoodListItem;
  quantity: number;
  unitMode: QuantityUnitMode;
  selectedUnit?: string;
  calories: number;
};

type Step = "build" | "pick" | "amount" | "servings" | "confirm";

function StepDots({ active }: { active: 0 | 1 | 2 }) {
  return (
    <div className="flex justify-center gap-1.5 pb-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{
            background: i === active ? "var(--text)" : "var(--border)",
          }}
        />
      ))}
    </div>
  );
}

export function RecipeBuilder({
  initialRecents,
  initialFavorites,
  initialAll,
}: RecipeBuilderProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("build");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([]);
  const [selected, setSelected] = useState<FoodListItem | null>(null);
  const [servingsPerRecipe, setServingsPerRecipe] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    router.push("/foods", { transitionTypes: ["sheet-close"] });
    router.refresh();
  };

  const totalCalories = useMemo(
    () => ingredients.reduce((sum, i) => sum + i.calories, 0),
    [ingredients],
  );

  const totals = useMemo(() => {
    const acc: ConfirmationNutrients = {
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
    };
    for (const item of ingredients) {
      const m = quantityMultiplier(
        item.quantity,
        item.unitMode,
        item.food.servingQty,
        item.food.servingsPerRecipe,
        item.unitMode === "food"
          ? {
              foodServingUnit: item.food.servingUnit,
              selectedUnit: item.selectedUnit ?? item.food.servingUnit,
            }
          : undefined,
      );
      acc.calories += item.food.calories * m;
      acc.proteinG += item.food.proteinG * m;
      acc.carbsG += item.food.carbsG * m;
      acc.fatG += item.food.fatG * m;
      acc.fiberG += item.food.fiberG * m;
      acc.sugarG += item.food.sugarG * m;
      acc.sodiumMg += item.food.sodiumMg * m;
    }
    return acc;
  }, [ingredients]);

  const servingsNum = Number(servingsPerRecipe);
  const servingsValid = Number.isFinite(servingsNum) && servingsNum > 0;

  const perServing: ConfirmationNutrients | null = useMemo(() => {
    if (!servingsValid) return null;
    return {
      calories: totals.calories / servingsNum,
      proteinG: totals.proteinG / servingsNum,
      carbsG: totals.carbsG / servingsNum,
      fatG: totals.fatG / servingsNum,
      fiberG: totals.fiberG / servingsNum,
      sugarG: totals.sugarG / servingsNum,
      sodiumMg: totals.sodiumMg / servingsNum,
    };
  }, [totals, servingsNum, servingsValid]);

  if (step === "pick") {
    return (
      <div className="fixed inset-0 z-50 flex justify-center bg-black/50">
        <div className="flex h-dvh w-full max-w-[var(--app-max-width)] flex-col bg-bg shadow-2xl">
          <FoodPicker
            initialRecents={initialRecents}
            initialFavorites={initialFavorites}
            initialAll={initialAll}
            subtitle={
              <>
                Adding to <span className="font-medium text-text">recipe</span>
              </>
            }
            onSelect={(food) => {
              setSelected(food);
              setStep("amount");
            }}
            onClose={() => setStep("build")}
          />
        </div>
      </div>
    );
  }

  if (step === "amount" && selected) {
    return (
      <div className="fixed inset-0 z-50 flex justify-center bg-black/50">
        <div className="flex h-dvh w-full max-w-[var(--app-max-width)] flex-col bg-bg shadow-2xl">
          <ServingsStep
            food={selected}
            onBack={() => {
              setSelected(null);
              setStep("pick");
            }}
            onConfirm={async ({ quantity, unitMode, selectedUnit }) => {
              const m = quantityMultiplier(
                quantity,
                unitMode,
                selected.servingQty,
                selected.servingsPerRecipe,
                unitMode === "food"
                  ? {
                      foodServingUnit: selected.servingUnit,
                      selectedUnit: selectedUnit ?? selected.servingUnit,
                    }
                  : undefined,
              );
              setIngredients((prev) => [
                ...prev,
                {
                  key: `${selected.id}-${Date.now()}`,
                  food: selected,
                  quantity,
                  unitMode,
                  selectedUnit,
                  calories: selected.calories * m,
                },
              ]);
              setSelected(null);
              setStep("build");
            }}
          />
        </div>
      </div>
    );
  }

  if (step === "servings") {
    return (
      <div className="fixed inset-0 z-50 flex justify-center bg-black/50">
        <div className="flex h-dvh w-full max-w-[var(--app-max-width)] flex-col bg-bg shadow-2xl">
          <header className="flex items-center gap-2 border-b border-border px-3 py-3">
            <button
              type="button"
              onClick={() => setStep("build")}
              className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-text-muted hover:bg-surface-hover"
              aria-label="Back"
            >
              ←
            </button>
            <h1 className="flex-1 text-center text-[17px] font-semibold">
              Create Recipe
            </h1>
            <span className="w-10" aria-hidden />
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <p className="mb-2 text-center text-lg font-semibold">
              {name.trim() || "Untitled"}
            </p>
            <h2 className="mb-2 text-[17px] font-semibold">Serving Sizes</h2>
            <p className="mb-6 text-sm text-text-muted">
              Enter how many servings your recipe has.
            </p>
            <label className="block rounded-xl bg-surface px-4 py-3">
              <span className="mb-1.5 block text-sm text-text-muted">
                Servings per recipe
              </span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={servingsPerRecipe}
                onChange={(e) => setServingsPerRecipe(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-base tabular-nums text-text outline-none focus:border-accent"
              />
            </label>
          </div>
          <div className="border-t border-border p-4">
            <div className="mb-3 flex gap-3">
              <button
                type="button"
                onClick={() => setStep("build")}
                className="flex-1 rounded-2xl border border-border py-3.5 text-base font-semibold"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!servingsValid}
                onClick={() => setStep("confirm")}
                className="flex-1 rounded-2xl bg-accent py-3.5 text-base font-semibold text-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <StepDots active={1} />
          </div>
        </div>
      </div>
    );
  }

  if (step === "confirm" && perServing) {
    return (
      <div className="fixed inset-0 z-50 flex justify-center bg-black/50">
        <div className="flex h-dvh w-full max-w-[var(--app-max-width)] flex-col bg-bg shadow-2xl">
          <header className="flex items-center gap-2 border-b border-border px-3 py-3">
            <button
              type="button"
              onClick={() => setStep("servings")}
              className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-text-muted hover:bg-surface-hover"
              aria-label="Back"
            >
              ←
            </button>
            <h1 className="flex-1 text-center text-[17px] font-semibold">
              Create Recipe
            </h1>
            <span className="w-10" aria-hidden />
          </header>
          <div className="min-h-0 flex-1">
            <NutritionConfirmation
              title={name.trim()}
              nutrients={perServing}
              servingOptions={[
                { id: "serving", label: "1 serving", multiplier: 1 },
                {
                  id: "full",
                  label: `Full recipe — ${formatNutrient(servingsNum)} servings`,
                  multiplier: servingsNum,
                },
              ]}
              saveLabel="Save Recipe"
              pending={pending}
              error={error}
              onBack={() => {
                setError(null);
                setStep("servings");
              }}
              onSave={() => {
                setError(null);
                startTransition(async () => {
                  const result = await createRecipeAction({
                    name: name.trim(),
                    servingsPerRecipe: servingsNum,
                    ingredients: ingredients.map((i) => ({
                      foodId: i.food.id,
                      quantity: i.quantity,
                      unitMode: i.unitMode,
                      selectedUnit: i.selectedUnit,
                    })),
                  });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  close();
                });
              }}
            />
          </div>
          <StepDots active={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/50">
      <div className="flex h-dvh w-full max-w-[var(--app-max-width)] flex-col bg-bg shadow-2xl">
        <header className="flex items-center gap-2 border-b border-border px-3 py-3">
          <button
            type="button"
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-text-muted hover:bg-surface-hover"
            aria-label="Close"
          >
            ✕
          </button>
          <h1 className="flex-1 text-center text-[17px] font-semibold">
            Create Recipe
          </h1>
          <span className="w-10" aria-hidden />
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <label className="mb-4 block">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="Recipe Name (Required)"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text outline-none placeholder:text-text-muted focus:border-accent"
            />
            {nameError ? (
              <p className="mt-1.5 text-sm text-danger">{nameError}</p>
            ) : null}
          </label>

          <h2 className="mb-2 text-[15px] font-medium text-text-muted">
            Ingredients
          </h2>
          <div className="overflow-hidden rounded-xl bg-surface">
            <button
              type="button"
              onClick={() => setStep("pick")}
              className="flex w-full items-center justify-center border-b border-border py-3 text-sm font-medium text-accent transition hover:bg-surface-hover"
            >
              + Add ingredient
            </button>

            {ingredients.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-muted">
                No ingredients yet
              </p>
            ) : (
              ingredients.map((item) => (
                <SwipeToDeleteRow
                  key={item.key}
                  onDelete={async () => {
                    setIngredients((prev) =>
                      prev.filter((i) => i.key !== item.key),
                    );
                  }}
                >
                  <div className="flex items-start gap-3 bg-surface px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[17px] leading-snug">
                        {item.food.name}
                      </div>
                      <div className="text-[15px] text-text-muted">
                        {formatQuantityLabel(
                          item.quantity,
                          quantityUnitFromMode(
                            item.unitMode,
                            item.food.servingUnit,
                            item.selectedUnit,
                          ),
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-[17px] tabular-nums">
                      {formatNutrient(item.calories)} kcal
                    </div>
                  </div>
                </SwipeToDeleteRow>
              ))
            )}

            <div className="border-t border-border px-4 py-3 text-sm text-text-muted">
              Total:{" "}
              <span className="tabular-nums text-text">
                {formatNutrient(totalCalories)} kcal
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-border p-4">
          <button
            type="button"
            className="mb-3 w-full rounded-2xl bg-accent py-3.5 text-base font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
            onClick={() => {
              if (!name.trim()) {
                setNameError("Recipe name is required");
                return;
              }
              if (ingredients.length === 0) {
                setNameError(null);
                setError("Add at least one ingredient");
                return;
              }
              setError(null);
              setStep("servings");
            }}
          >
            Next
          </button>
          {error ? (
            <p className="mb-2 text-center text-sm text-danger">{error}</p>
          ) : null}
          <StepDots active={0} />
        </div>
      </div>
    </div>
  );
}
