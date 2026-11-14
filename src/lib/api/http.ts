import { NextResponse } from "next/server";
import { ZodError, z, type ZodType } from "zod";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true as const, data }, init);
}

export function jsonErr(
  error: string,
  status = 400,
  extra?: { field?: string },
) {
  return NextResponse.json(
    { ok: false as const, error, field: extra?.field },
    { status },
  );
}

export function fromZodError(err: ZodError) {
  const issue = err.issues[0];
  return jsonErr(issue?.message ?? "Invalid request", 400, {
    field: issue?.path?.join(".") || undefined,
  });
}

export async function readJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
  options?: { maxBytes?: number },
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const maxBytes = options?.maxBytes ?? 2_000_000;
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) {
    return { ok: false, response: jsonErr("Request body too large", 413) };
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: jsonErr("Invalid JSON body", 400) };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: fromZodError(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}

export function parseUuidParam(id: string) {
  return z.string().uuid().safeParse(id);
}
