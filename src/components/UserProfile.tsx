import {LogOut} from "lucide-react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {useTranslations, localizeUrl} from "@/i18n/utils";
import type {Locale} from "@/i18n/constants";

interface UserProfileProps {
  name: string;
  imageUrl?: string;
  locale?: Locale;
}

export function UserProfile({name, imageUrl, locale = "en"}: UserProfileProps) {
  const t = useTranslations(locale);
  const dashboardUrl = localizeUrl("/dashboard", locale);

  // Create initials from name for the avatar fallback
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const handleSignOut = async () => {
    try {
      const {authClient} = await import("@/lib/auth-client");
      await authClient.signOut();
      const homeUrl = localizeUrl("/", locale);
      window.location.href = homeUrl;
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-x-1 text-sm/6 font-semibold text-gray-900 hover:text-gray-600 dark:text-white dark:hover:text-gray-300">
        <Avatar>
          {imageUrl ? (
            <AvatarImage src={imageUrl} alt={name} />
          ) : (
            <AvatarFallback>{initials}</AvatarFallback>
          )}
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10}>
        <DropdownMenuLabel className="text-muted-foreground">
          <span className="text-foreground font-semibold">{name}</span>
          {locale === "ja" ? "さん" : ""}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={dashboardUrl} className="flex w-full items-center">
            {t.profile.dashboard}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut />
          {t.profile.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
