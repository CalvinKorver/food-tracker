import { describe, expect, it } from "vitest";
import {
  ApiError,
  parseApiEnvelope,
  unwrapApiEnvelope,
} from "./envelope";

describe("parseApiEnvelope", () => {
  it("parses an ok envelope", () => {
    const result = parseApiEnvelope<{ id: string }>({
      ok: true,
      data: { id: "u1" },
    });
    expect(result).toEqual({ ok: true, data: { id: "u1" } });
  });

  it("parses an error envelope with a field", () => {
    const result = parseApiEnvelope({
      ok: false,
      error: "Invalid date",
      field: "date",
    });
    expect(result).toEqual({
      ok: false,
      error: "Invalid date",
      field: "date",
    });
  });

  it("rejects malformed payloads", () => {
    expect(parseApiEnvelope(null)).toEqual({
      ok: false,
      error: "Unexpected API response",
    });
    expect(parseApiEnvelope({ ok: true })).toEqual({
      ok: false,
      error: "Unexpected API response",
    });
  });

  it("unwraps data or throws ApiError", () => {
    expect(unwrapApiEnvelope({ ok: true, data: { n: 1 } }, 200)).toEqual({
      n: 1,
    });
    try {
      unwrapApiEnvelope({ ok: false, error: "Unauthorized", field: "auth" }, 401);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(401);
      expect((err as ApiError).field).toBe("auth");
      expect((err as ApiError).message).toBe("Unauthorized");
    }
  });
});
