<script lang="ts">
  import * as Select from "@/components/primitives/select";
  import {onMount} from "svelte";
  import Globe from "@lucide/svelte/icons/globe";
  import {getLocaleFromUrl, setLanguageCookie} from "@/i18n/utils";

  let currentLang = "en";

  let languages = [
    {value: "en", label: "English", icon: Globe},
    {value: "ja", label: "日本語", icon: Globe}
  ];

  onMount(() => {
    // Determine current language from URL
    const pathname = window.location.pathname;
    currentLang = getLocaleFromUrl(pathname);
  });

  function handleLanguageChange(newLang: string) {
    if (newLang === currentLang) return;

    // Save the language preference in a cookie
    setLanguageCookie(newLang as import("@/i18n/constants").Locale);

    const pathname = window.location.pathname;
    const segments = pathname.split("/").filter(Boolean);

    // Always have at least the first segment (language)
    if (segments.length === 0) {
      // We're at root, just go to the language root
      window.location.href = `/${newLang}`;
      return;
    }

    // Replace the first segment (current language) with the new language
    segments[0] = newLang;
    window.location.href = `/${segments.join("/")}`;
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
          <Globe class="h-4 w-4" />
          <span>{langOption.label}</span>
        </div>
      </Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
