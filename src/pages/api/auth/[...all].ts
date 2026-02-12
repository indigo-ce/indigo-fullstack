import type {APIRoute} from "astro";
import {createAuth} from "@/lib/auth";
import {defaultLocale} from "@/i18n/constants";

// Forward all /auth/* requests to the auth handler
export const ALL: APIRoute = async (context) => {
  // For API routes, default to the default locale
  // In the future, this could be extracted from Accept-Language header if needed
  return createAuth(context.locals.runtime.env, defaultLocale).handler(context.request);
};
