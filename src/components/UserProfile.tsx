import * as React from "react"
import { LogOut } from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTranslations, localizeUrl } from "@/i18n/utils"
import type { Locale } from "@/i18n/constants"

interface UserProfileProps {
  name: string
  imageUrl?: string
  locale?: Locale
}

export function UserProfile({ name, imageUrl, locale = "en" }: UserProfileProps) {
  const t = useTranslations(locale)
  const dashboardUrl = localizeUrl("/dashboard", locale)

  // Create initials from name for the avatar fallback
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

  const handleSignOut = async () => {
    try {
      const { authClient } = await import("@/lib/auth-client")
      await authClient.signOut()
      const homeUrl = localizeUrl("/", locale)
      window.location.href = homeUrl
    } catch (error) {
      console.error("Failed to sign out:", error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-x-1 text-sm/6 font-semibold text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300">
        <Avatar>
          {imageUrl ? (
            <AvatarImage src={imageUrl} alt={name} />
          ) : (
            <AvatarFallback>{initials}</AvatarFallback>
          )}
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={10}>
        <DropdownMenuLabel className="text-muted-foreground">
          {t.profile.greeting},
          <span className="text-foreground">{name}</span>
          {locale === "ja" ? "さん" : ""}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <a href={dashboardUrl} className="flex w-full items-center">
            {t.profile.dashboard}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          {t.profile.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}