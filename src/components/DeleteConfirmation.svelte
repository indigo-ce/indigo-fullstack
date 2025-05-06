<script lang="ts">
  import {Button} from "@/components/primitives/button";
  import {authClient} from "@/lib/auth-client";
  import {translations} from "@/i18n/constants";
  import type {Locale} from "@/i18n/constants";
  import {localizeUrl} from "@/i18n/utils";

  export let locale: Locale = "en";

  let showConfirmation = false;
  let isDeleting = false;
  let error: string | null = null;

  const t = translations[locale] || translations.en;

  function handleDelete() {
    error = null;
    showConfirmation = true;
  }

  async function confirmDelete() {
    try {
      error = null;
      isDeleting = true;
      await authClient.deleteUser();
      const signInUrl = localizeUrl("/sign-in", locale);
      window.location.href = signInUrl;
    } catch (err) {
      error = err instanceof Error ? err.message : t.account.deleteFailed;
    } finally {
      isDeleting = false;
    }
  }

  function cancelDelete() {
    error = null;
    showConfirmation = false;
  }
</script>

<div class="relative">
  {#if error}
    <p class="text-sm text-destructive mt-2">{error}</p>
  {/if}

  {#if !showConfirmation}
    <Button variant="destructive" size="sm" onclick={handleDelete}>
      {t.account.deleteAccount}
    </Button>
  {:else}
    <div class="flex items-center gap-2">
      <span class="text-sm text-gray-700">
        {t.account.areYouSure}
      </span>
      <Button
        variant="destructive"
        size="sm"
        onclick={confirmDelete}
        disabled={isDeleting}
      >
        {#if isDeleting}{t.account.deleting}{:else}{t.account.yes}{/if}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onclick={cancelDelete}
        disabled={isDeleting}
      >
        {t.account.no}
      </Button>
    </div>
  {/if}
</div>
