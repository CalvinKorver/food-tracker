import { describe, expect, it } from "vitest";
import { isAllowedCorsOrigin } from "@/lib/api/cors";

describe("CORS origins", () => {
  it("allows same-origin requests", () => {
    const request = new Request("http://localhost:3000/api/v1/me", {
      headers: { origin: "http://localhost:3000" },
    });
    expect(isAllowedCorsOrigin(request, "http://localhost:3000")).toBe(true);
  });

  it("allows configured capacitor origins", () => {
    process.env.CAPACITOR_ORIGINS = "capacitor://localhost,ionic://localhost";
    const request = new Request("http://localhost:3000/api/v1/me", {
      headers: { origin: "capacitor://localhost" },
    });
    expect(isAllowedCorsOrigin(request, "capacitor://localhost")).toBe(true);
    expect(isAllowedCorsOrigin(request, "https://evil.example")).toBe(false);
  });
});
