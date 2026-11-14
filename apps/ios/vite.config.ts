import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  base: "./",
  plugins: [react(), tailwindcss()],
  css: {
    // Ignore the repo-root PostCSS/Tailwind Next.js config; this app uses
    // `@tailwindcss/vite` instead.
    postcss: { plugins: [] },
  },
  resolve: {
    alias: {
      "@food-tracker/client/styles.css": path.resolve(
        root,
        "../../packages/client/src/styles.css",
      ),
      "@food-tracker/client": path.resolve(
        root,
        "../../packages/client/src/index.ts",
      ),
      "@food-tracker/contracts": path.resolve(
        root,
        "../../packages/contracts/src/index.ts",
      ),
      "@food-tracker/domain": path.resolve(
        root,
        "../../packages/domain/src/index.ts",
      ),
    },
    dedupe: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
  },
  server: {
    fs: {
      allow: [path.resolve(root, "../..")],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
