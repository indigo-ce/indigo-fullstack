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

- **Node version**: Astro 6+ requires Node `>=22.12.0`. Verify local (`node -v`), `engines` in `package.json`, and add a `.nvmrc` so deploys pin it too. If the project is on **pnpm 11**, the floor is `22.13.0` — pnpm 11 refuses to run below it, and Cloudflare Workers builds read `.nvmrc`. Keep `.nvmrc` and `engines.node` in sync at the higher of the two floors.
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
- **`compatibility_date` must be refreshed — this is not cosmetic.** A stale date combined with `nodejs_compat` makes every SSR route return HTTP 200 with a literal `[object Object]` body (15 bytes). See [The `[object Object]` trap](#the-object-object-trap) below. Refresh it whenever you touch the adapter major, then `pnpm cf-types` / `wrangler types` to confirm.
- **Per-environment deploys** must build separately: `CLOUDFLARE_ENV=some-env astro build && wrangler deploy`.

**Local preview and e2e (v13+)**

- The documented local preview is **`astro build && astro preview`**, which runs the real `workerd`. `wrangler dev` still works and remains the better choice for Playwright.
- `astro preview` is awkward to drive from CI: it **daemonizes when stdout is not a TTY** (so Playwright's `webServer` sees the process exit early) and binds **IPv6 `::1` only** (so a `http://127.0.0.1:PORT` health check never connects). Prefer `wrangler dev --port N` in `webServer.command`, or pass `--host 127.0.0.1` and manage the daemon yourself.
- Playwright's `reuseExistingServer: !process.env.CI` will silently attach to **any** process already holding the port — including an unrelated project's dev server. That produces a fully green local run that proves nothing. Before trusting a local e2e pass, confirm the port was actually free (`lsof -nP -iTCP:PORT -sTCP:LISTEN`), or run once with `reuseExistingServer: false`.

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

`pnpm build` passing proves the compiler accepted your templates — it does **not** prove pages render. Add one explicit smoke check against the built worker, because a corrupt-response bug shows up in E2E only as an assertion timeout:

```bash
pnpm build && npx wrangler dev --port 8788 &
curl -s -w '\n%{http_code} %{size_download}b\n' http://127.0.0.1:8788/
```

A 15-byte `[object Object]` body means the runtime is misconfigured — see [The `[object Object]` trap](#the-object-object-trap). And confirm the E2E port was genuinely free before trusting a green run.

### 5. Commit per major

One commit per major, naming the versions so the sequence is reviewable:

```
Upgrade Astro 5 to 6 with Cloudflare adapter v13
Upgrade Astro 6 to 7 with Cloudflare adapter v14
```

Push the branch and open the PR only after the final major validates.

## Troubleshooting

### The `[object Object]` trap

**Symptom**: every server-rendered route returns HTTP 200, `Content-Type: text/html`, and a 15-byte body containing exactly `[object Object]`. Static/prerendered pages are fine. `pnpm build` succeeds. E2E tests fail as content-assertion _timeouts_, which makes it look like a hang rather than a render bug.

**Cause**: a stale `compatibility_date` in `wrangler.jsonc` combined with the `nodejs_compat` flag. Workerd's older `nodejs_compat` process semantics corrupt the `Response` the adapter returns. It is **not** an Astro or adapter bug, and it is not version-pair-specific.

**Fix** — either one works:

```jsonc
// preferred: refresh the date (match what `create astro` currently scaffolds)
"compatibility_date": "2026-09-03"

// or: keep the old date and opt out of the new process semantics
"compatibility_flags": ["nodejs_compat", "disable_nodejs_process_v2"]
```

Measured on Astro 7.3.1 + `@astrojs/cloudflare` 14.3.0 with `nodejs_compat`: dates `2025-10-15` and `2026-02-01` are broken; `2026-05-01` and later are fine. Astro 6 + adapter 13 does not exhibit it, so it surfaces during a 6 → 7 upgrade and looks like Astro 7 broke.

Related upstream reports, all describing this symptom: withastro/astro [#15434](https://github.com/withastro/astro/issues/15434), [#14511](https://github.com/withastro/astro/issues/14511), [#17570](https://github.com/withastro/astro/issues/17570). Note #17570 blames `no_bundle: true` in the generated `dist/server/wrangler.json` and offers `no_bundle: false` as a workaround — that is a **red herring**. Setting it makes `wrangler` re-bundle around the corruption, but `astro preview` ignores `no_bundle` entirely and stays broken. Fix the compatibility date instead.

### Diagnosing runtime breakage: compare against a fresh scaffold

When an upgrade produces runtime breakage that the guides do not explain, the fastest way to separate "upstream is broken" from "our config is stale" is to scaffold a clean project on the same versions and diff the configuration:

```bash
pnpm create astro@latest scratch-app -- --template minimal
cd scratch-app && pnpm astro add cloudflare
```

Then diff `wrangler.jsonc`, `astro.config.mjs`, and `package.json` scripts against the real project. Config that a years-old scaffold generated — `compatibility_date`, `compatibility_flags`, `main`, `assets.directory`, preview scripts — is carried forward untouched by upgrade guides and is where stale settings hide.

Two pitfalls that make this test lie:

- **A scaffolded template is fully prerendered.** Its default page never exercises SSR, so it renders fine no matter what. Add a page with `export const prerender = false` before concluding anything.
- **Editing `wrangler.jsonc` requires a rebuild.** The file wrangler actually serves is the generated `dist/server/wrangler.json`. Restarting the server without re-running `astro build` tests the _old_ config and yields a false negative. Always `astro build` between config changes, and verify with:

  ```bash
  python3 -c "import json;d=json.load(open('dist/server/wrangler.json'));print(d['compatibility_date'],d['compatibility_flags'],d['no_bundle'])"
  ```

Change one variable at a time and record a small matrix. A single untested variable is what turns "this config is stale" into a wrong conclusion that the version pair is unusable.

## Porting to Another Repo

1. Copy this skill file into the target repo's skills directory.
2. Run the baseline step — the target's breaking-change surface differs (content collections? remark plugins? Pages? custom entrypoints?).
3. Walk the same per-major loop; the version-pairing table and Cloudflare checklist apply unchanged. Only the "Indigo-stack specifics" section may need adapting to the target's auth/data layer.
