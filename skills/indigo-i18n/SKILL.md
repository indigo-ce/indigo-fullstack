---
name: indigo-i18n
description: This skill should be used when the user asks to "add a new language", "add translations", "add a translation key", "use translations in a page", "set up i18n", "add French support", "localize a page", "switch language", "get the current locale", "create a locale-aware URL", or works with internationalization in Indigo stack projects.
---

# Internationalization (i18n)

Indigo stack projects implement i18n using dynamic Astro routes with type-safe translations. All languages — including the default — use a `[...lang]` route pattern. No page duplication per language. No `getStaticPaths()`.

Supported locales: `en` (default), `ja`. All routes are prefixed: `/en/dashboard`, `/ja/dashboard`.

## File Structure

```
src/
├── translations/
│   ├── en.json          # English strings
│   └── ja.json          # Japanese strings
├── i18n/
│   ├── constants.ts     # Locale list, Locale type, translations map
│   └── utils.ts         # Helper functions
└── pages/
    └── [...lang]/       # All pages live here
```

## Using Translations in Pages

```astro
---
import {useTranslations} from "@/i18n/utils";
import {defaultLocale, locales} from "@/i18n/constants";

let {lang} = Astro.params;
const locale = lang && locales.includes(lang) ? lang : defaultLocale;
const t = useTranslations(locale);
---

<h1>{t.nav.home}</h1>
```

## Using Translations in React Components

Pass `locale` as a prop — React components don't have access to Astro params:

```tsx
import {useTranslations} from "@/i18n/utils";
import type {Locale} from "@/i18n/constants";

interface Props {
  locale: Locale;
}

export function MyComponent({locale}: Props) {
  const t = useTranslations(locale);
  return <h1>{t.nav.home}</h1>;
}
```

## Locale-Aware URLs

Use `localizeUrl` to build links that preserve the current locale:

```astro
---
import {localizeUrl} from "@/i18n/utils";

const dashboardUrl = localizeUrl("/dashboard", locale);
---

<a href={dashboardUrl}>Dashboard</a>
```

Never hardcode `/en/` — always use `localizeUrl`.

## Adding Translation Keys

Add to both `src/translations/en.json` and `src/translations/ja.json`:

```json
// en.json
{
  "nav": {
    "home": "Home",
    "settings": "Settings"
  }
}

// ja.json
{
  "nav": {
    "home": "ホーム",
    "settings": "設定"
  }
}
```

The `Translations` type is inferred from the English file — TypeScript will error if a key exists in `en.json` but is missing or mistyped in usage.

## Adding a New Language

Four steps:

**1. Create the translation file**

`src/translations/fr.json` — copy structure from `en.json`, translate all values.

**2. Update `src/i18n/constants.ts`**

```typescript
import frTranslations from "@/translations/fr.json";

export const locales = ["en", "ja", "fr"] as const;
export type Locale = (typeof locales)[number];

export const translations: Record<Locale, Translations> = {
  en: enTranslations,
  ja: jaTranslations,
  fr: frTranslations
};
```

**3. Update `LanguageSelect` component**

```typescript
let languages = [
  {value: "en", label: "English", icon: Globe},
  {value: "ja", label: "日本語", icon: Globe},
  {value: "fr", label: "Français", icon: Globe}
];
```

**4. Add any locale-specific email templates** (if using the email queue with locale support).

## Available Utilities

All from `@/i18n/utils`:

| Function | Purpose |
|---|---|
| `useTranslations(locale)` | Returns typed translation object for a locale |
| `useTranslationsFromParams(params)` | Combines locale extraction + translations |
| `getLocaleFromUrl(url)` | Extracts locale from a URL string |
| `getLocaleFromParams(params)` | Extracts locale from Astro params |
| `localizeUrl(path, locale)` | Builds a locale-prefixed URL |
| `getLanguageCookieValue()` | Reads saved language preference cookie |
| `getBrowserLanguage()` | Reads `Accept-Language` from browser |
| `getLanguageFromHeaders(headers)` | Extracts locale from request headers (used in API routes) |

## Language Switching

The `LanguageSelect` component (in the footer) handles UI-based switching. Language preference is persisted via cookie so the middleware can apply it on the next request.

Detection priority in middleware: cookie preference → `Accept-Language` header → default locale.

## Creating New Pages

Place all new pages under `src/pages/[...lang]/`. The dynamic segment handles locale routing automatically — no additional configuration needed.

## Type Safety Notes

- `Translations` type is inferred from `en.json` — it's the source of truth for the schema.
- All locales in `translations` map must have the same structure as `en.json`.
- Access is via dot notation (`t.nav.home`), not a function call (`t("nav.home")`).
- TypeScript errors surface missing or incorrect keys at compile time.
