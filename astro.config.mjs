// @ts-check
import {defineConfig, envField} from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  env: {
    schema: {
      BETTER_AUTH_SECRET: envField.string({
        context: "server",
        access: "secret"
      }),
      RESEND_API_KEY: envField.string({
        context: "server",
        access: "secret"
      }),
      SEND_EMAIL_FROM: envField.string({
        context: "server",
        access: "public",
        optional: true
      })
    }
  },
  output: "server",
  adapter: cloudflare({
    platformProxy: {
      enabled: true // Use astro built-in commands
    }
  }),
  vite: {
    // @ts-expect-error - tailwindcss vite plugin type compatibility issue
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
    }
  },
  integrations: [react()]
});
