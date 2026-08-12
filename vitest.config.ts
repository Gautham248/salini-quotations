import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["src/__tests__/flows/**", "node_modules/**"],
    env: {
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
