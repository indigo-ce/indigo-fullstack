import type {APIRoute} from "astro";
import {env} from "cloudflare:workers";
import {createAuth} from "@/lib/auth";
import {defaultLocale} from "@/i18n/constants";

// Forward all /auth/* requests to the auth handler
// Note: This is for web-based authentication only (session-based)
// Mobile apps should use /api/v1/auth/* endpoints instead (JWT-based)
export const ALL: APIRoute = async (_context) => {
  return createAuth(env, defaultLocale).handler(_context.request);
};
