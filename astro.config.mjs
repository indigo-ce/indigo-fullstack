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
      SEND_EMAIL_FROM: envField.string({
        context: "server",
        access: "public",
        optional: true
      })
    }
  },
  output: "server",
  adapter: cloudflare({
    imageService: "cloudflare" // Use Cloudflare's native image optimization
  }),
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // Use react-dom/server.edge instead of react-dom/server.browser for React 19
      // Without this, MessageChannel from node:worker_threads needs to be polyfilled
      alias: {
        ...(process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test"
          ? {
              "react-dom/server": "react-dom/server.edge"
            }
          : {})
      }
    }
  },
  integrations: [react()]
});
