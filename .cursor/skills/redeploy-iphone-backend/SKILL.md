---
name: redeploy-iphone-backend
description: >-
  Redeploy Hungry production backend on Railway and install/launch the
  Capacitor iOS app on a physical iPhone. Use when the user asks to redeploy,
  ship to device, reload the iPhone app, push to prod, or get changes onto
  their phone and backend.
---

# Redeploy iPhone + backend

Ship Hungry API to Railway production and load the native app onto the connected iPhone (not Simulator).

## Defaults

| Item | Value |
|------|--------|
| Prod URL | `https://food-baby.up.railway.app` |
| Railway project | `food-tracker` (`59685a36-43b7-4183-92b0-b76398a16dd6`) |
| Service | Food Baby Service (`a46c99e0-c9e1-49ab-9867-2c168da5280e`) |
| Environment | production (`970741f0-cbee-41b4-a42f-77062763a6e4`) |
| iOS bundle id | `app.foodtracker.ios` |
| iOS API env | `apps/ios/.env` → `VITE_API_BASE_URL=https://food-baby.up.railway.app` |
| CORS | Prod must have `CAPACITOR_ORIGINS=capacitor://localhost,ionic://localhost` |

**Never** run `prisma db seed` against production. `npm start` must not seed.

## Workflow

Copy and track:

```
Redeploy:
- [ ] 1. Backend: commit/push or confirm Railway deploy SUCCESS
- [ ] 2. Backend: CAPACITOR_ORIGINS set; CORS preflight OK
- [ ] 3. iOS: apps/ios/.env points at prod (no ngrok)
- [ ] 4. iOS: npm run ios:sync
- [ ] 5. iOS: build + install + launch on physical device
```

### 1. Backend

If local commits need shipping:

1. Commit only when the user asked (follow repo commit rules).
2. `git push origin HEAD` (usually `main` — Railway auto-deploys).

Watch deploy via Railway MCP:

- `list-deployments` for the Food Baby Service / production
- Wait until latest is **SUCCESS**
- Optional: `get-logs` with `types: ["deploy"]` if unhealthy

Ensure CORS for Capacitor (set once; skip if already present):

```text
CAPACITOR_ORIGINS=capacitor://localhost,ionic://localhost
```

Use Railway MCP `set-variables` on Food Baby Service. Prefer `skipDeploys: true` if a deploy is already in flight; otherwise restart or wait for the next deploy so the var is live.

Verify:

```bash
curl -sS -o /dev/null -w "%{http_code}" https://food-baby.up.railway.app/api/v1/me
# expect 401

curl -sS -D - -o /dev/null -X OPTIONS https://food-baby.up.railway.app/api/v1/me \
  -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: GET"
# expect 204 + access-control-allow-origin: capacitor://localhost
```

Do **not** print Railway secrets (DB URLs, API keys, auth secrets) in chat.

### 2. iOS env

`apps/ios/.env` is gitignored. It must be:

```bash
VITE_API_BASE_URL=https://food-baby.up.railway.app
```

No trailing slash. Vite inlines this at **build** time — sync after every env change.

### 3. Sync web assets into Capacitor

From repo root:

```bash
npm run ios:sync
```

Confirm prod host is in the bundle:

```bash
rg -l 'food-baby\.up\.railway\.app' apps/ios/dist apps/ios/ios/App/App/public
```

Abort if `ngrok` appears in those paths.

### 4. Install on physical iPhone

Discover device (prefer physical, ignore Simulator):

```bash
xcrun xctrace list devices
```

Use the UDID under **Devices** (e.g. `iPhone (...) (UDID)`).

Build (team already in project: `S8YCCCY27D`):

```bash
xcodebuild \
  -workspace apps/ios/ios/App/App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination "platform=iOS,id=DEVICE_UDID" \
  -allowProvisioningUpdates \
  -derivedDataPath apps/ios/ios/DerivedData \
  build
```

Install + launch:

```bash
APP=apps/ios/ios/DerivedData/Build/Products/Debug-iphoneos/App.app
xcrun devicectl device install app --device DEVICE_UDID "$APP"
xcrun devicectl device process launch --device DEVICE_UDID app.foodtracker.ios
```

Phone must be unlocked / trusted. If launch is blocked: Settings → General → VPN & Device Management → trust developer cert.

### 5. Report back

Tell the user briefly:

- Backend deploy status + prod URL
- That the app was installed/launched on the physical iPhone
- Reminder to sign in against prod if session was cleared

## Partial modes

| User asks | Do |
|-----------|-----|
| Backend only | Steps 1–2 |
| iPhone only | Steps 2–5 (skip push if API already good) |
| Full redeploy | All steps |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| CORS errors from app | Set/verify `CAPACITOR_ORIGINS`; restart/redeploy service |
| App hits wrong API | Fix `apps/ios/.env`, re-run `ios:sync`, reinstall |
| Blank WebView | `ios:sync` then reinstall |
| Signing failure | Unlock phone; `-allowProvisioningUpdates`; Team `S8YCCCY27D` |
| No physical device | Ask user to plug in / trust Mac; do not fall back to Simulator unless they ask |
| OAuth callback fails | Info.plist scheme `foodtracker`; client `foodtracker-ios` |

## Out of scope

- TestFlight / App Store archive (see `docs/APP_STORE.md`)
- Seeding or wiping production diary data
- Simulator installs (unless user explicitly asks)
