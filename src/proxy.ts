import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Cookie gate for app pages. API routes use requireApiUser (cookie or bearer).
 * /sign-in, /consent, /api/*, and static assets are excluded.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const signIn = new URL("/sign-in", request.url);
    const { pathname } = request.nextUrl;
    if (pathname && pathname !== "/") {
      signIn.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/diary",
    "/diary/:path*",
    "/foods",
    "/foods/:path*",
    "/more",
    "/more/:path*",
    "/discover",
    "/discover/:path*",
  ],
};
