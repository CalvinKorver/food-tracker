#!/usr/bin/env node
/**
 * Starts Next.js on the first free port from PORT / 3000 upward.
 */
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const preferred = Number(process.env.PORT || 3000);

function canListen(port, host) {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.listen({ port, host }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function isPortFree(port) {
  // Next listens on all interfaces (IPv6 :::port on macOS). Check both.
  const v6 = await canListen(port, "::");
  const v4 = await canListen(port, "0.0.0.0");
  return v6 && v4;
}

async function pickPort(start) {
  for (let port = start; port < start + 30; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free port found from ${start}–${start + 29}`);
}

const port = await pickPort(preferred);

if (port !== preferred) {
  console.log(
    `\nPort ${preferred} is busy — starting Food Tracker on http://localhost:${port}\n`,
  );
} else {
  console.log(`\nFood Tracker → http://localhost:${port}\n`);
}

const child = spawn(
  "npx",
  ["next", "dev", "-p", String(port)],
  {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, PORT: String(port) },
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
