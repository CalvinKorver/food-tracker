import { describe, expect, it } from "vitest";
import { buildAuthorizeUrl, generatePkce } from "./pkce";

describe("generatePkce", () => {
  it("returns an S256 verifier and matching challenge", async () => {
    const pair = await generatePkce();
    expect(pair.method).toBe("S256");
    expect(pair.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(pair.challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(pair.challenge).not.toBe(pair.verifier);

    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(pair.verifier),
    );
    const bytes = new Uint8Array(digest);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    const expected = btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    expect(pair.challenge).toBe(expected);
  });

  it("builds the Better Auth oauth2 authorize URL", () => {
    const url = buildAuthorizeUrl({
      baseUrl: "https://food.example",
      challenge: "abc",
      state: "st",
      resource: "https://food.example/api/v1",
    });
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/api/auth/oauth2/authorize");
    expect(parsed.searchParams.get("code_challenge")).toBe("abc");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("client_id")).toBe("foodtracker-ios");
    expect(parsed.searchParams.get("resource")).toBe(
      "https://food.example/api/v1",
    );
  });
});
