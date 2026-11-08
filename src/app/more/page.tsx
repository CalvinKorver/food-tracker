import { GoalsForm } from "@/components/more/GoalsForm";
import { getCurrentUser } from "@/lib/current-user";
import { goalsFromUser } from "@/lib/goals";

export default async function MorePage() {
  const user = await getCurrentUser();
  const goals = goalsFromUser(user);

  return (
    <div className="flex flex-col gap-6 pt-1">
      <h1 className="text-lg font-semibold tracking-tight">More</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-semibold text-text">Goals</h2>
        <p className="text-sm text-text-muted">
          Set daily calorie and macro targets. Macro calories should add up to
          your calorie goal.
        </p>
        <GoalsForm initial={goals} />
      </section>
    </div>
  );
}
