// Ambient type declarations for testing environment

import type {Env} from "../worker-configuration";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    // Bindings configured in vitest.config.ts miniflare section
    DB: D1Database;
    SESSION: KVNamespace;
    RESEND_API_KEY?: string;
    SEND_EMAIL_FROM?: string;
    BETTER_AUTH_BASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
    ASSETS?: Fetcher;
    TEST_MIGRATIONS?: unknown; // Migration data from readD1Migrations
  }

  export const env: ProvidedEnv;
  export function applyD1Migrations(
    database: D1Database,
    migrations: unknown
  ): Promise<void>;
}