import { z } from "zod";
import { auth } from "@/lib/auth";
import { withCors } from "@/lib/api/cors";
import { jsonErr, jsonOk, readJsonBody } from "@/lib/api/http";

export { OPTIONS } from "@/app/api/v1/_cors";

const requestSchema = z.object({
  email: z.string().email(),
  redirectTo: z.string().url().optional(),
});

/**
 * Request a password-reset email. Always returns ok to avoid account enumeration.
 * Delivery depends on Better Auth `sendResetPassword` (logged in local/dev).
 */
export async function POST(request: Request) {
  const parsed = await readJsonBody(request, requestSchema);
  if (!parsed.ok) return withCors(request, parsed.response);

  try {
    await auth.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo: parsed.data.redirectTo,
      },
      headers: request.headers,
    });
  } catch (err) {
    console.warn("[auth] password reset request failed", err);
  }

  return withCors(
    request,
    jsonOk({
      requested: true,
      message:
        "If an account exists for that email, reset instructions were sent.",
    }),
  );
}

export async function PUT(request: Request) {
  const schema = z.object({
    token: z.string().min(1),
    newPassword: z.string().min(8),
  });
  const parsed = await readJsonBody(request, schema);
  if (!parsed.ok) return withCors(request, parsed.response);

  try {
    await auth.api.resetPassword({
      body: {
        token: parsed.data.token,
        newPassword: parsed.data.newPassword,
      },
      headers: request.headers,
    });
    return withCors(request, jsonOk({ reset: true }));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not reset password";
    return withCors(request, jsonErr(message, 400));
  }
}
