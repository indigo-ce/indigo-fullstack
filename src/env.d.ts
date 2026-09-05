/// <reference path="./.astro/types.d.ts" />
/// <reference types="astro/client" />

// Astro Runtime (Cloudflare adapter v13+: only cfContext remains;
// env/cf/caches come from `cloudflare:workers`, `Astro.request.cf`, and globals)
type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

// App Locals
declare namespace App {
  interface Locals extends Runtime {
    user: import("better-auth").User | null;
    session: import("better-auth").Session | null;
  }
}

interface Env {
  BETTER_AUTH_SECRET: string;
}

// Secrets (set via `.dev.vars` locally / `wrangler secret` in production)
// are not in wrangler.jsonc, so `wrangler types` never generates them.
// Augment the generated Cloudflare.Env so `import {env} from
// "cloudflare:workers"` is typed with the secrets too.
declare namespace Cloudflare {
  interface Env {
    BETTER_AUTH_SECRET: string;
  }
}

// Vite/ImportMeta Environment Variables
interface ImportMetaEnv {
  readonly BETTER_AUTH_SECRET?: string;
  readonly SEND_EMAIL_FROM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
