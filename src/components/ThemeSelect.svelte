<script lang="ts">
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/primitives/select";
  
  import {
    Moon as MoonIcon,
    Sun as SunIcon,
    MonitorIcon as ComputerDesktopIcon
  } from "lucide-svelte";
  import { onMount } from "svelte";
  import { initializeTheme, setThemePreference } from "@/lib/theme";
  import type { Theme } from "@/lib/theme";
  
  let theme: Theme = "system";
  let isDark = false;
  
  onMount(() => {
    // Initialize theme from utility
    theme = initializeTheme();
    updateIsDark();
  });
  
  function updateIsDark() {
    isDark = theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : theme === "dark";
  }
  
  function handleValueChange(event: CustomEvent<Theme>) {
    theme = event.detail;
    setThemePreference(theme);
    updateIsDark();
  }
</script>

<Select value={theme} on:valueChange={handleValueChange}>
  <SelectTrigger class="w-16">
    {#if isDark}
      <MoonIcon class="h-4 w-4" />
    {:else}
      <SunIcon class="h-4 w-4" />
    {/if}
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="light">
      <div class="flex items-center gap-2">
        <SunIcon class="h-4 w-4" />
        <span>Light</span>
      </div>
    </SelectItem>
    <SelectItem value="dark">
      <div class="flex items-center gap-2">
        <MoonIcon class="h-4 w-4" />
        <span>Dark</span>
      </div>
    </SelectItem>
    <SelectItem value="system">
      <div class="flex items-center gap-2">
        <ComputerDesktopIcon class="h-4 w-4" />
        <span>System</span>
      </div>
    </SelectItem>
  </SelectContent>
</Select>