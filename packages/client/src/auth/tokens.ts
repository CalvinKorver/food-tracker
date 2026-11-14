export const ACCESS_TOKEN_KEY = "ft.accessToken";
export const REFRESH_TOKEN_KEY = "ft.refreshToken";
export const PKCE_VERIFIER_KEY = "ft.pkceVerifier";
export const PKCE_STATE_KEY = "ft.pkceState";

export const DEFAULT_OAUTH_CLIENT_ID = "foodtracker-ios";
export const DEFAULT_OAUTH_REDIRECT_URI = "foodtracker://oauth/callback";
export const DEFAULT_OAUTH_SCOPES =
  "openid profile offline_access api:read api:write";

/** Better Auth MCP/oauth-provider paths, mounted under `/api/auth`. */
export const AUTH_AUTHORIZE_PATH = "/api/auth/oauth2/authorize";
export const AUTH_TOKEN_PATH = "/api/auth/oauth2/token";
export const AUTH_SIGN_IN_EMAIL_PATH = "/api/auth/sign-in/email";
export const AUTH_SIGN_OUT_PATH = "/api/auth/sign-out";
