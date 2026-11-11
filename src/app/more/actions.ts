"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { parseGoalInput } from "@/lib/goals";
import { parseMealWindowsInput } from "@/lib/meal-windows";

function formRecord(formData: FormData): Record<string, unknown> {
  return Object.fromEntries(formData.entries());
}

export async function saveGoalsAction(formData: FormData) {
  const parsed = parseGoalInput(formRecord(formData));
  if (!parsed.ok) {
    return { ok: false as const, error: parsed.error.message };
  }

  const user = await getCurrentUser();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      calorieGoal: parsed.data.calorieGoal,
      proteinGoalG: parsed.data.proteinGoalG,
      carbsGoalG: parsed.data.carbsGoalG,
      fatGoalG: parsed.data.fatGoalG,
    },
  });

  revalidatePath("/more");
  revalidatePath("/more/goals");
  revalidatePath("/diary/today");
  revalidatePath("/diary", "layout");

  return { ok: true as const };
}

export async function saveMealWindowsAction(formData: FormData) {
  const parsed = parseMealWindowsInput(formRecord(formData));
  if (!parsed.ok) {
    return { ok: false as const, error: parsed.error };
  }

  const user = await getCurrentUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { mealWindows: parsed.data },
  });

  revalidatePath("/more");
  revalidatePath("/more/meal-times");
  revalidatePath("/", "layout");

  return { ok: true as const };
}

export async function saveCalorieNagAction(enabled: boolean) {
  const user = await getCurrentUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { calorieNagEnabled: enabled },
  });

  revalidatePath("/more");
  revalidatePath("/diary", "layout");

  return { ok: true as const };
}
