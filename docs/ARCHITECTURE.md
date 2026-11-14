# Shared client architecture

```text
packages/contracts  — Zod schemas + Prisma-free DTOs
packages/domain     — pure calculations (quantity, goals, dates, …)
packages/client     — one React SPA (router, screens, adapters)
apps/ios            — Vite + Capacitor host (bearer / PKCE)
src/app             — Next host: SPA catch-all, /api/v1, auth, MCP, /consent
```

- **Website:** Next `[[...slug]]` mounts `FoodTrackerApp` with `authMode: "cookie"`.
- **iOS:** Capacitor loads bundled `dist` (no `server.url` in release) with `authMode: "bearer"`.
- **Server:** Prisma services stay in `src/lib/*`; route handlers under `/api/v1` authenticate via session cookie or OAuth access token.
