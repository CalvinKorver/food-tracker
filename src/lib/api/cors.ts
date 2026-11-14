import { NextResponse } from "next/server";
import { requireApiUser, type AuthedUser } from "@/lib/api/auth";
import { jsonErr } from "@/lib/api/http";

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const ALLOWED_HEADERS =
  "Authorization, Content-Type, Accept, X-Request-Id, ngrok-skip-browser-warning";

function capacitorOrigins(): string[] {
  return (process.env.CAPACITOR_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function requestOrigin(request: Request): string | null {
  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

export function isAllowedCorsOrigin(request: Request, origin: string): boolean {
  const normalized = origin.replace(/\/$/, "");
  const sameOrigin = requestOrigin(request);
  if (sameOrigin && normalized === sameOrigin) return true;
  return capacitorOrigins().includes(normalized);
}

/**
 * Allow credentialed CORS for same-origin web and native origins in
 * CAPACITOR_ORIGINS (comma-separated).
 */
export function withCors(request: Request, response: Response): Response {
  const origin = request.headers.get("origin");
  if (origin && isAllowedCorsOrigin(request, origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
    response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
    response.headers.set("Access-Control-Max-Age", "86400");
    response.headers.append("Vary", "Origin");
  }
  return response;
}

export function handleOptions(request: Request): Response {
  return withCors(request, new NextResponse(null, { status: 204 }));
}

export async function withApiUser(
  request: Request,
  handler: (user: AuthedUser) => Promise<Response>,
): Promise<Response> {
  const authed = await requireApiUser(request);
  if (!authed.ok) return withCors(request, authed.response);
  try {
    return withCors(request, await handler(authed.user));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return withCors(request, jsonErr(message, 500));
  }
}
