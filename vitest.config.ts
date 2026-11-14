import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/lib/__tests__/helpers/setup-env.ts"],
    include: [
      "src/**/*.test.ts",
      "packages/domain/src/**/*.test.ts",
      "packages/contracts/src/**/*.test.ts",
      "packages/client/src/**/*.test.ts",
    ],
    exclude: ["src/**/*.integration.test.ts", "node_modules"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@food-tracker/contracts": path.resolve(
        __dirname,
        "./packages/contracts/src/index.ts",
      ),
      "@food-tracker/domain": path.resolve(
        __dirname,
        "./packages/domain/src/index.ts",
      ),
      "@food-tracker/client": path.resolve(
        __dirname,
        "./packages/client/src/index.ts",
      ),
    },
  },
});
