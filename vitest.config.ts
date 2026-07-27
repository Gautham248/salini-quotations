import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
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
