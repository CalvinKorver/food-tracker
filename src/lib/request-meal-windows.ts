import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  DEFAULT_MEAL_WINDOWS,
  mealWindowsFromUser,
  type MealWindows,
} from "@/lib/meal-windows";

/** Soft lookup for layout — never redirects. */
export async function getRequestMealWindows(): Promise<MealWindows> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) return DEFAULT_MEAL_WINDOWS;
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { mealWindows: true },
    });
    return mealWindowsFromUser(user);
  } catch {
    return DEFAULT_MEAL_WINDOWS;
  }
}
