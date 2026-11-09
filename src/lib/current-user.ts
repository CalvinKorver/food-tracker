import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Seeded account email (stdio MCP + seed). */
export const DEFAULT_USER_EMAIL = "calvin@foodtracker.local";

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

/** Trusted local/stdio path: resolve by email, no browser session. */
export async function getUserByEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`User ${email} not found. Run: npm run db:seed`);
  }
  return user;
}
