import Link from "next/link";
import { GoalsForm } from "@/components/more/GoalsForm";
import { getCurrentUser } from "@/lib/current-user";
import { goalsFromUser } from "@/lib/goals";

export default async function GoalsSettingsPage() {
  const user = await getCurrentUser();
  const goals = goalsFromUser(user);

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
        <h1 className="text-lg font-semibold tracking-tight">Goals</h1>
      </div>

      <section className="flex flex-col gap-3">
        <p className="text-sm text-text-muted">
          Set daily calorie and macro targets. Macro calories should add up to
          your calorie goal.
        </p>
        <GoalsForm initial={goals} />
      </section>
    </div>
  );
}
