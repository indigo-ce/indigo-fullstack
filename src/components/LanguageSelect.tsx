import * as React from "react"
import { Globe } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getLocaleFromUrl, setLanguageCookie } from "@/i18n/utils"
import type { Locale } from "@/i18n/constants"

const languages = [
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" }
]

export function LanguageSelect() {
  const [currentLang, setCurrentLang] = React.useState<string>("en")

  React.useEffect(() => {
    // Determine current language from URL
    const pathname = window.location.pathname
    setCurrentLang(getLocaleFromUrl(pathname))
  }, [])

  const handleLanguageChange = (newLang: string) => {
    if (newLang === currentLang) return

    // Save the language preference in a cookie
    setLanguageCookie(newLang as Locale)

    const pathname = window.location.pathname
    const segments = pathname.split("/").filter(Boolean)

    // Always have at least the first segment (language)
    if (segments.length === 0) {
      // We're at root, just go to the language root
      window.location.href = `/${newLang}`
      return
    }

    // Replace the first segment (current language) with the new language
    segments[0] = newLang
    window.location.href = `/${segments.join("/")}`
  }

  // Helper to get current language label
  const currentLanguageOption =
    languages.find((lang) => lang.value === currentLang) || languages[0]

  return (
    <Select value={currentLang} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-auto min-w-24" data-testid="language-selector">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="pr-1">{currentLanguageOption.label}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {languages.map((langOption) => (
          <SelectItem key={langOption.value} value={langOption.value} data-testid={`language-option-${langOption.value}`}>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>{langOption.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}