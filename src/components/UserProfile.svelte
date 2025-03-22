<script lang="ts">
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from "@/components/primitives/avatar";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/primitives/dropdown-menu";
  import { LogOut } from "lucide-svelte";
  
  export let name: string;
  export let email: string;
  export let imageUrl: string | undefined = undefined;
  
  // Create initials from name for the avatar fallback
  $: initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
  
  const handleSignOut = async () => {
    try {
      const { authClient } = await import("@/lib/auth-client");
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
        Hi, <span class="text-foreground">{name}</span>!
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        class="text-destructive"
        on:click={handleSignOut}
      >
        <LogOut class="mr-2 h-4 w-4" /> Logout
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>