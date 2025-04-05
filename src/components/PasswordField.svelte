<script lang="ts">
  import {Input} from "@/components/primitives/input";
  import Eye from "@lucide/svelte/icons/eye";
  import EyeOff from "@lucide/svelte/icons/eye-off";
  import Lock from "@lucide/svelte/icons/lock";
  import {cn} from "@/lib/utils";

  export let value = "";
  export let placeholder = "Password";
  export let required = false;
  export let className = "";

  let showPassword = false;
  export let name = "password";

  const togglePasswordVisibility = () => {
    showPassword = !showPassword;
  };
</script>

<div
  class={cn(
    "relative flex items-center rounded-md border focus-within:ring-1 focus-within:ring-ring px-2",
    className,
  )}
>
  <Lock class="h-5 w-5 text-muted-foreground" />
  <Input
    type={showPassword ? "text" : "password"}
    {placeholder}
    class="border-0 focus-visible:ring-0 shadow-none bg-transparent dark:bg-transparent"
    {name}
    bind:value
    {required}
  />
  <button
    type="button"
    on:click={togglePasswordVisibility}
    class="focus:outline-none"
  >
    {#if showPassword}
      <EyeOff class="h-5 w-5 text-muted-foreground" />
    {:else}
      <Eye class="h-5 w-5 text-muted-foreground" />
    {/if}
  </button>
</div>
