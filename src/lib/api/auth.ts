import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";
import type { NextResponse } from "next/server";
import type { User } from "@/generated/prisma/client";

export type AuthedUser = User;

/**
 * Resolve the current user from a browser session cookie or Bearer access token.
 */
export async function getApiUser(
  request?: Request,
): Promise<AuthedUser | null> {
  const hdrs = request ? new Headers(request.headers) : await headers();

  const session = await auth.api.getSession({ headers: hdrs });
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (user) return user;
  }

  const authorization = hdrs.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();
  if (!token) return null;

  const row = await prisma.oauthAccessToken.findFirst({
    where: {
      token,
      revoked: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (row?.userId) {
    return prisma.user.findUnique({ where: { id: row.userId } });
  }

  return null;
}

export async function requireApiUser(
  request?: Request,
): Promise<
  { ok: true; user: AuthedUser } | { ok: false; response: NextResponse }
> {
  const user = await getApiUser(request);
  if (!user) {
    return { ok: false, response: jsonErr("Unauthorized", 401) };
  }
  return { ok: true, user };
}
