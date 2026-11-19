import { useEffect, useMemo, type ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ApiError, createApiClient, type ApiClient } from "./api";
import { AuthProvider, useAuth } from "./auth";
import { clearBearerTokens, persistBearerTokens } from "./auth/bearer-storage";
import {
  peekAccessToken,
  rememberAccessToken,
} from "./auth/token-memory";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "./auth/tokens";
import { AppShell } from "./components/shell/AppShell";
import { AppConfigProvider } from "./config";
import { ConsentPage } from "./pages/ConsentPage";
import { DiaryPage } from "./pages/DiaryPage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { FoodFormPage } from "./pages/FoodFormPage";
import { FoodsPage } from "./pages/FoodsPage";
import { GoalsPage } from "./pages/GoalsPage";
import { MealTimesPage } from "./pages/MealTimesPage";
import { MorePage } from "./pages/MorePage";
import { RecipePage } from "./pages/RecipePage";
import { SignInPage } from "./pages/SignInPage";
import {
  defaultPlatformAdapters,
  PlatformProviders,
  usePlatform,
} from "./platform";
import { ThemeProvider } from "./theme/ThemeProvider";
import type { FoodTrackerAppProps } from "./types";

function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <p className="pt-8 text-sm text-text-muted">Loading…</p>;
  }
  if (!user) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** On resume, refresh only diary/foods — not every search/cache key. */
function VisibilityRefetch() {
  const { lifecycle } = usePlatform();
  const queryClient = useQueryClient();
  useEffect(() => {
    let last = 0;
    return lifecycle.subscribe(() => {
      const now = Date.now();
      if (now - last < 30_000) return;
      last = now;
      void queryClient.invalidateQueries({ queryKey: ["diary"] });
      void queryClient.invalidateQueries({ queryKey: ["foods"] });
      void queryClient.invalidateQueries({ queryKey: ["discover"] });
    });
  }, [lifecycle, queryClient]);
  return null;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/consent" element={<ConsentPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Navigate to="/diary/today" replace />} />
          <Route path="/diary/:date" element={<DiaryPage />} />
          <Route path="/foods" element={<FoodsPage />} />
          <Route path="/foods/new" element={<FoodFormPage mode="create" />} />
          <Route path="/foods/:id/edit" element={<FoodFormPage mode="edit" />} />
          <Route path="/foods/recipes/new" element={<RecipePage />} />
          <Route path="/foods/recipes/:id/edit" element={<RecipePage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="/more/goals" element={<GoalsPage />} />
          <Route path="/more/meal-times" element={<MealTimesPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/diary/today" replace />} />
      </Route>
    </Routes>
  );
}

function AppTree({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <VisibilityRefetch />
          {children}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export function FoodTrackerApp({
  baseUrl = "",
  authMode = "cookie",
  adapters,
  routerBasename,
  children,
}: FoodTrackerAppProps) {
  const resolvedAdapters = useMemo(
    () => defaultPlatformAdapters(adapters),
    [adapters],
  );

  const api = useMemo(() => {
    let refreshInFlight: Promise<string | null> | null = null;
    let loadAccessInFlight: Promise<string | null> | null = null;
    let client!: ApiClient;

    client = createApiClient({
      baseUrl,
      getAccessToken: async () => {
        if (authMode !== "bearer") return null;
        const peeked = peekAccessToken();
        if (peeked !== undefined) return peeked;
        if (!loadAccessInFlight) {
          loadAccessInFlight = resolvedAdapters.storage
            .get(ACCESS_TOKEN_KEY)
            .then((stored) => {
              rememberAccessToken(stored);
              return stored;
            })
            .finally(() => {
              loadAccessInFlight = null;
            });
        }
        return loadAccessInFlight;
      },
      refreshAccessToken:
        authMode === "bearer"
          ? async () => {
              if (refreshInFlight) return refreshInFlight;
              refreshInFlight = (async () => {
                try {
                  const refresh = await resolvedAdapters.storage.get(
                    REFRESH_TOKEN_KEY,
                  );
                  if (!refresh) return null;
                  const pair = await client.refreshTokens(refresh);
                  await persistBearerTokens(resolvedAdapters.storage, {
                    accessToken: pair.accessToken,
                    refreshToken: pair.refreshToken,
                  });
                  return pair.accessToken;
                } catch {
                  return null;
                } finally {
                  refreshInFlight = null;
                }
              })();
              return refreshInFlight;
            }
          : undefined,
      onUnauthorized: () => {
        if (authMode !== "bearer") return;
        void clearBearerTokens(resolvedAdapters.storage);
      },
    });
    return client;
  }, [authMode, baseUrl, resolvedAdapters]);

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              const status = error instanceof ApiError ? error.status : undefined;
              if (status === 401 || status === 0) return false;
              return failureCount < 1;
            },
            staleTime: 15_000,
          },
        },
      }),
    [],
  );

  return (
    <PlatformProviders adapters={resolvedAdapters}>
      <AppConfigProvider baseUrl={baseUrl} authMode={authMode} api={api}>
        <AppTree queryClient={queryClient}>
          <BrowserRouter basename={routerBasename}>
            <AppRoutes />
            {children}
          </BrowserRouter>
        </AppTree>
      </AppConfigProvider>
    </PlatformProviders>
  );
}
