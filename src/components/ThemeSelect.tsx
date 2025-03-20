import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";

import {
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";
import {useState, useEffect} from "react";
import {initializeTheme, setThemePreference} from "@/lib/theme";
import type {Theme} from "@/lib/theme";

export default function ThemeSelect() {
  const [theme, setTheme] = useState<Theme>("system");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Initialize theme from utility
    const currentTheme = initializeTheme();
    setTheme(currentTheme);
    setIsDark(
      currentTheme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : currentTheme === "dark",
    );
  }, []);

  const handleValueChange = (value: Theme) => {
    setTheme(value);
    setThemePreference(value);
    setIsDark(
      value === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : value === "dark",
    );
  };

  return (
    <Select value={theme} onValueChange={handleValueChange}>
      <SelectTrigger className="w-16">
        {isDark ? (
          <MoonIcon className="h-4 w-4" />
        ) : (
          <SunIcon className="h-4 w-4" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">
          <div className="flex items-center gap-2">
            <SunIcon className="h-4 w-4" />
            <span>Light</span>
          </div>
        </SelectItem>
        <SelectItem value="dark">
          <div className="flex items-center gap-2">
            <MoonIcon className="h-4 w-4" />
            <span>Dark</span>
          </div>
        </SelectItem>
        <SelectItem value="system">
          <div className="flex items-center gap-2">
            <ComputerDesktopIcon className="h-4 w-4" />
            <span>System</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
