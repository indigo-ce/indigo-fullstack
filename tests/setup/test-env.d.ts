// Type declarations for test environment bindings
declare module "cloudflare:test" {
  export interface ProvidedEnv extends Env {
    TEST_MIGRATIONS: unknown; // Migration data from readD1Migrations
  }

  export const env: ProvidedEnv;
  export function applyD1Migrations(
    database: D1Database,
    migrations: unknown
  ): Promise<void>;
}