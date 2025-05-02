/// <reference path="./.astro/types.d.ts" />
/// <reference types="astro/client" />

// Astro Runtime
type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

// App Locals
declare namespace App {
  interface Locals extends Runtime {
    user: import("better-auth").User | null;
    session: import("better-auth").Session | null;
  }
}

// Vite/ImportMeta Environment Variables
interface ImportMetaEnv {
  readonly RESEND_API_KEY?: string;
  readonly BETTER_AUTH_SECRET?: string;
  readonly SEND_EMAIL_FROM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
