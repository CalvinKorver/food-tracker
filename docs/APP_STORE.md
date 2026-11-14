# App Store submission checklist

Shared React client + Capacitor iOS (`apps/ios`). Website and iOS share `packages/client`; Next hosts `/api/v1` and MCP.

## Prerequisites

- [ ] Production Next deploy with HTTPS (`BETTER_AUTH_URL`, `DATABASE_URL`, secrets)
- [ ] `CAPACITOR_ORIGINS` includes `capacitor://localhost` (and any custom schemes)
- [ ] Seeded or provisioned App Review account (sign-up remains disabled)
- [ ] `VITE_API_BASE_URL` points at the production API for release builds
- [ ] Xcode installed, license accepted, CocoaPods synced (`cd apps/ios && npx cap sync ios`)

## Signing & identity

- [ ] Apple Developer Program membership
- [ ] Bundle ID `app.foodtracker.ios` registered
- [ ] App name, version, build number set in Xcode
- [ ] Distribution certificate + App Store provisioning profile
- [ ] App icons (1024 + asset catalog) and launch screen
- [ ] Supported devices / orientations configured

## Privacy & compliance

- [ ] Public privacy policy URL (host under the website, e.g. `/privacy`)
- [ ] Support / contact URL
- [ ] App Privacy nutrition labels: account email, nutrition diary, camera/photos for OCR, usage of OpenAI for label parsing
- [ ] Privacy Manifest (`PrivacyInfo.xcprivacy`) for included SDKs (ML Kit, etc.)
- [ ] Camera usage string: see `apps/ios/ios-permissions.md`
- [ ] In-app account deletion (`DELETE /api/v1/me`) reachable from More → Account
- [ ] Data export (`GET /api/v1/me/export`) reachable from More → Account
- [ ] Password reset request available (`POST /api/v1/auth/password-reset`) — wire real email in production
- [ ] Disclose server-side OCR (images sent to OpenAI) in privacy policy and review notes

## OAuth / auth

- [ ] iOS client `foodtracker-ios` seeded (or registered) with redirect `foodtracker://oauth/callback`
- [ ] URL scheme `foodtracker` registered in Info.plist
- [ ] PKCE authorize + token exchange against production
- [ ] Token revoke on sign-out
- [ ] No API keys or `BETTER_AUTH_SECRET` in the iOS bundle

## TestFlight

- [ ] Archive release build (no `server.url` in Capacitor config)
- [ ] Install on physical iPhone
- [ ] First launch, sign-in, diary add/delete, foods, goals, meal times
- [ ] Camera permission grant/deny paths for OCR
- [ ] Barcode scan (or manual fallback)
- [ ] Background / foreground refresh
- [ ] Offline launch shows error/reconnect (no silent failure)
- [ ] Dark mode + Dynamic Type smoke
- [ ] Account export + delete (use a disposable account)

## App Review package

- [ ] Screenshots for required device sizes
- [ ] Age rating questionnaire
- [ ] Review notes: camera, barcode, OCR/OpenAI, website parity, where to delete account
- [ ] Demo credentials for the seeded/review user
- [ ] Contact info for reviewer questions

## Release gate

- [ ] `npm test` and `npm run test:integration` green against staging DB
- [ ] `npm run build` (Next) green
- [ ] `npm run ios:build` green with production `VITE_API_BASE_URL`
- [ ] Production API reachable over TLS from device
- [ ] No development hosts, ngrok URLs, or secrets in the archive
