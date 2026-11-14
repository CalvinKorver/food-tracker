import { apiRequestHeaders } from "../api/headers";
import {
  AUTH_AUTHORIZE_PATH,
  AUTH_TOKEN_PATH,
  DEFAULT_OAUTH_CLIENT_ID,
  DEFAULT_OAUTH_REDIRECT_URI,
  DEFAULT_OAUTH_SCOPES,
} from "./tokens";

export type PkcePair = {
  verifier: string;
  challenge: string;
  method: "S256";
};

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of arr) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function generatePkce(): Promise<PkcePair> {
  const random = crypto.getRandomValues(new Uint8Array(32));
  const verifier = toBase64Url(random);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return {
    verifier,
    challenge: toBase64Url(digest),
    method: "S256",
  };
}

export type BuildAuthorizeUrlOptions = {
  baseUrl?: string;
  clientId?: string;
  redirectUri?: string;
  scopes?: string;
  challenge: string;
  state: string;
  resource?: string;
};

export function buildAuthorizeUrl({
  baseUrl = "",
  clientId = DEFAULT_OAUTH_CLIENT_ID,
  redirectUri = DEFAULT_OAUTH_REDIRECT_URI,
  scopes = DEFAULT_OAUTH_SCOPES,
  challenge,
  state,
  resource,
}: BuildAuthorizeUrlOptions): string {
  const origin = baseUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  });
  if (resource) params.set("resource", resource);
  return `${origin}${AUTH_AUTHORIZE_PATH}?${params}`;
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  id_token?: string;
  error?: string;
  error_description?: string;
};

export type ExchangeCodeOptions = {
  baseUrl?: string;
  code: string;
  verifier: string;
  redirectUri?: string;
  clientId?: string;
  resource?: string;
};

export async function exchangeAuthorizationCode({
  baseUrl = "",
  code,
  verifier,
  redirectUri = DEFAULT_OAUTH_REDIRECT_URI,
  clientId = DEFAULT_OAUTH_CLIENT_ID,
  resource,
}: ExchangeCodeOptions): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  });
  if (resource) body.set("resource", resource);

  const origin = baseUrl.replace(/\/$/, "");
  const response = await fetch(`${origin}${AUTH_TOKEN_PATH}`, {
    method: "POST",
    credentials: "include",
    headers: apiRequestHeaders(origin, {
      "Content-Type": "application/x-www-form-urlencoded",
    }),
    body,
  });
  const json = (await response.json().catch(() => null)) as TokenResponse | null;
  if (!json?.access_token) {
    const message =
      json?.error_description ?? json?.error ?? "Token exchange failed";
    throw new Error(message);
  }
  return json;
}

export function randomOAuthState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return toBase64Url(bytes);
}

export function apiResourceFromBaseUrl(baseUrl: string): string {
  if (baseUrl) return `${baseUrl.replace(/\/$/, "")}/api/v1`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/v1`;
  }
  return "/api/v1";
}
