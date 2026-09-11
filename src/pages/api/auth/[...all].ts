import type {APIRoute} from "astro";
import {env} from "cloudflare:workers";
import {createAuth} from "@/lib/auth";
import {getLocaleFromRequest} from "@/i18n/utils";

// Forward all /auth/* requests to the auth handler
// Note: This is for web-based authentication only (session-based)
// Mobile apps should use /api/v1/auth/* endpoints instead (JWT-based)
export const ALL: APIRoute = async (context) => {
  const locale = getLocaleFromRequest(
    context.url,
    context.cookies,
    context.request.headers
  );

  return createAuth(env, locale).handler(context.request);
};
