<script lang="ts">
  import * as Select from "@/components/primitives/select";

  import Moon from "@lucide/svelte/icons/moon";
  import Sun from "@lucide/svelte/icons/sun";
  import SunMoon from "@lucide/svelte/icons/sun-moon";
  import {onMount} from "svelte";
  import {getThemePreference, setThemePreference} from "@/lib/theme";
  import type {Theme} from "@/lib/theme";

  let theme: Theme = "system";

  onMount(() => {
    theme = getThemePreference();
  });

  function handleThemeChange(newTheme: Theme) {
    theme = newTheme;
    setThemePreference(theme);
  }

  const themes = [
    {value: "light", label: "Light", icon: Sun},
    {value: "dark", label: "Dark", icon: Moon},
    {value: "system", label: "System", icon: SunMoon},
  ];
</script>

<Select.Root
  type="single"
  value={theme}
  onValueChange={(value) => handleThemeChange(value as Theme)}
>
  <Select.Trigger class="w-16">
    <svelte:component
      this={themes.find((t) => t.value === theme)?.icon}
      class="h-4 w-4"
    />
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
