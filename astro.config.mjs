// @ts-check
import {defineConfig} from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import svelte from "@astrojs/svelte";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    platformProxy: {
      enabled: true // Use astro built-in commands
    }
  }),
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // Used to avoid SSR issues with nodemailer (dev only))
      external: [
        "events",
        "util",
        "url",
        "net",
        "dns",
        "crypto",
        "fs",
        "os",
        "child_process",
        "http",
        "https",
        "zlib",
        "stream",
        "path",
        "tls"
      ]
    }
  },
  integrations: [svelte(), react()]
});
