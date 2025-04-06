<script lang="ts">
  import {Button} from "@/components/primitives/button";
  import {authClient} from "@/lib/auth-client";

  let showConfirmation = false;
  let isDeleting = false;
  let error: string | null = null;

  function handleDelete() {
    error = null;
    showConfirmation = true;
  }

  async function confirmDelete() {
    try {
      error = null;
      isDeleting = true;
      await authClient.deleteUser();
      window.location.href = "/sign-in";
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to delete account";
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
      Delete Account
    </Button>
  {:else}
    <div class="flex items-center gap-2">
      <span class="text-sm text-gray-700">Are you sure?</span>
      <Button
        variant="destructive"
        size="sm"
        onclick={confirmDelete}
        disabled={isDeleting}
      >
        {#if isDeleting}Deleting...{:else}Yes{/if}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onclick={cancelDelete}
        disabled={isDeleting}
      >
        No
      </Button>
    </div>
  {/if}
</div>
