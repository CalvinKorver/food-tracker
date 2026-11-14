import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    setupFiles: ["./src/lib/__tests__/helpers/setup-test-db.ts"],
    include: ["src/**/*.integration.test.ts"],
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
