<script lang="ts">
  import {Button} from "@/components/primitives/button";
  import {authClient} from "@/lib/auth-client";

  let showConfirmation = false;
  let isDeleting = false;

  function handleDelete() {
    showConfirmation = true;
  }

  async function confirmDelete() {
    try {
      isDeleting = true;
      await authClient.deleteUser();
      window.location.href = "/sign-in";
    } catch (error) {
      console.error("Failed to delete account:", error);
    } finally {
      isDeleting = false;
      showConfirmation = false;
    }
  }

  function cancelDelete() {
    showConfirmation = false;
  }
</script>

<div class="relative">
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
