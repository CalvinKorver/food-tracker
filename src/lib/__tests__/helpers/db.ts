import { prisma } from "@/lib/db";

/** Wipe domain tables in FK-safe order. Keeps schema; no seed. */
export async function resetTestDb() {
  await prisma.favorite.deleteMany();
  await prisma.foodEntry.deleteMany();
  await prisma.food.deleteMany();
  await prisma.user.deleteMany();
}

export async function createTestUser(overrides?: {
  email?: string;
  displayName?: string;
  timezone?: string;
}) {
  return prisma.user.create({
    data: {
      email: overrides?.email ?? `test-${crypto.randomUUID()}@foodtracker.local`,
      displayName: overrides?.displayName ?? "Test User",
      timezone: overrides?.timezone ?? "America/Los_Angeles",
    },
  });
}

export { prisma };
