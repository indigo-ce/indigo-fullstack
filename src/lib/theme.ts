export type Theme = "light" | "dark" | "system";

export function getThemePreference(): Theme {
  if (typeof localStorage !== "undefined" && localStorage.getItem("theme")) {
    return localStorage.getItem("theme") as Theme;
  }

  return "system";
}

export function setThemePreference(theme: Theme): void {
  if (theme === "system") {
    localStorage.removeItem("theme");
  } else {
    localStorage.setItem("theme", theme);
  }

  applyTheme(theme);
}

export function applyTheme(theme: Theme): void {
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList[isDark ? "add" : "remove"]("dark");
}

export function setupColorSchemeMediaQueryObserver(): void {
  if (typeof window !== "undefined") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    mediaQuery.addEventListener("change", () => {
      // Only update if we're using system theme
      if (!localStorage.getItem("theme")) {
        applyTheme("system");
      }
    });
  }
}

export function initializeTheme(): Theme {
  const theme = getThemePreference();
  applyTheme(theme);
  return theme;
}
