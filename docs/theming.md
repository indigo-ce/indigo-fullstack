# Theming

This document explains how to customize the visual appearance of your project
using the built-in theming system.

## Overview

The project uses a CSS custom property-based theming system with support for
light and dark themes. The theming system is built on top of Tailwind CSS and
uses CSS custom properties for dynamic theme switching.

## Color Variable Location

All theming variables are defined in `src/styles.css`. The file contains three
main sections:

### 1. Light Theme Variables (`:root`)

Located at the top of `src/styles.css` (lines 6-40), these variables define the
default light theme colors:

```css
:root {
  --radius: 0.625rem;
  --background: var(--color-seagull-10);
  --foreground: var(--color-seagull-900);
  --primary: var(--color-hyacinth-500);
  /* ... more variables */
}
```

### 2. Dark Theme Variables (`.dark`)

Located in `src/styles.css` (lines 42-75), these variables override the light
theme when the `dark` class is applied to the document root:

```css
.dark {
  --background: var(--color-seagull-950);
  --foreground: var(--color-seagull-100);
  --primary: var(--color-hyacinth-500);
  /* ... more variables */
}
```

### 3. Color Palette (`@theme inline`)

You can define the main color palette using the `@theme inline` directive (lines
77-161). This section includes:

- **Color palettes**: Multiple color palettes with shades from 50-950.
- **Semantic color mappings**: Maps the colors to semantic theme tokens

## Color Palette Definition

You can define a scientifically-designed color palette using OKLCH color space
for better perceptual uniformity:

### Base Color Palettes

The template includes four base color palettes that you should rename to match
your brand:

- **Primary neutral palette** (currently `seagull`): Grays used for backgrounds,
  text, and borders
- **Primary brand palette** (currently `hyacinth`): Your main brand colors for
  primary actions and highlights
- **Secondary palette** (currently `asparagus`): Additional colors for success
  states or secondary actions
- **Accent palette** (currently `earth`): Warm accent colors for visual variety

Each palette includes 11 shades: 50, 100, 200, 300, 400, 500, 600, 700, 800,
900, and 950.

### Renaming Base Palettes

When adapting this template to your brand, rename the base color palettes to
match your brand identity:

**Choose meaningful names that reflect your brand:**

- Use evocative names that connect to your brand story or values
- Consider nature-inspired names (ocean, forest, sunset, mountain)
- Think about materials or textures (slate, marble, copper, steel)
- Reflect your industry or product (digital brands might use tech terms)

**Color Naming Tools:**

- [Kromatic](https://kromatic.app): A helpful app for generating meaningful
  color names based on your brand colors
- Use consistent naming conventions across your entire palette

Example:

```css
--color-seagull-500: oklch(0.6656 0.1453 237);
--color-hyacinth-500: oklch(0.6198 0.209251 279.6005);
```

### Semantic Color Tokens

The theming system maps your color palettes to semantic tokens:

- `--background` / `--foreground`: Main page background and text
- `--card` / `--card-foreground`: Card backgrounds and text
- `--primary` / `--primary-foreground`: Primary action colors
- `--secondary` / `--secondary-foreground`: Secondary action colors
- `--muted` / `--muted-foreground`: Subtle backgrounds and muted text
- `--accent` / `--accent-foreground`: Accent colors
- `--destructive` / `--destructive-foreground`: Error and danger states
- `--border`: Border colors
- `--input`: Form input backgrounds
- `--ring`: Focus ring colors

## How Colors Are Used

### In Components

Components use Tailwind CSS utility classes that reference the semantic color
tokens:

```html
<div class="bg-background text-foreground">
  <button class="bg-primary text-primary-foreground">Primary Button</button>
  <div class="bg-card text-card-foreground border-border border">
    Card content
  </div>
</div>
```

### Available Tailwind Classes

The theming system automatically generates Tailwind utilities for all semantic
tokens:

- **Backgrounds**: `bg-background`, `bg-card`, `bg-primary`, etc.
- **Text colors**: `text-foreground`, `text-primary`, `text-muted-foreground`,
  etc.
- **Border colors**: `border-border`, `border-input`, etc.

## Theme Switching Implementation

The theme switching is handled by JavaScript utilities in `src/lib/theme.ts`:

- `getThemePreference()`: Retrieves the saved theme preference or defaults to
  "system"
- `setThemePreference(theme)`: Saves and applies a theme preference
- `applyTheme(theme)`: Applies the theme by adding/removing the "dark" class

Theme initialization occurs in `src/components/SetTheme.astro`, which runs
inline to prevent flash of styled content.

## Customizing Colors

### Changing the Color Palette

To customize colors, modify the color definitions in the `@theme inline` section
of `src/styles.css`:

1. **Modify existing colors**: Change the OKLCH values for any existing color
2. **Add new color palettes**: Define new `--color-*` variables following the
   same naming pattern
3. **Update semantic mappings**: Map your new colors to the semantic tokens in
   both `:root` and `.dark` sections

### Example: Adding a Brand Color

1. Add your brand color palette:

   ```css
   --color-brand-50: oklch(0.95 0.02 240);
   --color-brand-500: oklch(0.65 0.15 240);
   --color-brand-900: oklch(0.35 0.12 240);
   /* ... other shades */
   ```

2. Map it to semantic tokens:

```css
:root {
  --primary: var(--color-brand-500);
  --primary-foreground: var(--color-seagull-50);
}

.dark {
  --primary: var(--color-brand-500);
  --primary-foreground: var(--color-seagull-950);
}
```

### Changing Border Radius

Modify the `--radius` variable in `:root` to change the global border radius.
Additional radius variants are available:

- `--radius-sm`: Small radius (radius - 4px)
- `--radius-md`: Medium radius (radius - 2px)
- `--radius-lg`: Large radius (default radius)
- `--radius-xl`: Extra large radius (radius + 4px)

## Theme Integration

### User Interface

The project includes a theme selector component
(`src/components/ThemeSelect.svelte`) that allows users to choose between:

- **Light**: Force light theme
- **Dark**: Force dark theme
- **System**: Follow system preference

### Persistence

Theme preferences are stored in `localStorage` and automatically restored on
page load. The "system" option removes the localStorage entry and follows the
user's OS preference.

### System Preference Detection

The theme system automatically detects changes to the system color scheme
preference and updates the UI when using "system" theme mode.

## Tips for Theme-Aware Components

1. **Use semantic tokens**: Always prefer semantic tokens (`bg-primary`) over
   direct color references (`bg-purple-500`)

2. **Test both themes**: Ensure your components look good in both light and dark
   themes

3. **Consider contrast**: Use foreground/background pairs that provide
   sufficient contrast

4. **Leverage existing patterns**: Follow the existing component patterns for
   consistent theming

5. **Use the color palette**: Stick to the defined color palette for visual
   consistency
