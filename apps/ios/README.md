# Hungry iOS (Capacitor)

Bundled Capacitor 7 host for the shared `@food-tracker/client` SPA. The
WebView loads **only local `dist` assets**. API calls go to
`VITE_API_BASE_URL` over HTTPS with bearer tokens (PKCE).

OAuth client id: `foodtracker-ios`  
Redirect URI: `foodtracker://oauth/callback`

## Prerequisites

- Node.js 20+
- macOS with Xcode (for `npx cap add ios`, Simulator, device, and TestFlight)
- iOS 15.5+ (Google ML Kit barcode scanning)
- A deployed Hungry API over HTTPS

If Xcode / CocoaPods are missing, you can still build web assets here. Run
`npx cap add ios` later on a Mac with Xcode.

## Setup

From the repo root:

```bash
npm install
```

Copy env and point at your API (no trailing slash):

```bash
cp apps/ios/.env.example apps/ios/.env
```

```bash
# apps/ios/.env
VITE_API_BASE_URL=https://your-deployed-app.example
```

The API must allow the Capacitor origin in `CAPACITOR_ORIGINS` (see the
root `.env.example`), e.g. `capacitor://localhost`.

## Build, sync, open Xcode

```bash
npm run ios:build    # vite build → apps/ios/dist
npm run ios:sync     # build + cap sync ios
npm run ios:open     # open the Xcode workspace
```

Equivalent from this package:

```bash
cd apps/ios
npx vite build
npx cap add ios      # once, creates the native project
npx cap sync ios
npx cap open ios
```

`npx cap add ios` is a one-time step. This repo already contains `apps/ios/ios/`
from that command. Re-running `cap add ios` will fail if the folder exists.

Google ML Kit requires **iOS 15.5+**. The Podfile and Xcode project are set to
that deployment target. If `cap sync` regenerates `platform :ios, '14.0'`,
bump it back to `15.5` before `pod install`.

Dev server (Safari / desktop only — not the release WebView):

```bash
npm run ios:dev
```

### Live reload (optional, never ship)

Do **not** set `server.url` in `capacitor.config.ts`. For local device
debugging only, use a throwaway config:

```ts
// capacitor.config.dev.ts — do not use for TestFlight / App Store
server: { url: "http://YOUR_LAN_IP:5173", cleartext: true }
```

Run `npm run ios:dev`, then sync against that file. Production builds must
keep loading bundled `dist`.

## Native project: Info.plist, URL scheme, ATS

After `cap add ios`, apply the strings in [`ios-permissions.md`](ios-permissions.md):

- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`
- URL scheme `foodtracker` so `foodtracker://oauth/callback` returns to the app

**App Transport Security:** API traffic must be HTTPS. Do not add arbitrary
ATS exceptions for production. An HTTP exception is only acceptable for
temporary live-reload against a LAN Vite server.

**Navigation allowlist:** `capacitor.config.ts` omits `server.allowNavigation`.
The WebView stays on local Capacitor assets (`capacitor://localhost`). Do not
add the API host to `allowNavigation` — that would let the WebView navigate
away from the bundle. `fetch` to `VITE_API_BASE_URL` does not need an
allowlist entry.

## Privacy / storage notes

- Camera and barcode scanning need the usage strings above.
- Tokens are stored with `@capacitor/preferences` (UserDefaults) for v1.
  Migrate to Keychain before treating this as a hardened production store.

## TestFlight

1. Set `VITE_API_BASE_URL` to the production HTTPS API and rebuild (`ios:sync`).
2. Confirm `capacitor.config.ts` has **no** `server.url`.
3. Open Xcode → select a Development Team → Archive → Distribute (TestFlight).
4. Bump iOS build number for each upload (`CURRENT_PROJECT_VERSION`).
5. Fill App Privacy / camera usage in App Store Connect to match Info.plist.

## Device test checklist

- [ ] Fresh install launches the bundled UI (not a remote `server.url`).
- [ ] Missing `.env` shows the “Missing API URL” screen; after setting it, the sign-in page loads.
- [ ] Email/password is not the native path — use **Continue with app login** (PKCE, client `foodtracker-ios`).
- [ ] System/in-app browser opens the authorize URL on `VITE_API_BASE_URL`.
- [ ] Redirect `foodtracker://oauth/callback?code=…&state=…` returns to the app and a session is established.
- [ ] Killing and relaunching the app restores the session (Preferences-backed tokens).
- [ ] Diary / foods / more load data from the HTTPS API (Charles/Proxyman or Xcode console).
- [ ] Plus → scan barcode: ML Kit scanner (or typed fallback) looks up a food.
- [ ] Plus → scan label: camera permission prompt, JPEG capture, OCR prefill.
- [ ] Background the app and return: queries refetch (appStateChange).
- [ ] External links open in the Capacitor Browser, not the WebView.
- [ ] Airplane mode shows the client error banner; reconnecting recovers.
- [ ] Sign out clears tokens; next launch shows sign-in.
- [ ] TestFlight build still uses local `dist` and the production API URL.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Blank WebView | `dist` missing — run `ios:build` then `cap sync`. |
| CORS errors | API `CAPACITOR_ORIGINS` includes `capacitor://localhost`. |
| OAuth never returns | Info.plist URL scheme `foodtracker`; redirect URI exact match. |
| Camera crash | Usage description strings missing from Info.plist. |
| Calls hit `capacitor://localhost/api` | `VITE_API_BASE_URL` unset at **build** time — Vite inlines env. |
| `pod install` / `cap sync` fails with xcodebuild | Point `xcode-select` at full Xcode, then accept the license (see below). |

### Xcode license / Command Line Tools

`npx cap add ios` already created `apps/ios/ios/` (bundle id `app.foodtracker.ios`,
web assets copied, Info.plist URL scheme + camera strings applied). CocoaPods
still needs a licensed full Xcode, not only Command Line Tools:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license
cd apps/ios && npx cap sync ios
```

ML Kit also needs `platform :ios, '15.5'` in `ios/App/Podfile` (already set).
