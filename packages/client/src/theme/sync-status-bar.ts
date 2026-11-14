import type { ResolvedTheme } from "@food-tracker/domain";

type StatusBarModule = typeof import("@capacitor/status-bar");

let cached: { native: false } | { native: true; statusBar: StatusBarModule } | null =
  null;

/**
 * Capacitor Style.Dark = light text (dark bg); Style.Light = dark text (light bg).
 */
export async function syncStatusBarForTheme(theme: ResolvedTheme): Promise<void> {
  try {
    if (!cached) {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) {
        cached = { native: false };
        return;
      }
      cached = {
        native: true,
        statusBar: await import("@capacitor/status-bar"),
      };
    }
    if (!cached.native) return;
    const { StatusBar, Style } = cached.statusBar;
    await StatusBar.setStyle({
      style: theme === "dark" ? Style.Dark : Style.Light,
    });
  } catch {
    cached = { native: false };
  }
}
