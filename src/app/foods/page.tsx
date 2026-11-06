import Link from "next/link";
import { FoodListRow } from "@/components/foods/FoodListRow";
import { getCurrentUser } from "@/lib/current-user";
import { listAllCustomFoods } from "@/lib/foods";

export default async function FoodsPage() {
  const user = await getCurrentUser();
  const foods = await listAllCustomFoods(user.id);

  return (
    <div className="flex flex-col gap-4 pt-1">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Foods</h1>
        <Link
          href="/foods/new"
          className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-bg transition hover:bg-accent-hover"
        >
          Add custom
        </Link>
      </header>

      {foods.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-4 py-10 text-center text-sm text-text-muted">
          No custom foods yet
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-surface">
          {foods.map((food) => (
            <FoodListRow key={food.id} food={food} />
          ))}
        </div>
      )}
    </div>
  );
}
