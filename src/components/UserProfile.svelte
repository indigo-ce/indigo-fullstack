<script lang="ts">
  import {
    Avatar,
    AvatarFallback,
    AvatarImage
  } from "@/components/primitives/avatar";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
  } from "@/components/primitives/dropdown-menu";
  import LogOut from "@lucide/svelte/icons/log-out";
  import {useTranslations, localizeUrl} from "@/i18n/utils";
  import type {Locale} from "@/i18n/constants";

  export let name: string;
  export let imageUrl: string | undefined = undefined;
  export let locale: Locale = "en";

  const t = useTranslations(locale);
  const dashboardUrl = localizeUrl("/dashboard", locale);

  // Create initials from name for the avatar fallback
  $: initials = name
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
</script>

<DropdownMenu>
  <DropdownMenuTrigger
    class="flex items-center gap-x-1 text-sm/6 font-semibold text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300"
  >
    <Avatar>
      {#if imageUrl}
        <AvatarImage src={imageUrl} alt={name} />
      {:else}
        <AvatarFallback>{initials}</AvatarFallback>
      {/if}
    </Avatar>
  </DropdownMenuTrigger>
  <DropdownMenuContent sideOffset={10}>
    <DropdownMenuLabel class="text-muted-foreground">
      {t.profile.greeting},
      <span class="text-foreground">{name}</span>
      {locale === "ja" ? "さん" : ""}
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <a href={dashboardUrl} class="flex w-full items-center">
        {t.profile.dashboard}
      </a>
    </DropdownMenuItem>
    <DropdownMenuItem class="text-destructive" onSelect={handleSignOut}>
      <LogOut class="mr-2 h-4 w-4" />
      {t.profile.logout}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
