// @ts-check
import {defineConfig, fontProviders} from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    imageService: "cloudflare", // Use Cloudflare's native image optimization
    // 0 lets workerd pick a free inspector port, so two dev servers on one
    // machine (another checkout, `pnpm email-worker:dev` beside `pnpm dev`)
    // don't collide on the fixed default.
    inspectorPort: 0
  }),
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // Use react-dom/server.edge instead of react-dom/server.browser for React 19
      // Without this, MessageChannel from node:worker_threads needs to be polyfilled
      alias: {
        ...(process.env.NODE_ENV === "production" ||
        process.env.NODE_ENV === "test"
          ? {
              "react-dom/server": "react-dom/server.edge"
            }
          : {})
      }
    },
    server: {
      // Lets the dev server answer on a tunnel hostname (e.g. for testing
      // mobile clients against `pnpm dev`) without hardcoding one.
      allowedHosts:
        process.env.ASTRO_DEV_ALLOWED_HOSTS?.split(",")
          .map((host) => host.trim())
          .filter(Boolean) ?? []
    }
  },
  // Self-hosted webfont, read from @fontsource-variable/inter at build time and
  // emitted into dist/. The local provider keeps the build free of network
  // calls to font CDNs. Layout.astro renders <Font cssVariable="--font-inter" />
  // to emit the @font-face rules; --font-sans points at the variable in the
  // stylesheets.
  fonts: [
    {
      name: "Inter",
      cssVariable: "--font-inter",
      provider: fontProviders.local(),
      options: {
        variants: [
          {
            // Weight range inferred from the variable font file itself.
            src: [
              "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"
            ]
          }
        ]
      }
    }
  ],
  integrations: [react()]
});
