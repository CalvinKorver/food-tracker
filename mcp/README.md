# Food-tracker MCP

## Remote (Claude / ChatGPT / Gemini)

HTTPS URL (production Railway origin):

```text
https://<your-host>/api/mcp
```

Sign in with your Food Tracker account when the host opens the browser OAuth flow. Approve access on `/consent`.

### Claude

Customize → Connectors → Add custom connector → paste the MCP URL → complete OAuth.

### ChatGPT

Settings → Security and login → enable Developer mode → Plugins → add the MCP URL with OAuth → in a chat enable Developer mode and pick the app.

### Gemini

Connected Apps / custom app (or Gemini CLI `gemini mcp add --transport http`) → paste the MCP URL → complete OAuth.

### Discovery

- Protected resource: `GET /.well-known/oauth-protected-resource`
- Authorization server: `GET /.well-known/oauth-authorization-server`

Tools:

- `get_diary_day` — diary totals + meals
- `get_goals` / `update_goals` — daily calorie / macro goals
- `search_foods` — USDA catalog search (same ranking as the app); returns `fdcId`s
- `log_food_item` — log via `fdcId` + grams, existing `foodId`, or ad-hoc name + macros

## Local stdio (Cursor / Claude Desktop on this machine)

Trusted local path — no OAuth. Uses `FOODTRACKER_USER_EMAIL` (default `calvin@foodtracker.local`) against your local Postgres.

```bash
npm run setup
npm run mcp
```

Claude Desktop / Cursor example:

```json
{
  "mcpServers": {
    "food-tracker": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "/Users/calvinkorver/Code/food-tracker",
      "env": {
        "DATABASE_URL": "postgresql://foodtracker:foodtracker@127.0.0.1:5433/foodtracker?schema=public",
        "FOODTRACKER_USER_EMAIL": "calvin@foodtracker.local"
      }
    }
  }
}
```

Keep stdout free for JSON-RPC; diagnostics go to stderr.
