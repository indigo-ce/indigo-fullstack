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

| Token | Used for |
|---|---|
| `--background` / `--foreground` | Page background and body text |
| `--card` / `--card-foreground` | Card surfaces and their text |
| `--primary` / `--primary-foreground` | Primary actions (buttons, links) |
| `--secondary` / `--secondary-foreground` | Secondary actions |
| `--muted` / `--muted-foreground` | Subtle backgrounds and muted text |
| `--accent` / `--accent-foreground` | Accent highlights |
| `--destructive` / `--destructive-foreground` | Errors and danger states |
| `--border` | Border colors |
| `--input` | Form input backgrounds |
| `--ring` | Focus ring colors |

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
--color-brand-50:  oklch(0.95 0.02 240);
--color-brand-100: oklch(0.90 0.04 240);
/* ... through 950 */
--color-brand-500: oklch(0.65 0.15 240);
--color-brand-900: oklch(0.35 0.12 240);
--color-brand-950: oklch(0.20 0.08 240);
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

## Using Tokens in Components

```html
<!-- ✅ Use semantic tokens -->
<div class="bg-background text-foreground">
  <button class="bg-primary text-primary-foreground">Submit</button>
  <div class="bg-card text-card-foreground border border-border rounded-lg">
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
