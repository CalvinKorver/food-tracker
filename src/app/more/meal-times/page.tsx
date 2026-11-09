import Link from "next/link";
import { MealTimesForm } from "@/components/more/MealTimesForm";
import { getCurrentUser } from "@/lib/current-user";
import { mealWindowsFromUser } from "@/lib/meal-windows";

export default async function MealTimesSettingsPage() {
  const user = await getCurrentUser();
  const windows = mealWindowsFromUser(user);

  return (
    <div className="flex flex-col gap-6 pt-1">
      <div className="flex items-center gap-2">
        <Link
          href="/more"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-text-muted hover:bg-surface-hover"
          aria-label="Back to More"
        >
          ←
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">Meal times</h1>
      </div>

      <section className="flex flex-col gap-3">
        <p className="text-sm text-text-muted">
          Used to pre-select a meal when you add food. Based on your device
          clock.
        </p>
        <MealTimesForm initial={windows} />
      </section>
    </div>
  );
}
