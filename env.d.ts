/// <reference path="./.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: import("better-auth").User | null;
    session: import("better-auth").Session | null;
  }
}

interface ImportMetaEnv {
  readonly RESEND_API_KEY?: string;
  readonly SEND_EMAIL_FROM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
