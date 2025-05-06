import {defaultLocale, locales, translations, type Locale} from "./constants";

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

export function getUrlWithLocale(path: string, locale: Locale) {
  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;

  if (!cleanPath) {
    // If it's just the root path
    return `/${locale}`;
  }

  // Check if path already has a locale prefix
  const segments = cleanPath.split("/");
  if (locales.includes(segments[0] as any)) {
    // Replace existing locale with new one
    segments[0] = locale;
    return `/${segments.join("/")}`;
  }

  // Add locale prefix
  return `/${locale}/${cleanPath}`;
}
