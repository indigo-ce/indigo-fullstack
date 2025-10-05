import {
  defineWorkersProject,
  readD1Migrations
} from "@cloudflare/vitest-pool-workers/config";
import path from "path";

export default defineWorkersProject(async () => {
  // Read all migrations from the drizzle directory
  const migrationsPath = path.join(__dirname, "drizzle/migrations");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    },
    test: {
      setupFiles: [
        "./tests/setup/vitest-setup.ts"
      ],
      globals: true,
      isolate: true,
      poolOptions: {
        workers: {
          // Override for testing without separate config file
          miniflare: {
            // Required compatibility date for @cloudflare/vitest-pool-workers
            compatibilityDate: "2025-04-30",
            // Test-specific environment variables and migrations
            bindings: {
              NODE_ENV: "test",
              BETTER_AUTH_BASE_URL: "http://localhost:3000",
              SEND_EMAIL_FROM: "Test <test@example.com>",
              RESEND_API_KEY: "re_test_key",
              BETTER_AUTH_SECRET: "test-secret-123456789"
            },
            // Test D1 database (isolated per test)
            d1Databases: {
              DB: "00000000-0000-0000-0000-000000000000"
            }
          }
        }
      },
      include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.{idea,git,cache,output,temp}/**",
        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
        "**/tests/e2e/**"
      ]
    }
  };
});