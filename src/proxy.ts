import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Only run on app pages that need a session. Do not match `/_next/*` (HMR/RSC),
 * `/api/*`, `/sign-in`, or static assets — a broad matcher redirects those to
 * `/sign-in` without a cookie and can spam full reloads in dev.
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
