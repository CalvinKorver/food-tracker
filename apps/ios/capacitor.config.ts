import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Release config: the WebView loads only the bundled `dist` assets.
 * Do not set `server.url` here — that is live-reload only and would
 * point the production app at a remote origin.
 *
 * Live reload (local device debugging only), e.g. capacitor.config.dev.ts:
 *   server: { url: "http://YOUR_LAN_IP:5173", cleartext: true }
 * Then run the Vite dev server (`npm run ios:dev`) and `npx cap sync`
 * against that file. Never ship a TestFlight/App Store build with server.url.
 *
 * Navigation allowlist: omit `server.allowNavigation` so the WebView stays
 * on local Capacitor assets (`capacitor://localhost`). API traffic uses
 * `fetch` to `VITE_API_BASE_URL` over HTTPS, not WebView navigation.
 *
 * Native iOS min version is 15.5 (Podfile / Xcode) because
 * GoogleMLKit/BarcodeScanning 7 requires it.
 */
const config: CapacitorConfig = {
  appId: "app.foodtracker.ios",
  appName: "Hungry",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  ios: {
    // CSS owns safe areas via viewport-fit=cover + env(safe-area-inset-*).
    contentInset: "never",
    preferredContentMode: "mobile",
  },
  plugins: {
    Camera: {
      presentationStyle: "fullscreen",
    },
    StatusBar: {
      // ThemeProvider sets Style.Dark/Light at runtime for the resolved theme.
      style: "DEFAULT",
    },
    Keyboard: {
      resize: "body",
    },
  },
};

export default config;
