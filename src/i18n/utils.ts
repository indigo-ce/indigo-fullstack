import {defaultLocale, locales, translations, type Locale} from "./constants";

export function getLocaleFromParams(
  params: Record<string, string | undefined>
): Locale {
  const lang = params.lang;
  return lang && locales.includes(lang as Locale)
    ? (lang as Locale)
    : defaultLocale;
}

export function useTranslationsFromParams(
  params: Record<string, string | undefined>
) {
  const locale = getLocaleFromParams(params);
  return useTranslations(locale);
}

export function getLocaleFromUrl(url: string) {
  const segments = url.split("/").filter(Boolean);
  if (segments.length === 0) return defaultLocale;

  const locale = segments[0] as Locale;
  if (!locales.includes(locale)) return defaultLocale;
  return locale;
}

export function useTranslations(locale?: Locale) {
  return translations[locale || defaultLocale];
}

export function localizeUrl(path: string, locale?: Locale): string {
  // Default to the default locale if none is provided
  const safeLocale =
    locale && locales.includes(locale as Locale)
      ? (locale as Locale)
      : defaultLocale;

  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;

  if (!cleanPath) {
    // If it's just the root path
    return `/${safeLocale}`;
  }

  // Check if path already has a locale prefix
  const segments = cleanPath.split("/");
  if (locales.includes(segments[0] as Locale)) {
    // Replace existing locale with new one
    segments[0] = safeLocale;
    return `/${segments.join("/")}`;
  }

  // Add locale prefix
  return `/${safeLocale}/${cleanPath}`;
}

// Sets the language preference cookie
export function setLanguageCookie(locale: Locale) {
  document.cookie = `preferred_lang=${locale};path=/;max-age=31536000;SameSite=Lax;Secure`;
}

// Gets the language preference from cookies
export function getLanguageCookieValue(): Locale | null {
  const match = document.cookie.match(/(^|;)\s*preferred_lang=([^;]+)/);
  const cookieValue = match ? match[2] : null;
  return cookieValue && locales.includes(cookieValue as Locale)
    ? (cookieValue as Locale)
    : null;
}

// Get browser language that matches our supported locales
export function getBrowserLanguage(): Locale | null {
  if (typeof navigator === "undefined") return null;

  // Try to match navigator.languages array first (more specific)
  if (navigator.languages && navigator.languages.length) {
    for (const lang of navigator.languages) {
      const browserLang = lang.split("-")[0]; // Get base language code (e.g., 'en' from 'en-US')
      if (locales.includes(browserLang as Locale)) {
        return browserLang as Locale;
      }
    }
  }

  // Fall back to navigator.language
  if (navigator.language) {
    const browserLang = navigator.language.split("-")[0];
    if (locales.includes(browserLang as Locale)) {
      return browserLang as Locale;
    }
  }

  return null;
}

// Get the preferred language using the fallback chain
export function getPreferredLanguage(): Locale {
  // Check cookie first
  const cookieLang = getLanguageCookieValue();
  if (cookieLang) return cookieLang;

  // Then check browser language
  const browserLang = getBrowserLanguage();
  if (browserLang) return browserLang;

  // Fall back to default
  return defaultLocale;
}

// Server-side function to get language from request headers
export function getLanguageFromHeaders(headers: Headers): Locale | null {
  const acceptLanguage = headers.get("accept-language");
  if (!acceptLanguage) return null;

  // Parse Accept-Language header
  const languages = acceptLanguage
    .split(",")
    .map((lang) => lang.split(";")[0].trim().split("-")[0]); // Get base language codes

  // Find first matching language
  for (const lang of languages) {
    if (locales.includes(lang as Locale)) {
      return lang as Locale;
    }
  }

  return null;
}
