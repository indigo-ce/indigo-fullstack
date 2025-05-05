<script lang="ts">
  import * as Select from "@/components/primitives/select";
  import {onMount} from "svelte";
  import Globe from "@lucide/svelte/icons/globe";
  import {ui} from "@/i18n/ui";

  let currentLang = "en";
  let languages = [
    {value: "en", label: "English", icon: Globe},
    {value: "ja", label: "日本語", icon: Globe}
  ];

  onMount(() => {
    // Determine current language from URL
    const pathname = window.location.pathname;
    const segments = pathname.split("/").filter(Boolean);
    const firstSegment = segments[0];

    // Check if the first segment is a language code
    if (firstSegment && Object.keys(ui).includes(firstSegment)) {
      currentLang = firstSegment;
    }
  });

  function handleLanguageChange(newLang: string) {
    if (newLang === currentLang) return;

    const pathname = window.location.pathname;
    const segments = pathname.split("/").filter(Boolean);
    const firstSegment = segments[0];
    const isCurrentPathLocalized = Object.keys(ui).includes(firstSegment);

    if (isCurrentPathLocalized) {
      // We're currently in a localized route
      if (newLang === "en") {
        // Switch to English (default): remove the language prefix
        const newPath = "/" + segments.slice(1).join("/");
        window.location.href = newPath || "/"; // Ensure we go to root if there are no segments
      } else {
        // Switch to another non-English language: replace the language prefix
        const newPath = "/" + newLang + "/" + segments.slice(1).join("/");
        window.location.href = newPath;
      }
    } else {
      // We're already in the default language (English)
      if (newLang !== "en") {
        // Only add prefix for non-English languages
        window.location.href = `/${newLang}${pathname === "/" ? "" : pathname}`;
      }
    }
  }

  // Helper to get current language label
  $: currentLanguageOption =
    languages.find((lang) => lang.value === currentLang) || languages[0];
</script>

<Select.Root
  type="single"
  value={currentLang}
  onValueChange={(value) => handleLanguageChange(value)}
>
  <Select.Trigger class="w-auto min-w-24">
    <div class="flex items-center gap-2">
      <Globe class="h-4 w-4" />
      <span class="pr-1">{currentLanguageOption.label}</span>
    </div>
  </Select.Trigger>
  <Select.Content>
    {#each languages as langOption (langOption.value)}
      <Select.Item value={langOption.value}>
        <div class="flex items-center gap-2">
          <svelte:component this={langOption.icon} class="h-4 w-4" />
          <span>{langOption.label}</span>
        </div>
      </Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
