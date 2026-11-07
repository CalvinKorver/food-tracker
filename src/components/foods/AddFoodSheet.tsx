"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FoodPicker } from "@/components/foods/FoodPicker";
import { ServingsStep } from "@/components/foods/ServingsStep";
import { addFoodEntryAction } from "@/app/diary/actions";
import { mealLabel, type FoodListItem } from "@/lib/food-shared";
import type { MealType } from "@/generated/prisma/enums";

type AddFoodSheetProps = {
  meal: MealType;
  dateKey: string;
  loggedOnKey: string;
  initialRecents: FoodListItem[];
  initialFavorites: FoodListItem[];
  initialAll: FoodListItem[];
  initialSelected?: FoodListItem | null;
};

export function AddFoodSheet({
  meal,
  dateKey,
  loggedOnKey,
  initialRecents,
  initialFavorites,
  initialAll,
  initialSelected = null,
}: AddFoodSheetProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<FoodListItem | null>(
    initialSelected,
  );
  const [openedFromBarcode] = useState(Boolean(initialSelected));

  const close = () => {
    router.push(`/diary/${dateKey}`, { transitionTypes: ["sheet-close"] });
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/50">
      <div className="flex h-dvh w-full max-w-[var(--app-max-width)] flex-col bg-bg shadow-2xl">
        {selected ? (
          <ServingsStep
            food={selected}
            meal={meal}
            onBack={() => {
              if (openedFromBarcode) {
                close();
                return;
              }
              setSelected(null);
            }}
            onConfirm={async ({
              quantity,
              unitMode,
              selectedUnit,
              meal: chosenMeal,
            }) => {
              if (!chosenMeal) {
                throw new Error("Meal is required");
              }
              const result = await addFoodEntryAction({
                foodId: selected.id,
                dateKey,
                loggedOnKey,
                meal: chosenMeal,
                quantity,
                unitMode,
                selectedUnit,
              });
              if (!result.ok) {
                throw new Error(result.error);
              }
              close();
            }}
          />
        ) : (
          <FoodPicker
            initialRecents={initialRecents}
            initialFavorites={initialFavorites}
            initialAll={initialAll}
            subtitle={
              <>
                Adding to{" "}
                <span className="font-medium text-text">{mealLabel(meal)}</span>
              </>
            }
            onSelect={setSelected}
            onClose={close}
            footer={
              <div className="border-t border-border p-4">
                <Link
                  href={`/foods/new?returnTo=${encodeURIComponent(`/diary/${dateKey}?add=${meal}`)}`}
                  className="flex w-full items-center justify-center rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-accent transition hover:bg-surface"
                >
                  + Create custom food
                </Link>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
