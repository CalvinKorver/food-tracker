import { prisma } from "@/lib/db";

/** Default seeded user until auth exists. */
export const DEFAULT_USER_EMAIL = "calvin@foodtracker.local";

export async function getCurrentUser() {
  const user = await prisma.user.findUnique({
    where: { email: DEFAULT_USER_EMAIL },
  });

  if (!user) {
    throw new Error(
      `Default user ${DEFAULT_USER_EMAIL} not found. Run: npm run db:seed`,
    );
  }

  return user;
}
