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
3. Generate the Prisma client  
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
- PostgreSQL via Docker Compose (`localhost:5432`)
- Prisma 7 (`@prisma/adapter-pg`)

Default DB credentials (local only): user/password/db = `foodtracker`.

Schema models and seeding are not applied yet (later Phase 1 steps). The app UI runs without migrations for now.

## Troubleshooting

**“Docker is not running”** — open Docker Desktop, wait until it’s idle, then `npm run local` again.

**Port 5432 already in use** — stop the other Postgres, or change the host port in `docker-compose.yml` and `.env`.

**Wrong app on localhost:3000** — another project is bound to 3000; use the URL `npm run local` prints (it auto-selects a free port).
