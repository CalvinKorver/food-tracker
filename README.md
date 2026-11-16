# Hungry

Cronometer-inspired meal diary with a **shared React client** for the website and Capacitor iOS app. Next.js hosts the JSON API, Better Auth / MCP OAuth, and the web SPA.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/APP_STORE.md](docs/APP_STORE.md).

## Prerequisites

- Node.js 20+
- npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
- For iOS: macOS + Xcode (full app, license accepted)

## Start locally (website)

```bash
npm install
npm run local
```

Open the printed URL (usually **http://localhost:3000**). Sign in with `calvin@foodtracker.local` / `SEED_USER_PASSWORD`.

| Command | When to use |
|---------|-------------|
| `npm run local` | DB + Next |
| `npm run setup` | Prep DB/env/Prisma only |
| `npm run dev` | Next only |
| `npm test` | Unit tests |
| `npm run test:integration` | API/DB integration tests |
| `npm run test:e2e` | Playwright smoke (server must be up) |

## Monorepo layout

| Path | Role |
|------|------|
| `packages/contracts` | Shared Zod schemas / DTOs |
| `packages/domain` | Pure domain logic |
| `packages/client` | Shared SPA (`FoodTrackerApp`) |
| `apps/ios` | Capacitor + Vite iOS host |
| `src/app/api/v1` | Authenticated JSON API |
| `src/app/[[...slug]]` | Website host for the SPA |

## iOS (Capacitor)

```bash
cp apps/ios/.env.example apps/ios/.env
# Set VITE_API_BASE_URL to your Next origin (ngrok/staging/production)

npm run ios:build
npm run ios:sync   # requires Xcode + pods
npm run ios:open
```

Details: [apps/ios/README.md](apps/ios/README.md). Release builds **must not** set Capacitor `server.url`.

## Stack

- Next.js 16 (App Router) + shared React client + React Query + React Router
- PostgreSQL + Prisma 7
- Better Auth (cookie web sessions + OAuth bearer for iOS / MCP)
- Capacitor 7 for App Store packaging

## Privacy

Draft policy: [/privacy.html](public/privacy.html). Replace contact details before submission.
