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
  import {useTranslations} from "@/i18n/utils";

  export let name: string;
  export let imageUrl: string | undefined = undefined;
  export let lang: string = "en";

  const t = useTranslations(lang);

  // Create initials from name for the avatar fallback
  $: initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const handleSignOut = async () => {
    try {
      const {authClient} = await import("@/lib/auth-client");
      await authClient.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };
</script>

<div class="flex gap-3">
  <DropdownMenu>
    <DropdownMenuTrigger class="rounded-full">
      <Avatar>
        <AvatarImage
          src={imageUrl || `https://github.com/shadcn.png`}
          alt={name}
        />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
    </DropdownMenuTrigger>
    <DropdownMenuContent sideOffset={10}>
      <DropdownMenuLabel class="text-muted-foreground">
        {t("profile.greeting")},
        <span class="text-foreground">{name}</span>
        {lang === "ja" ? "さん" : ""}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <a href="/dashboard" class="flex w-full items-center">
          {t("profile.dashboard")}
        </a>
      </DropdownMenuItem>
      <DropdownMenuItem class="text-destructive" onSelect={handleSignOut}>
        <LogOut class="mr-2 h-4 w-4" />
        {t("profile.logout")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
