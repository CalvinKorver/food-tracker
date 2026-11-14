import type { ApiErr, ApiOk, ApiResult } from "@food-tracker/contracts";

export class ApiError extends Error {
  status: number;
  field?: string;

  constructor(message: string, status = 400, field?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.field = field;
  }
}

export function isApiOk<T>(value: unknown): value is ApiOk<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as ApiOk<T>).ok === true &&
    "data" in value
  );
}

export function isApiErr(value: unknown): value is ApiErr {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as ApiErr).ok === false &&
    typeof (value as ApiErr).error === "string"
  );
}

/** Parse a `{ ok, data | error }` JSON envelope from `/api/v1`. */
export function parseApiEnvelope<T>(json: unknown): ApiResult<T> {
  if (isApiOk<T>(json)) return json;
  if (isApiErr(json)) {
    return { ok: false, error: json.error, field: json.field };
  }
  return { ok: false, error: "Unexpected API response" };
}

export function unwrapApiEnvelope<T>(json: unknown, status: number): T {
  const parsed = parseApiEnvelope<T>(json);
  if (parsed.ok) return parsed.data;
  throw new ApiError(parsed.error, status, parsed.field);
}
