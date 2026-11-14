import { createContext, useContext, type ReactNode } from "react";
import type { ApiClient } from "./api";
import type { AppConfig, AuthMode } from "./types";

type AppContextValue = AppConfig & {
  api: ApiClient;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppConfigProvider({
  baseUrl,
  authMode,
  api,
  children,
}: {
  baseUrl: string;
  authMode: AuthMode;
  api: ApiClient;
  children: ReactNode;
}) {
  return (
    <AppContext.Provider value={{ baseUrl, authMode, api }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppConfig(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppConfig must be used within FoodTrackerApp");
  return ctx;
}

export function useApi(): ApiClient {
  return useAppConfig().api;
}
