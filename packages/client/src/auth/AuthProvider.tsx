import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SessionUserDto } from "@food-tracker/contracts";
import { ApiError } from "../api";
import { apiRequestHeaders } from "../api/headers";
import { useApi, useAppConfig } from "../config";
import { usePlatform } from "../platform";
import type { AuthMode } from "../types";
import {
  apiResourceFromBaseUrl,
  buildAuthorizeUrl,
  exchangeAuthorizationCode,
  generatePkce,
  randomOAuthState,
} from "./pkce";
import { clearBearerTokens, persistBearerTokens } from "./bearer-storage";
import { peekAccessToken } from "./token-memory";
import {
  ACCESS_TOKEN_KEY,
  AUTH_SIGN_IN_EMAIL_PATH,
  AUTH_SIGN_OUT_PATH,
  DEFAULT_OAUTH_CLIENT_ID,
  DEFAULT_OAUTH_REDIRECT_URI,
  PKCE_STATE_KEY,
  PKCE_VERIFIER_KEY,
  REFRESH_TOKEN_KEY,
} from "./tokens";

export type BearerTokens = {
  accessToken: string;
  refreshToken?: string;
};

type AuthContextValue = {
  user: SessionUserDto | null;
  loading: boolean;
  authMode: AuthMode;
  error: string | null;
  refreshUser: () => Promise<SessionUserDto | null>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setBearerTokens: (tokens: BearerTokens) => Promise<void>;
  startPkceLogin: (opts?: {
    clientId?: string;
    redirectUri?: string;
    scopes?: string;
  }) => Promise<string>;
  completePkceLogin: (
    code: string,
    opts?: { redirectUri?: string },
  ) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const { baseUrl, authMode } = useAppConfig();
  const { storage, links } = usePlatform();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.getMe();
      setUser(me);
      setError(null);
      return me;
    } catch (err) {
      setUser(null);
      if (err instanceof ApiError && err.status === 401) {
        return null;
      }
      if (err instanceof ApiError && err.status === 0) {
        setError(err.message);
        return null;
      }
      setError(err instanceof Error ? err.message : "Failed to load session");
      return null;
    }
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void refreshUser().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const setBearerTokens = useCallback(
    async (
      tokens: BearerTokens,
      opts?: { user?: SessionUserDto },
    ) => {
      await persistBearerTokens(storage, tokens);
      if (opts?.user) {
        setUser(opts.user);
        setError(null);
        return;
      }
      await refreshUser();
    },
    [refreshUser, storage],
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (authMode === "bearer") {
        const pair = await api.signInWithPassword(email, password);
        await setBearerTokens(
          {
            accessToken: pair.accessToken,
            refreshToken: pair.refreshToken,
          },
          { user: pair.user },
        );
        return;
      }

      const origin = baseUrl.replace(/\/$/, "");
      const response = await fetch(`${origin}${AUTH_SIGN_IN_EMAIL_PATH}`, {
        method: "POST",
        credentials: "include",
        headers: apiRequestHeaders(origin, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ email, password }),
      });
      const json = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        user?: unknown;
      } | null;
      if (!response.ok) {
        throw new Error(json?.message ?? json?.error ?? "Sign in failed");
      }
      const me = await refreshUser();
      if (!me) {
        throw new Error("Signed in but session could not be loaded");
      }
    },
    [api, authMode, baseUrl, refreshUser, setBearerTokens],
  );

  const signOut = useCallback(async () => {
    if (authMode === "bearer") {
      const access =
        peekAccessToken() ?? (await storage.get(ACCESS_TOKEN_KEY));
      const refresh = await storage.get(REFRESH_TOKEN_KEY);
      try {
        await api.revokeTokens({
          token: access ?? undefined,
          refreshToken: refresh ?? undefined,
        });
      } catch {
        // still clear local tokens
      }
      await clearBearerTokens(storage);
    } else {
      const origin = baseUrl.replace(/\/$/, "");
      try {
        await fetch(`${origin}${AUTH_SIGN_OUT_PATH}`, {
          method: "POST",
          credentials: "include",
          headers: apiRequestHeaders(origin),
        });
      } catch {
        // ignore network failures; local session still clears
      }
    }
    setUser(null);
    queryClient.clear();
  }, [api, authMode, baseUrl, queryClient, storage]);

  const startPkceLogin = useCallback(
    async (opts?: {
      clientId?: string;
      redirectUri?: string;
      scopes?: string;
    }) => {
      const pkce = await generatePkce();
      const state = randomOAuthState();
      await storage.set(PKCE_VERIFIER_KEY, pkce.verifier);
      await storage.set(PKCE_STATE_KEY, state);
      const url = buildAuthorizeUrl({
        baseUrl,
        clientId: opts?.clientId ?? DEFAULT_OAUTH_CLIENT_ID,
        redirectUri: opts?.redirectUri ?? DEFAULT_OAUTH_REDIRECT_URI,
        scopes: opts?.scopes,
        challenge: pkce.challenge,
        state,
        resource: apiResourceFromBaseUrl(baseUrl),
      });
      links.open(url);
      return url;
    },
    [baseUrl, links, storage],
  );

  const completePkceLogin = useCallback(
    async (code: string, opts?: { redirectUri?: string }) => {
      const verifier = await storage.get(PKCE_VERIFIER_KEY);
      if (!verifier) {
        throw new Error("Missing PKCE verifier — start login again");
      }
      const tokens = await exchangeAuthorizationCode({
        baseUrl,
        code,
        verifier,
        redirectUri: opts?.redirectUri,
        resource: apiResourceFromBaseUrl(baseUrl),
      });
      await storage.remove(PKCE_VERIFIER_KEY);
      await storage.remove(PKCE_STATE_KEY);
      await setBearerTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });
    },
    [baseUrl, setBearerTokens, storage],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      authMode,
      error,
      refreshUser,
      signInWithEmail,
      signOut,
      setBearerTokens,
      startPkceLogin,
      completePkceLogin,
    }),
    [
      user,
      loading,
      authMode,
      error,
      refreshUser,
      signInWithEmail,
      signOut,
      setBearerTokens,
      startPkceLogin,
      completePkceLogin,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
