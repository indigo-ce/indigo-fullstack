import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
// @ts-check
import {defineConfig, envField} from "astro/config";

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
    platformProxy: {
      enabled: true // Use astro built-in commands
    }
  }),
  env: {
    schema: {
      BETTER_AUTH_SECRET: envField.string({
        access: "secret",
        context: "server"
      }),
      RESEND_API_KEY: envField.string({
        access: "secret",
        context: "server"
      })
    }
  },
  integrations: [svelte(), react()],
  output: "server",
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // Use react-dom/server.edge instead of react-dom/server.browser for React 19
      // Without this, MessageChannel from node:worker_threads needs to be polyfilled
      alias: {
        ...(process.env.NODE_ENV === "production"
          ? {
              "react-dom/server": "react-dom/server.edge"
            }
          : {})
      }
    },
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
  }
});
