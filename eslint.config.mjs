import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone utility scripts:
    "prisma/apply-migration.ts",
    "prisma/apply-remote-migration.ts",
    "prisma/pull-data-remote.ts",
    "prisma/push-data-remote.ts",
  ]),
]);

export default eslintConfig;
