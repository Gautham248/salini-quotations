import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    include: ["src/__tests__/flows/**/*.test.ts"],
    globalSetup: ["./src/__tests__/flows/global-setup.ts"],
    env: {
      DATABASE_URL: "file:./test-flows.db",
      NODE_ENV: "development",
    },
  },
  resolve: {
    conditions: ["development", "browser"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
