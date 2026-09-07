import {defineMiddleware, sequence} from "astro:middleware";
import {env} from "cloudflare:workers";
import {createAuth} from "@/lib/auth";
import {defaultLocale, locales, type Locale} from "./i18n/constants";
import {getLanguageFromHeaders, getLocaleFromRequest} from "./i18n/utils";

// Better Auth prefixes its session cookie with `__Secure-` over HTTPS, so
// production and local dev use different cookie names. Match on the
// unprefixed suffix instead of hardcoding one spelling.
const SESSION_COOKIE_SUFFIX = "better-auth.session_token";

function hasSessionCookie(headers: Headers): boolean {
  const cookieHeader = headers.get("cookie");
  if (cookieHeader === null) {
    return false;
  }

  return cookieHeader.split(";").some((cookie) => {
    const [rawName, ...rawValueParts] = cookie.split("=");
    const name = rawName.trim();
    const value = rawValueParts.join("=").trim();
    return name.endsWith(SESSION_COOKIE_SUFFIX) && value.length > 0;
  });
}

export const authMiddleware = defineMiddleware(async (context, next) => {
  if (context.request.url.includes("/api/")) {
    return next();
  }

  // Anonymous requests can never resolve to a session, so skip the D1
  // lookup entirely instead of constructing an auth instance for nothing.
  if (!hasSessionCookie(context.request.headers)) {
    context.locals.user = null;
    context.locals.session = null;
    return next();
  }

  // Extract locale for auth instance (used if auth triggers emails, e.g. account deletion)
  const url = new URL(context.request.url);
  const locale = getLocaleFromRequest(url, context.cookies, context.request.headers);

  const isAuthenticated = await createAuth(env, locale).api.getSession({
    headers: context.request.headers
  });

  if (isAuthenticated) {
    context.locals.user = isAuthenticated.user;
    context.locals.session = isAuthenticated.session;
  } else {
    context.locals.user = null;
    context.locals.session = null;
  }

  return next();
});

export const languageMiddleware = defineMiddleware(
  async ({request, cookies, redirect}, next) => {
    if (request.url.includes("/api/")) {
      return next();
    }

    const url = new URL(request.url);

    // Only apply redirect logic to the root path
    if (url.pathname === "/") {
      // Check for language cookie first
      const cookieLang = cookies.get("preferred_lang")?.value;
      let preferredLang: Locale | null = null;

      if (cookieLang && locales.includes(cookieLang as Locale)) {
        preferredLang = cookieLang as Locale;
      } else {
        // If no cookie, try to detect from Accept-Language header
        preferredLang = getLanguageFromHeaders(request.headers);
      }

      // Only redirect if detected language is not the default
      if (preferredLang && preferredLang !== defaultLocale) {
        return redirect(`/${preferredLang}${url.search}`);
      }
    }

    // For all other paths, continue normal processing
    return next();
  }
);

export const onRequest = sequence(authMiddleware, languageMiddleware);
