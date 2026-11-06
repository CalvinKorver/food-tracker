/**
 * Ensure foodtracker_test exists and migrations are applied.
 * Uses the same Docker Postgres as local (port 5433).
 */
import { config } from "dotenv";
import { execSync } from "node:child_process";

config();

const testUrl =
  process.env.DATABASE_URL_TEST ??
  "postgresql://foodtracker:foodtracker@127.0.0.1:5433/foodtracker_test?schema=public";

function dockerPsql(args, opts = {}) {
  return execSync(
    `docker exec food-tracker-db psql -U foodtracker -d foodtracker -v ON_ERROR_STOP=1 ${args}`,
    { encoding: "utf8", ...opts },
  );
}

try {
  dockerPsql('-Atc "SELECT 1"');
} catch {
  console.error(
    "Docker Postgres (food-tracker-db) is not reachable. Run: npm run db:up",
  );
  process.exit(1);
}

const exists = dockerPsql(
  '-Atc "SELECT 1 FROM pg_database WHERE datname = \'foodtracker_test\'"',
).trim();

if (exists !== "1") {
  dockerPsql('-c "CREATE DATABASE foodtracker_test"', { stdio: "inherit" });
  console.log("Created database foodtracker_test");
} else {
  console.log("Database foodtracker_test already exists");
}

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: testUrl },
});

console.log("Test DB ready");
