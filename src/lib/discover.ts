import type { DiscoverWindowDto } from "@food-tracker/contracts";
import {
  computeDiscoverWindow,
  dateFromKey,
  dateKeyFromUtcDate,
  discoverDateKeys,
} from "@food-tracker/domain";
import type { User } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { goalsFromUser } from "@/lib/goals";

export async function getDiscoverWindowForUser(
  user: User,
  now = new Date(),
): Promise<DiscoverWindowDto> {
  const keys = discoverDateKeys(user.timezone, now);
  const startDate = dateFromKey(keys[0]!);
  const endDate = dateFromKey(keys[keys.length - 1]!);

  const rows = await prisma.foodEntry.findMany({
    where: {
      userId: user.id,
      loggedOn: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      loggedOn: true,
      caloriesSnapshot: true,
      proteinGSnapshot: true,
      carbsGSnapshot: true,
      fatGSnapshot: true,
      fiberGSnapshot: true,
      sugarGSnapshot: true,
      sodiumMgSnapshot: true,
    },
    orderBy: { loggedOn: "asc" },
  });

  const entries = rows.map((row) => ({
    dateKey: dateKeyFromUtcDate(row.loggedOn),
    caloriesSnapshot: row.caloriesSnapshot,
    proteinGSnapshot: row.proteinGSnapshot,
    carbsGSnapshot: row.carbsGSnapshot,
    fatGSnapshot: row.fatGSnapshot,
    fiberGSnapshot: row.fiberGSnapshot,
    sugarGSnapshot: row.sugarGSnapshot,
    sodiumMgSnapshot: row.sodiumMgSnapshot,
  }));

  return computeDiscoverWindow({
    timeZone: user.timezone,
    now,
    goals: goalsFromUser(user),
    entries,
  });
}
