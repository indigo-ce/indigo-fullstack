// Ambient type declarations for testing environment

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {
    TEST_MIGRATIONS: unknown;
  }

  export const env: ProvidedEnv;
  export function applyD1Migrations(
    database: D1Database,
    migrations: unknown
  ): Promise<void>;
}