---
name: astro-upgrade
description: This skill should be used when the user asks to "upgrade Astro", "bump Astro to v6", "migrate to Astro 7", "update the Astro version", "fix the Astro upgrade", "update @astrojs/cloudflare", "port the Astro upgrade", or works with Astro major version upgrades in Astro + Cloudflare Workers projects.
---

# Astro Major Upgrade

Upgrade Astro **one major at a time** (e.g. 5 → 6, then 6 → 7), on a **new branch**, with a **separate commit per major**. Never jump versions in one step, and never let dependency bots do it unattended — each major has breaking changes that need code migration and validation.

## Branch and Baseline

```bash
git checkout -b chore/astro-N-upgrade
pnpm astro --version
pnpm check && pnpm build && pnpm test:run
```

Record the baseline: Astro version, adapter versions, and whether check/build/tests pass. If the baseline is red, fix that first — otherwise you can't tell which major broke what.

## Per Major: Guide → Pin → Migrate → Validate

For each major `N → N+1`:

### 1. Read the official upgrade guide

The guide is the source of truth — do not rely on memory:

- `https://docs.astro.build/en/guides/upgrade-to/vN/` (e.g. `/v6/`, `/v7/`)
- The Cloudflare adapter guide's upgrade section: `https://docs.astro.build/en/guides/integrations-guide/cloudflare/`
- The adapter changelogs for the companion majors (`packages/integrations/cloudflare/CHANGELOG.md`, `.../node/CHANGELOG.md`, `.../react/CHANGELOG.md` in `withastro/astro`)

Note: `pnpm dlx @astrojs/upgrade` always targets **latest** — it cannot step through majors. For sequential upgrades, pin versions manually instead.

### 2. Pin Astro and official integrations together

Bump `astro` plus every `@astrojs/*` package to the companion major in one edit, then `pnpm install`. Known-good pairings:

| Astro | `@astrojs/cloudflare` | `@astrojs/node` | `@astrojs/react` | `@astrojs/check` | Min wrangler |
| ----- | --------------------- | --------------- | ---------------- | ---------------- | ------------ |
| 6.x   | ^13                   | ^10             | ^5               | ^0.9             | ^4.83        |
| 7.x   | ^14                   | ^11             | ^6               | ^0.9             | ^4.125       |

Always check the adapter's `peerDependencies` after install — if `pnpm check` fails with "installed version of Wrangler does not satisfy the peer dependency", bump `wrangler` to the required range.

### 3. Migrate breaking changes

Audit the repo against the guide's checklist. The recurring surface in Astro + Cloudflare projects:

**Astro core**

- **Node version**: Astro 6+ requires Node `>=22.12.0`. Verify local (`node -v`), `engines` in `package.json`, and add a `.nvmrc` (`22.12.0`) so deploys pin it too.
- **Zod**: Astro 6 moved to Zod 4. Replace deprecated `z.string().email()` / `z.string().url()` with `z.email()` / `z.url()`, `{ message }` with `{ error }` in refinements, and fix `.default()` values to match the **output** type. Import from `astro/zod` — never `astro:schema` or `astro:content` (both deprecated in v6).
- **Removed APIs**: `Astro.glob()` → `import.meta.glob()`; `<ViewTransitions />` → `<ClientRouter />`; `emitESMImage()` → `emitImageMetadata()`; `handleForms` prop and `prefetch(..., { with })` option must be deleted.
- **`getStaticPaths()`**: the `Astro` object inside it is deprecated — use `import.meta.env.SITE` instead of `Astro.site`, drop `Astro.generator`.
- **`import.meta.env.ASSETS_PREFIX`** → `build.assetsPrefix` from `astro:config/server`.
- **Content collections**: v6 removed automatic v4 backwards compatibility. Collections must use the Content Layer API (`src/content.config.ts`, `entry.id`, `render(entry)` from `astro:content`). The `legacy.collectionsBackwardsCompat` flag is only a temporary bridge.
- **Actions internals**: only the documented API is exported. `serializeActionResult` / `deserializeActionResult` now come from `getActionContext(context)`.
- **Markdown (v7)**: Sätteri is the default processor and `@astrojs/markdown-remark` is no longer installed. Projects without remark/rehype plugins need no change; projects with them must install `@astrojs/markdown-remark` and set `markdown.processor: unified()`, or port to Sätteri plugins.
- **Whitespace (v7)**: `compressHTML` defaults to `'jsx'` (React-style stripping). Inspect pages with adjacent inline elements and insert explicit `{" "}` where spaces collapse; or set `compressHTML: true` to keep legacy behavior.
- **Rust compiler (v7)**: the Go compiler is gone and the Rust compiler rejects unclosed tags and passes invalid HTML nesting through uncorrected. A successful `pnpm build` is the test — fix every template error it reports.
- **Reserved names (v7)**: `src/fetch.ts` is now the advanced-routing config file. Rename any unrelated file and fix imports, or set `fetchFile` in config.
- **Experimental flags (v7)**: `logger`, `queuedRendering`, `rustCompiler`, `advancedRouting`, `cache`/`routeRules` graduated to stable — move them out of `experimental` (or delete, where the new behavior is default).
- **Container API (v7)**: `getContainerRenderer()` must be imported from `@astrojs/react/container-renderer` (and equivalents), not the package root.
- **`@astrojs/db`** was removed in v7 — replace with Drizzle directly, `node:sqlite`, or a platform database library.

**Cloudflare adapter (v13+ for Astro 6)**

- **Entrypoint**: `wrangler.jsonc` `"main"` must be `"@astrojs/cloudflare/entrypoints/server"` (not `./dist/_worker.js/index.js`).
- **Removed `platformProxy` option** — delete it from `adapter: cloudflare({...})`. Dev now always runs in `workerd`.
- **Removed `Astro.locals.runtime`**: replace with direct Workers APIs —
  - `Astro.locals.runtime.env` / `context.locals.runtime.env` → `import { env } from "cloudflare:workers"`
  - `.cf` → `Astro.request.cf`
  - `.caches` → global `caches`
  - `.ctx` → `Astro.locals.cfContext`
- **`env.d.ts`**: `Runtime` from `@astrojs/cloudflare` now only carries `cfContext`. Keep `interface Locals extends Runtime`, and augment the generated types with secrets that `wrangler types` never emits (they live in `.dev.vars` / `wrangler secret`):

  ```ts
  interface Env {
    BETTER_AUTH_SECRET: string;
  }
  declare namespace Cloudflare {
    interface Env {
      BETTER_AUTH_SECRET: string;
    }
  }
  ```

- **`imageService` default** changed from `'compile'` to `'cloudflare-binding'`. An explicit `imageService` setting is unaffected — leave it if intentional.
- **Pages → Workers**: Pages deployment is no longer supported. The project must deploy as a Worker.
- **`compatibility_date`** should be refreshed (run `pnpm cf-types` / `wrangler types` and confirm), and per-environment deploys must build separately: `CLOUDFLARE_ENV=some-env astro build && wrangler deploy`.

**Indigo-stack specifics**

- Every `createAuth(env, locale)` / `createHonoApp(env)` call site takes the `cloudflare:workers` `env` import after migration — pages, API routes (`src/pages/api/`), `src/middleware.ts`, and `src/actions/`.
- Unused `context` params in actions/API routes must be renamed with a leading underscore (`_context`) to satisfy `noUnusedParameters`.
- `src/env.d.ts` is the canonical place for the `Env`/`Cloudflare.Env` secret augmentation above.

### 4. Validate before the next major

All four must pass on the new major before moving on:

```bash
pnpm check      # 0 errors, 0 warnings
pnpm build      # exercises the new compiler + adapter
pnpm test:run   # unit/integration
pnpm test:e2e   # Playwright against the real runtime
```

### 5. Commit per major

One commit per major, naming the versions so the sequence is reviewable:

```
Upgrade Astro 5 to 6 with Cloudflare adapter v13
Upgrade Astro 6 to 7 with Cloudflare adapter v14
```

Push the branch and open the PR only after the final major validates.

## Porting to Another Repo

1. Copy this skill file into the target repo's skills directory.
2. Run the baseline step — the target's breaking-change surface differs (content collections? remark plugins? Pages? custom entrypoints?).
3. Walk the same per-major loop; the version-pairing table and Cloudflare checklist apply unchanged. Only the "Indigo-stack specifics" section may need adapting to the target's auth/data layer.
