import enTranslations from "@/translations/en.json";
import jaTranslations from "@/translations/ja.json";

export type Translations = typeof enTranslations;

export const locales = ["en", "ja"] as const;
export type Locale = (typeof locales)[number]; // "en" | "ja"

export const defaultLocale: Locale = "en";

export const translations: Record<Locale, Translations> = {
  en: enTranslations,
  ja: jaTranslations
};
