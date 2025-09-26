import * as React from "react"
import { Moon, Sun, SunMoon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { getThemePreference, setThemePreference } from "@/lib/theme"
import type { Theme } from "@/lib/theme"

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: SunMoon }
] as const

export function ThemeSelect() {
  const [theme, setTheme] = React.useState<Theme>("system")

  React.useEffect(() => {
    setTheme(getThemePreference())
  }, [])

  const handleThemeChange = (newTheme: string) => {
    const selectedTheme = newTheme as Theme
    setTheme(selectedTheme)
    setThemePreference(selectedTheme)
  }

  const currentTheme = themes.find((t) => t.value === theme) || themes[2]
  const CurrentIcon = currentTheme.icon

  return (
    <Select value={theme} onValueChange={handleThemeChange}>
      <SelectTrigger className="w-16">
        <CurrentIcon className="h-4 w-4" />
      </SelectTrigger>
      <SelectContent>
        {themes.map((themeOption) => {
          const ThemeIcon = themeOption.icon
          return (
            <SelectItem key={themeOption.value} value={themeOption.value}>
              <div className="flex items-center gap-2">
                <ThemeIcon className="h-4 w-4" />
                <span>{themeOption.label}</span>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}