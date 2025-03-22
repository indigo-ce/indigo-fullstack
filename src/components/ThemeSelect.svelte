<script lang="ts">
  import * as Select from "@/components/primitives/select";

  import {
    Moon as MoonIcon,
    Sun as SunIcon,
    MonitorIcon as ComputerDesktopIcon,
  } from "lucide-svelte";
  import {onMount} from "svelte";
  import {initializeTheme, setThemePreference} from "@/lib/theme";
  import type {Theme} from "@/lib/theme";

  let theme: Theme = "system";
  let isDark = false;

  onMount(() => {
    // Initialize theme from utility
    theme = initializeTheme();
    updateIsDark();
  });

  function updateIsDark() {
    isDark =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : theme === "dark";
  }

  function handleThemeChange(newTheme: Theme) {
    theme = newTheme;
    setThemePreference(theme);
    updateIsDark();
  }

  const themes = [
    {value: "light", label: "Light", icon: SunIcon},
    {value: "dark", label: "Dark", icon: MoonIcon},
    {value: "system", label: "System", icon: ComputerDesktopIcon},
  ];
</script>

<Select.Root
  type="single"
  value={theme}
  onValueChange={(value) => handleThemeChange(value as Theme)}
>
  <Select.Trigger class="w-16">
    {#if isDark}
      <MoonIcon class="h-4 w-4" />
    {:else}
      <SunIcon class="h-4 w-4" />
    {/if}
  </Select.Trigger>
  <Select.Content>
    {#each themes as themeOption (themeOption.value)}
      <Select.Item value={themeOption.value}>
        <div class="flex items-center gap-2">
          <svelte:component this={themeOption.icon} class="h-4 w-4" />
          <span>{themeOption.label}</span>
        </div>
      </Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
