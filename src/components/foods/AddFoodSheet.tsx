"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
  dayCalories?: number;
  dayProteinG?: number;
  dayFatG?: number;
  calorieGoal?: number | null;
  proteinGoalG?: number | null;
  fatGoalG?: number | null;
  calorieNagEnabled?: boolean;
};

const SLIDE = { type: "spring" as const, stiffness: 420, damping: 36 };

export function AddFoodSheet({
  meal,
  dateKey,
  loggedOnKey,
  initialRecents,
  initialFavorites,
  initialAll,
  initialSelected = null,
  dayCalories = 0,
  dayProteinG = 0,
  dayFatG = 0,
  calorieGoal = null,
  proteinGoalG = null,
  fatGoalG = null,
  calorieNagEnabled = false,
}: AddFoodSheetProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<FoodListItem | null>(
    initialSelected,
  );
  const [openedFromBarcode] = useState(Boolean(initialSelected));

  const close = (opts?: { nagConceded?: boolean }) => {
    const path = opts?.nagConceded
      ? `/diary/${dateKey}?nagConceded=1`
      : `/diary/${dateKey}`;
    router.push(path, { transitionTypes: ["sheet-close"] });
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/50">
      <div className="relative flex h-dvh w-full max-w-[var(--app-max-width)] flex-col overflow-hidden bg-bg shadow-2xl">
        <div
          className={
            selected
              ? "invisible absolute inset-0 flex flex-col"
              : "flex min-h-0 flex-1 flex-col"
          }
          aria-hidden={selected ? true : undefined}
        >
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
        </div>

        <AnimatePresence initial={false}>
          {selected ? (
            <motion.div
              key={selected.id}
              className="absolute inset-0 flex flex-col bg-bg"
              initial={reduceMotion ? { opacity: 0 } : { x: "100%" }}
              animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { x: "100%" }}
              transition={reduceMotion ? { duration: 0.15 } : SLIDE}
            >
              <ServingsStep
                food={selected}
                meal={meal}
                calorieNag={{
                  enabled: calorieNagEnabled,
                  dayCalories,
                  dayProteinG,
                  dayFatG,
                  calorieGoal,
                  proteinGoalG,
                  fatGoalG,
                }}
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
                  viaCalorieNag,
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
                  close({ nagConceded: viaCalorieNag });
                }}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
