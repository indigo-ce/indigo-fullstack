import {defineMiddleware, sequence} from "astro:middleware";
import {createAuth} from "@/lib/auth";
import {defaultLocale, locales, type Locale} from "./i18n/constants";
import {getLanguageFromHeaders, getLocaleFromRequest} from "./i18n/utils";

const authMiddleware = defineMiddleware(async (context, next) => {
  if (context.request.url.includes("/api/")) {
    return next();
  }

  // Extract locale using fallback chain: cookie > URL path > Accept-Language > default
  const url = new URL(context.request.url);
  const locale = getLocaleFromRequest(url, context.cookies, context.request.headers);

  const isAuthenticated = await createAuth(
    context.locals.runtime.env,
    locale
  ).api.getSession({
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

const languageMiddleware = defineMiddleware(
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
