#!/usr/bin/env node
/**
 * Prepares local env: .env, Docker Postgres (healthy), Prisma client.
 * Usage: node scripts/ensure-local.mjs
 */
import { spawn } from "node:child_process";
import { access, copyFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
      ...opts,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function waitForPostgres(maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await run(
        "docker",
        [
          "compose",
          "exec",
          "-T",
          "db",
          "pg_isready",
          "-U",
          "foodtracker",
          "-d",
          "foodtracker",
        ],
        { stdio: "pipe" },
      );
      console.log("Postgres is ready.");
      return;
    } catch {
      process.stdout.write(
        `Waiting for Postgres… (${attempt}/${maxAttempts})\r`,
      );
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(
    "Postgres did not become ready. Is Docker Desktop running? Try: npm run db:up",
  );
}

async function main() {
  const envPath = path.join(root, ".env");
  const examplePath = path.join(root, ".env.example");

  if (!(await exists(envPath))) {
    if (!(await exists(examplePath))) {
      throw new Error("Missing .env.example — cannot create .env");
    }
    await copyFile(examplePath, envPath);
    console.log("Created .env from .env.example");
  } else {
    console.log("Found .env");
  }

  try {
    await run("docker", ["info"], { stdio: "pipe" });
  } catch {
    throw new Error(
      "Docker is not running. Start Docker Desktop, then re-run this command.",
    );
  }

  console.log("Starting Postgres (docker compose)…");
  await run("docker", ["compose", "up", "-d"]);
  await waitForPostgres();

  console.log("Generating Prisma client…");
  await run("npx", ["prisma", "generate"]);

  console.log("Local prerequisites ready.");
}

main().catch((err) => {
  console.error(`\n${err.message}\n`);
  process.exit(1);
});
