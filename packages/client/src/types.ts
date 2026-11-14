import type { ReactNode } from "react";
import type { PlatformAdapters } from "./platform/types";

export type { PlatformAdapters } from "./platform/types";

export type AuthMode = "cookie" | "bearer";

export type FoodTrackerAppProps = {
  /** API origin with no trailing slash. Empty string = same origin. */
  baseUrl?: string;
  authMode?: AuthMode;
  adapters?: Partial<PlatformAdapters>;
  routerBasename?: string;
  /** Rendered inside AuthProvider (e.g. native deep-link bridges). */
  children?: ReactNode;
};

export type AppConfig = {
  baseUrl: string;
  authMode: AuthMode;
};
