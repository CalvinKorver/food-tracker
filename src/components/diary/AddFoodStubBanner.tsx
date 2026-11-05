"use client";

import Link from "next/link";

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

type AddFoodStubBannerProps = {
  meal: string;
  dateKey: string;
};

export function AddFoodStubBanner({ meal, dateKey }: AddFoodStubBannerProps) {
  const label = MEAL_LABELS[meal] ?? meal;

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
      <p className="text-text">
        Add food to <span className="font-semibold">{label}</span> — coming next.
      </p>
      <Link
        href={`/diary/${dateKey}`}
        className="shrink-0 font-medium text-accent hover:text-accent-hover"
        aria-label="Dismiss"
      >
        Dismiss
      </Link>
    </div>
  );
}
