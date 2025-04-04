<script lang="ts">
  import {Button} from "@/components/primitives/button";
  let showConfirmation = false;

  function handleDelete() {
    showConfirmation = true;
  }

  function confirmDelete() {
    // TODO: Add deletion logic here
    showConfirmation = false;
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
      <Button variant="destructive" size="sm" onclick={confirmDelete}>
        Yes
      </Button>
      <Button variant="outline" size="sm" onclick={cancelDelete}>No</Button>
    </div>
  {/if}
</div>
