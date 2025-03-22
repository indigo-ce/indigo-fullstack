<script lang="ts">
  import { Button } from "@/components/primitives/button";
  import { Input } from "@/components/primitives/input";
  import { EyeIcon, EyeOffIcon, LockIcon, MailIcon, UserIcon } from "lucide-svelte";
  import { authClient } from "@/lib/auth-client";
  
  export let onSuccess: (() => void) | undefined = undefined;
  
  let error: string | null = null;
  let name = "";
  let email = "";
  let password = "";
  let showPassword = false;
  
  const togglePasswordVisibility = () => {
    showPassword = !showPassword;
  };
  
  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    error = null;
    
    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      });
      
      if (Boolean(result.error) === false) {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = "/";
        }
      } else {
        error = result.error?.message || "An error occurred during sign up";
      }
    } catch (err) {
      error = "An unexpected error occurred";
      console.error(err);
    }
  };
</script>

<div class="flex flex-col items-center justify-center w-full my-12 min-h-[70dvh]">
  <div class="w-full max-w-xs">
    <h1 class="text-2xl font-bold mb-8 text-center">Create Account</h1>
    
    {#if error}
      <p class="text-red-500 mb-4 text-sm">{error}</p>
    {/if}
    
    <form on:submit={handleSubmit} class="space-y-4">
      <div class="relative flex items-center rounded-md border focus-within:ring-1 focus-within:ring-ring pl-2">
        <UserIcon class="h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Name"
          class="border-0 focus-visible:ring-0 shadow-none bg-transparent dark:bg-transparent"
          bind:value={name}
          required
        />
      </div>
      
      <div class="relative flex items-center rounded-md border focus-within:ring-1 focus-within:ring-ring pl-2">
        <MailIcon class="h-5 w-5 text-muted-foreground" />
        <Input
          type="email"
          placeholder="Email"
          class="border-0 focus-visible:ring-0 shadow-none bg-transparent dark:bg-transparent"
          bind:value={email}
          required
        />
      </div>
      
      <div class="relative flex items-center rounded-md border focus-within:ring-1 focus-within:ring-ring px-2">
        <LockIcon class="h-5 w-5 text-muted-foreground" />
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          class="border-0 focus-visible:ring-0 shadow-none bg-transparent dark:bg-transparent"
          bind:value={password}
          required
        />
        <button
          type="button"
          on:click={togglePasswordVisibility}
          class="focus:outline-none"
        >
          {#if showPassword}
            <EyeOffIcon class="h-5 w-5 text-muted-foreground" />
          {:else}
            <EyeIcon class="h-5 w-5 text-muted-foreground" />
          {/if}
        </button>
      </div>
      
      <Button type="submit" class="w-full">
        Sign Up
      </Button>
      
      <p class="text-center text-sm mt-4">
        Already have an account?{" "}
        <a href="/sign-in" class="text-primary underline">
          Sign in here
        </a>
      </p>
    </form>
  </div>
</div>