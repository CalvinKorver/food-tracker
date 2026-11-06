# Food Tracker

Cronometer-inspired meal diary (mobile web + desktop). Phase 1 scaffold in progress.

## Prerequisites

- Node.js 20+
- npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running

## Start locally (one command)

```bash
npm install
npm run local
```

That will:

1. Create `.env` from `.env.example` if needed  
2. Start Postgres with Docker Compose and wait until it’s healthy  
3. Generate the Prisma client, apply migrations, and seed  
4. Start the Next.js dev server  

Open the URL printed in the terminal (usually **http://localhost:3000**). It redirects to `/diary/today`.

If port 3000 is already used by another project, the app automatically picks the next free port and prints it.

### Day-to-day commands

| Command | When to use |
|---------|-------------|
| `npm run local` | Usual daily start (ensures DB + app) |
| `npm run setup` | Prep DB/env/Prisma without starting Next |
| `npm run dev` | Next only (Postgres already running) |
| `npm run db:up` / `db:down` | Start/stop Postgres manually |
| `npm run db:logs` | Tail Postgres logs |

Optional: `PORT=3005 npm run local` to force a specific port.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- PostgreSQL via Docker Compose (`localhost:5433` → container `5432`)
- Prisma 7 (`@prisma/adapter-pg`)

Default DB credentials (local only): user/password/db = `foodtracker`.

### Scan Label (OCR)

Plus → **Scan Label** uses OpenAI `gpt-4o-mini` vision. Add to `.env`:

```bash
OPENAI_API_KEY=sk-...
```

On a phone, open the app over **HTTPS** (e.g. ngrok) so the camera permission prompt works.

```bash
npm run db:migrate   # apply Prisma migrations
npm run db:seed      # default user + sample custom foods
```

### Database

| Command | Purpose |
|---------|---------|
| `npm run db:migrate` | Create/apply migrations (`prisma migrate dev`) |
| `npm run db:seed` | Seed default user + sample foods |
| `npm run db:reset` | Reset DB, re-apply migrations, seed |

## Testing

| Command | What |
|---------|------|
| `npm test` | Unit tests (no DB) |
| `npm run test:db:prepare` | Create `foodtracker_test` + migrate (needs Docker) |
| `npm run test:integration` | Integration tests against `DATABASE_URL_TEST` |

Add `DATABASE_URL_TEST` to `.env` (see `.env.example`). Integration tests truncate the test DB only — never point `DATABASE_URL_TEST` at your main `foodtracker` database.

## Troubleshooting

**“Docker is not running”** — open Docker Desktop, wait until it’s idle, then `npm run local` again.

**DB auth / role errors** — confirm `.env` uses port **5433** (not 5432). A different Postgres on 5432 is common on macOS.

**Wrong app on localhost:3000** — another project is bound to 3000; use the URL `npm run local` prints (it auto-selects a free port).
