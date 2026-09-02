import {
  defineWorkersProject,
  readD1Migrations
} from "@cloudflare/vitest-pool-workers/config";
import {coverageConfigDefaults} from "vitest/config";
import path from "path";

export default defineWorkersProject(async () => {
  // Read all migrations from the drizzle directory
  const migrationsPath = path.join(__dirname, "drizzle/migrations");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@app": path.resolve(__dirname, "./src")
      }
    },
    test: {
      globals: true,
      isolate: true,
      poolOptions: {
        workers: {
          // Override for testing without separate config file
          miniflare: {
            // Mirrors wrangler.jsonc's compatibility_date and compatibility_flags
            compatibilityDate: "2025-04-30",
            compatibilityFlags: ["nodejs_compat"],
            // Test-specific environment variables and migrations
            bindings: {
              NODE_ENV: "test",
              BETTER_AUTH_BASE_URL: "http://localhost:3000",
              SEND_EMAIL_FROM: "Test <test@example.com>",
              BETTER_AUTH_SECRET: "test-secret-123456789",
              TEST_MIGRATIONS: migrations
            },
            // Test D1 database (isolated per test)
            d1Databases: {
              DB: "00000000-0000-0000-0000-000000000000"
            },
            kvNamespaces: {
              SESSION: "test-session-namespace"
            },
            queueProducers: {
              EMAIL_QUEUE: "indigo-email-queue"
            }
          }
        }
      },
      include: ["tests/**/*.test.ts"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.{idea,git,cache,output,temp}/**",
        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
        "**/tests/e2e/**"
      ],
      coverage: {
        exclude: [
          ...coverageConfigDefaults.exclude,
          "tests/**",
          "*.config.*",
          "drizzle/**",
          "worker-configuration.d.ts"
        ]
      }
    }
  };
});
