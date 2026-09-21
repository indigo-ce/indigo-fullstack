---
name: indigo-theming
description: This skill should be used when the user asks to "change the color scheme", "add a brand color", "customize the theme", "rename the color palette", "add dark mode support", "change the border radius", "update styles.css", "generate a new theme", "add OKLCH colors", "update semantic tokens", or works with visual theming in Indigo stack projects.
---

# Theming

Indigo stack projects use a CSS custom property theming system with light/dark support built on Tailwind CSS. All theme variables live in `src/styles.css`.

## File Structure

```
src/
├── styles.css              # All theme variables (edit this)
├── lib/
│   └── theme.ts            # Theme switching utilities
└── components/
    ├── SetTheme.astro       # Inline script — prevents flash on load
    └── ThemeSelect.tsx      # UI: Light / Dark / System picker
```

## `src/styles.css` Sections

### `:root` — Light theme

```css
:root {
  --radius: 0.625rem;
  --background: var(--color-seagull-10);
  --foreground: var(--color-seagull-900);
  --primary: var(--color-hyacinth-500);
  /* ... */
}
```

### `.dark` — Dark theme overrides

```css
.dark {
  --background: var(--color-seagull-950);
  --foreground: var(--color-seagull-100);
  --primary: var(--color-hyacinth-500);
  /* ... */
}
```

### `@theme inline` — Color palette

Defines raw color palettes in OKLCH. These are referenced by the semantic tokens above.

## Semantic Tokens

Always use semantic tokens in components — never raw palette colors:

| Token                                        | Used for                          |
| -------------------------------------------- | --------------------------------- |
| `--background` / `--foreground`              | Page background and body text     |
| `--card` / `--card-foreground`               | Card surfaces and their text      |
| `--primary` / `--primary-foreground`         | Primary actions (buttons, links)  |
| `--secondary` / `--secondary-foreground`     | Secondary actions                 |
| `--muted` / `--muted-foreground`             | Subtle backgrounds and muted text |
| `--accent` / `--accent-foreground`           | Accent highlights                 |
| `--destructive` / `--destructive-foreground` | Errors and danger states          |
| `--border`                                   | Border colors                     |
| `--input`                                    | Form input backgrounds            |
| `--ring`                                     | Focus ring colors                 |

In Tailwind these become: `bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`, `border-border`, etc.

## Customizing Colors

### Change existing palette colors

Edit OKLCH values in the `@theme inline` section of `src/styles.css`:

```css
--color-hyacinth-500: oklch(0.62 0.21 279.6);
```

Use the [OKLCH color picker](https://oklch.com/) to find values for a desired color.

### Add a brand color palette

1. Define the full palette (shades: 10, 20, 50–950) in `@theme inline`:

```css
--color-brand-50: oklch(0.95 0.02 240);
--color-brand-100: oklch(0.9 0.04 240);
/* ... through 950 */
--color-brand-500: oklch(0.65 0.15 240);
--color-brand-900: oklch(0.35 0.12 240);
--color-brand-950: oklch(0.2 0.08 240);
```

2. Map to semantic tokens in both `:root` and `.dark`:

```css
:root {
  --primary: var(--color-brand-500);
  --primary-foreground: var(--color-brand-50);
}

.dark {
  --primary: var(--color-brand-400);
  --primary-foreground: var(--color-brand-950);
}
```

### Rename the default palettes

The template ships with four palettes: `seagull` (neutral), `hyacinth` (primary brand), `asparagus` (secondary), `earth` (accent). When adapting to a new brand:

1. Choose new names — evocative, brand-connected names work best (e.g. `slate`, `ocean`, `copper`).
2. Find-and-replace the palette name throughout `src/styles.css`.
3. Update any component code that directly references the palette name (rare — most code uses semantic tokens).

[Kromatic](https://kromatic.app) is useful for generating meaningful color names from a hex value.

### Change border radius

Modify `--radius` in `:root`. Variants (`--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`) are computed from this base value automatically.

## Typography

Type is self-hosted through [Astro's fonts API](https://docs.astro.build/en/guides/fonts/): font files are read from an `@fontsource-variable/*` package at build time and emitted into `dist/` — no font CDN, no runtime dependency. The shipped face is Inter (variable, weights 100–900, latin subset); Japanese text deliberately stays on the platform gothic stack, since Inter has no CJK coverage.

Four places are involved:

1. The `fonts` entry in `astro.config.mjs` — declares the family, its CSS variable (`--font-inter`), and the font file(s) it reads:

   ```js
   fonts: [
     {
       name: "Inter",
       cssVariable: "--font-inter",
       provider: fontProviders.local(),
       options: {
         variants: [
           {
             src: [
               "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"
             ]
           }
         ]
       }
     }
   ];
   ```

   `src` paths resolve as package imports; a variable font's weight range is inferred from the file unless you pass `weight` (e.g. `"100 900"`). Keep the local provider: the Google provider fetches from `fonts.googleapis.com` at build time, which would put a third-party network call on the merge gate.

2. `<Font cssVariable="--font-inter" preload />` in the `<head>` of `src/layouts/Layout.astro` — the config alone emits nothing; this component produces the `@font-face` rules and the preload link.

3. `--font-sans: var(--font-inter);` in `:root` of `src/styles.css` — points the semantic font token at the generated variable.

4. `--font-sans: var(--font-sans);` in the `@theme inline` block of `src/styles.css` — re-exports it so Tailwind's `font-sans` utility (and the body's default stack) resolve through it.

### Swap in a different face

1. Add the matching `@fontsource-variable/<face>` dev dependency and point the `fonts` entry's `src` at one of its files (list them with `ls node_modules/@fontsource-variable/<face>/files`).
2. Update `name` and, if you want a different variable name, `cssVariable` — keep the `<Font>` tag, the `:root` mapping, and the skill's references in sync with it.
3. Leave `fallbacks` at their defaults and `optimizedFallbacks` on, so Astro emits a metric-matched system fallback and text doesn't reflow when the webfont arrives.

Both `src/styles.css` and `src/_styles.css` carry the `--font-sans` mappings — `_styles.css` is the neutral starter that `scripts/bootstrap.js` renames over `styles.css` for new projects, so a pipeline wired only into the brand stylesheet would disappear on bootstrap.

## Using Tokens in Components

```html
<!-- ✅ Use semantic tokens -->
<div class="bg-background text-foreground">
  <button class="bg-primary text-primary-foreground">Submit</button>
  <div class="bg-card text-card-foreground border-border rounded-lg border">
    Card content
  </div>
  <p class="text-muted-foreground">Subtle text</p>
</div>

<!-- ❌ Don't hardcode palette colors -->
<button class="bg-hyacinth-500 text-white">Submit</button>
```

## Theme Switching

`src/lib/theme.ts` exposes:

- `getThemePreference()` — returns `"light"` | `"dark"` | `"system"`, reads from `localStorage`
- `setThemePreference(theme)` — saves preference and applies it
- `applyTheme(theme)` — adds/removes `dark` class on `<html>`

`SetTheme.astro` runs inline before page render to prevent flash of wrong theme. Don't remove it from the layout.

The `ThemeSelect.tsx` component provides the user-facing Light / Dark / System picker. The "system" option removes the `localStorage` entry and follows `prefers-color-scheme`.

## Generating a New Theme

Use a theme generator (e.g. [themecn.dev](https://themecn.dev/)) to produce a full set of `:root` / `.dark` variables, then paste them into `src/styles.css`, replacing the existing `:root` and `.dark` blocks.

Keep the existing `@theme inline` palette or replace it — just ensure the semantic tokens reference valid palette values.

## New Project Setup

The template ships with two CSS files:

- `src/styles.css` — Indigo brand colors (seagull, hyacinth, asparagus, earth)
- `src/_styles.css` — Neutral starter colors for new projects

For a new project: delete `src/styles.css`, rename `src/_styles.css` → `src/styles.css`. The bootstrap script (`scripts/bootstrap.js`) handles this automatically.
