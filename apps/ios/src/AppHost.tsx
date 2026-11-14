import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import {
  DEFAULT_OAUTH_REDIRECT_URI,
  FoodTrackerApp,
  PKCE_STATE_KEY,
  useAuth,
  usePlatform,
} from "@food-tracker/client";
import { iosPlatformAdapters } from "./adapters";

function parseOAuthCallback(
  url: string,
): { code: string; state: string | null } | null {
  if (!url.startsWith(DEFAULT_OAUTH_REDIRECT_URI)) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const code = parsed.searchParams.get("code");
  if (!code) return null;
  return { code, state: parsed.searchParams.get("state") };
}

function PkceDeepLinkBridge() {
  const { completePkceLogin } = useAuth();
  const { storage } = usePlatform();

  useEffect(() => {
    let cancelled = false;

    async function handleUrl(url: string) {
      const parsed = parseOAuthCallback(url);
      if (!parsed || cancelled) return;
      const expectedState = await storage.get(PKCE_STATE_KEY);
      if (
        parsed.state &&
        expectedState &&
        parsed.state !== expectedState
      ) {
        console.error("OAuth state mismatch; ignoring callback");
        return;
      }
      try {
        await completePkceLogin(parsed.code, {
          redirectUri: DEFAULT_OAUTH_REDIRECT_URI,
        });
        void Browser.close();
      } catch (err) {
        console.error("PKCE token exchange failed", err);
      }
    }

    const listener = App.addListener("appUrlOpen", ({ url }) => {
      void handleUrl(url);
    });

    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) void handleUrl(launch.url);
    });

    return () => {
      cancelled = true;
      void listener.then((handle) => handle.remove());
    };
  }, [completePkceLogin, storage]);

  return null;
}

export function AppHost() {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

  if (!baseUrl) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          padding: "2rem 1.25rem",
          fontFamily: "system-ui, sans-serif",
          color: "#111",
        }}
      >
        <h1 style={{ fontSize: "1.25rem" }}>Missing API URL</h1>
        <p>
          Set <code>VITE_API_BASE_URL</code> in <code>apps/ios/.env</code> to
          your Next.js origin, then rebuild.
        </p>
      </div>
    );
  }

  return (
    <FoodTrackerApp
      baseUrl={baseUrl}
      authMode="bearer"
      adapters={iosPlatformAdapters}
    >
      <PkceDeepLinkBridge />
    </FoodTrackerApp>
  );
}
