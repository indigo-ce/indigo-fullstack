# TODO

- [x] Replace icon in the navigation header with the correct one.
- [x] Improve design of header and footer.
- [ ] Fix callbackURL since it's only used after email verification
- [ ] auth.api returns data and error, you can check for an error and get success that way

## PR #16: Plunk Migration Follow-ups

### Issues (should fix before merge)

- [x] Remove dead Resend code from `src/lib/email.ts` (unused `sendEmail()`, `sendEmailWithResend()`, `import {Resend}`) and remove `resend` from `package.json`
- [x] Fix Plunk API key pattern in README — says "starts with `re_`" and shows `PLUNK_API_KEY=re_xxxxxxxxxx`, which is the Resend format, not Plunk
- [x] Remove Plunk test domains (`delivered@useplunk.com`, `bounced@useplunk.com`, `complained@useplunk.com`) — Plunk does not have Resend-style test infrastructure. Update README
- [x] Remove `ChangeEmailVerification` template
- [x] Confirm `pnpm build` passes with the `EMAIL_QUEUE` binding (ensure `pnpm cf-types` was run to regenerate Env type)

### Suggestions (nice to have)

- [x] Remove `idempotencyKey` — it's in the type and docs but the worker never checks for it
- [x] Clean up `?verified=true` query param on dashboard after displaying the success banner to avoid persistence on refresh
- [x] Align retry delay cap in `indigo-email-queue-consumer/src/index.ts` — the 300s cap never triggers with 3 retries, consider removing or documenting accurately

## Architecture Sync

Ordered backlog for architecture and test-infrastructure alignment. Each item is scoped to a single focused PR. Later items assume earlier ones have landed.

### 1. [x] Make the Workers test environment run against a real migrated D1

**Gap.** `vitest.config.ts` calls `readD1Migrations()` but never binds the result, so no test can create the schema — the D1 binding is always empty. `tests/setup/vitest-setup.ts` compounds this by globally mocking `better-auth` (`betterAuth` returns `{}`), `@react-email/render`, and `crypto.randomUUID`, which makes it impossible to exercise the real auth stack, real template rendering, or real ID generation from any test. The environment also carries drift: a `RESEND_API_KEY` binding and a matching `.dev.vars` line in `.github/workflows/test.yml` that no longer correspond to any dependency or code path, and two conflicting ambient declarations of the `cloudflare:test` module (`tests/env.d.ts` and `tests/setup/test-env.d.ts`).

**Scope.**

- Expose the migrations as a `TEST_MIGRATIONS` miniflare binding in `vitest.config.ts`.
- Delete `tests/setup/vitest-setup.ts` and its `setupFiles` entry; adjust the existing unit tests that relied on the global mocks to mock locally instead.
- Keep exactly one `cloudflare:test` declaration (`tests/env.d.ts`, extending the generated `Env` plus `TEST_MIGRATIONS`) and delete the duplicate.
- Drop the stale `RESEND_API_KEY` binding from `vitest.config.ts` and from the E2E `.dev.vars` heredoc in `.github/workflows/test.yml`.
- Narrow `test.include` to `tests/**/*.test.ts`.
- Extend `skills/indigo-testing/SKILL.md` with a short section on the Vitest layer (Workers pool, migration bootstrap, no global mocks); it currently documents Playwright only.

**Acceptance.** A test can call `applyD1Migrations(env.DB, env.TEST_MIGRATIONS)` in `beforeAll` and then read and write the `user` and `session` tables. No test file resolves a globally mocked `better-auth` or `@react-email/render`.

**Validation.** `pnpm test:run` passes locally and in the `Test` workflow. `pnpm check` passes with no `cloudflare:test` type conflicts.

### 2. [x] Replace the mocked mobile auth integration test with real request coverage

**Gap.** `tests/integration/auth-routes.test.ts` mocks `authMiddleware` and asserts against its own mock return values, so it verifies nothing about the running code. It asserts `data.token` on sign-in, a field neither the route nor the refresh-access plugin has ever returned, and three of its cases assert only `status >= 200 && status < 600`, which cannot fail. The mobile token surface therefore has no real coverage.

**Depends on:** item 1.

**Scope.** Rewrite the file to drive `createHonoApp(env)` against real D1 and real Better Auth: apply migrations, create a user via `createAuth(env).api.signUpEmail`, then exercise `POST /api/v1/auth/sign-in` (Basic auth), `/api/v1/auth/refresh-access`, and `/api/v1/auth/revoke-access` through the mounted app. Cover the success shapes, a missing refresh token (400), a garbage token (401), an expired token (401), revoke idempotency for unknown tokens, rotation invalidating the previous token, and a revoked token rejected on reuse. Put the sign-in response-shape assertion in one shared helper so the field-name work in item 3 touches a single place. Leave `tests/integration/auth-routes-locale.test.ts` alone — mocking `createAuth` there is the right tool for asserting locale propagation.

**Acceptance.** No `vi.mock` of `authMiddleware` or `@/lib/auth` remains in the file. Every assertion pins a specific status and body. Tests fail if the plugin stops rotating refresh tokens or stops deleting the session on revoke.

**Validation.** `pnpm test:run`. Temporarily disabling rotation in `src/plugins/better-auth/refresh-access/index.ts` must make the suite red.

### 3. [x] Align the sign-in token response with the documented API contract

**Gap.** `CLAUDE.md` documents `POST /api/v1/auth/sign-in` as returning `{accessToken, refreshToken}`, and `/auth/refresh-access` does return `accessToken`/`refreshToken`/`tokenType`. The `signInTokens` endpoint in `src/plugins/better-auth/refresh-access/index.ts` instead returns `access`/`refresh`, so a mobile client has to read two different field names for the same two values across two calls in the same flow.

**Depends on:** item 2 (the rewritten tests pin the shape before and after the change).

**Scope.** Rename the two fields in the `signInTokens` response to `accessToken` and `refreshToken`, keeping `user` and `tokenType` as they are. Update the shared assertion helper from item 2 and any README or `CLAUDE.md` prose that describes the sign-in payload. No other endpoint changes.

**Acceptance.** `sign-in`, `refresh-access`, and `revoke-access` responses use one consistent vocabulary; the documented contract matches the code. A test asserts the exact key set returned by sign-in.

**Validation.** `pnpm test:run` and `pnpm check`. Grep the repo for `\.access\b` and `\.refresh\b` on token payloads to confirm no reader was missed.

### 4. [x] Cover email worker template rendering

**Gap.** `workers/indigo-email-queue-consumer/src/render-template.ts` maps every `EmailTemplate` variant in `src/lib/email-queue.ts` to a React Email component and is the only place localized email HTML is produced, yet it has no test — a missing or mis-localized template surfaces only in production. The worker imports application code through the `@app` alias, which is declared in the worker `tsconfig.json` but not in `vitest.config.ts` or `tests/tsconfig.json`, so no test can currently import it.

**Depends on:** item 1 (the global `@react-email/render` mock must be gone).

**Scope.** Add an `@app` → `./src` alias to `vitest.config.ts` `resolve.alias` and a matching `paths` entry plus `include` coverage for the worker sources in `tests/tsconfig.json`. Add `tests/unit/email-worker-render.test.ts` that renders all five `EmailTemplate` variants in both `en` and `ja` and asserts the output starts with a doctype and contains locale-specific copy from each template.

**Acceptance.** The test fails if a template is dropped from the switch, if a locale string regresses, or if rendering is stubbed out. The exhaustive `never` default in `render-template.ts` stays intact.

**Validation.** `pnpm test:run` and `pnpm check`.

### 5. [x] Cover the JWT-guarded API surface end to end

**Gap.** `tests/unit/middleware/jwt-middleware.test.ts` mocks `jose` and `@/lib/jwks-cache` wholesale, so nothing verifies that a token actually minted by sign-in passes verification against the JWKS the app serves. `/api/v1/account/profile`, `/api/v1/account/posts`, `/api/v1/health`, and `/api/v1/routes` have no integration coverage at all, and the middleware order in `createHonoApp` (D1 → auth → env → response time) is unasserted even though `jwtMiddleware` depends on both `c.get("auth")` and `c.get("env")`.

**Depends on:** items 1 and 2.

**Scope.** Add `tests/integration/api-surface.test.ts` driving `createHonoApp(env)`: `/health` returns `{status: "ok"}`; `/routes` lists each registered route exactly once and includes the auth and account paths; `/account/profile` returns 401 with no `Authorization` header, 401 with a malformed bearer token, and 200 with the identity of the signed-in user when given a real access token from sign-in. Assert the `X-Response-Time` header set by `responseTimeMiddleware` is present on a successful response. Keep the existing unit test for the middleware's error branches.

**Acceptance.** Coverage exists for both the authorized and unauthorized paths of `accountRoutes` using a genuine token, with no mocking of `jose` or the JWKS cache.


### 6. Triage Dependabot vulnerabilities on `main`

**Gap.** GitHub reports 184 vulnerabilities on the default branch (3 critical, 81 high, 81 moderate, 19 low), surfaced after pushing the Claude workflow removal. None of the existing items address dependency hygiene, so the count will keep growing while the architecture work proceeds.

**Scope.**
- Open Dependabot security PRs and group them by ecosystem; merge critical and high patches that don't require code changes first.
- For updates that touch application code (auth, queue, email), pin the dependency in a tracking issue and roll the fix into the next item in this list that owns the affected surface.
- Add a weekly Dependabot triage note to the PR template or `CONTRIBUTING.md` so the backlog doesn't reaccumulate silently.

**Acceptance.** Critical and high counts drop to zero within one PR cycle. Moderate and low counts trend down as PRs land; no individual dependency stays unpatched for more than 30 days.

### 7. [x] Provision the test runtime from the bindings `wrangler.jsonc` declares

**Gap.** `tests/env.d.ts` declares `ProvidedEnv extends Env`, so `env` from `cloudflare:test` types as the full generated `Env` — `DB`, `SESSION`, `EMAIL_QUEUE`, `ASSETS`, `BETTER_AUTH_BASE_URL`, `BETTER_AUTH_SECRET`, `SEND_EMAIL_FROM`. The runtime side never followed. The `miniflare` block in `vitest.config.ts` provisions `d1Databases: {DB: ...}` and five `bindings` (`NODE_ENV`, `BETTER_AUTH_BASE_URL`, `SEND_EMAIL_FROM`, `BETTER_AUTH_SECRET`, `TEST_MIGRATIONS`) and nothing else, so `env.SESSION` and `env.EMAIL_QUEUE` type-check and are `undefined` when read. `wrangler.jsonc` also declares `compatibility_flags: ["nodejs_compat"]`, while the `miniflare` block restates `compatibilityDate: "2025-04-30"` by hand and declares no flags at all — `src/plugins/better-auth/refresh-access/index.ts` calls `Buffer.from(...)` on the sign-in path and `tests/integration/auth-routes.test.ts` exercises it, so the flag is load-bearing for a test that passes today.

**The workaround is already in the tree.** `tests/unit/utils/mock-types.ts` exports a `MockEnv` interface hand-listing `NODE_ENV`, `SESSION`, `SEND_EMAIL_FROM`, `RESEND_API_KEY`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_BASE_URL`, `DB`, and `ASSETS`. It is a second parallel binding list and it has already drifted: it still carries `RESEND_API_KEY`, which item 1 removed from `vitest.config.ts` and the `Test` workflow, and it names no `EMAIL_QUEUE`.

**Scope.**

- Add `SESSION` (KV namespace), `EMAIL_QUEUE` (queue producer), and `compatibilityFlags: ["nodejs_compat"]` to the `miniflare` block, with a comment noting that the flags and `compatibilityDate` mirror `wrangler.jsonc`. Read the pool's option names for KV namespaces and queue producers out of the installed `@cloudflare/vitest-pool-workers` rather than guessing them.
- Delete `MockEnv` from `tests/unit/utils/mock-types.ts`; its only consumer, `tests/unit/middleware/auth-middleware.test.ts`, annotates against `Env` instead (`as unknown as Env` is fine — those fixtures are intentionally partial).
- Establish *why* `Buffer.from(...)` works today without the flag declared — either the pool supplies node compatibility by default or the runtime provides `Buffer` at that compatibility date — and record the answer in the PR. Declaring it explicitly is right either way: the test runtime should state the same contract the deployed one does rather than inherit it silently.
- Leave alone: `TEST_MIGRATIONS` stays hand-written (`vitest.config.ts` injects it and `wrangler.jsonc` does not declare it), the test-only values of `BETTER_AUTH_SECRET` and `BETTER_AUTH_BASE_URL`, and `include`, `exclude`, `coverage`, and `resolve.alias`. Do not add a queue consumer.

**Acceptance.** A new `tests/integration/env-bindings.test.ts` reads `env` from `cloudflare:test` and asserts that `env.SESSION` round-trips a `put`/`get` and that `env.EMAIL_QUEUE.send(...)` resolves without throwing. Confirm that case fails against the current `vitest.config.ts` before writing the fix, otherwise it proves nothing. A search under `tests/` for `MockEnv` returns nothing.

**Validation.** `pnpm test:run` (every existing file keeps its test count) and `pnpm cf-types && pnpm check`.

### 8. [x] Drive the middleware unit tests through a real Hono app

**Gap.** `tests/unit/utils/mock-types.ts` exports `createMockContext()` — an object literal carrying fifteen `as any` members and ending in `as unknown as Context`. `tests/unit/middleware/jwt-middleware.test.ts` does not import it; it inlines a byte-identical copy of that literal in its own `beforeEach` while still importing `MockNext` from the same file. The repository carries the same fake twice, in the same directory.

**What the fake costs.** Every assertion in both files is on a mock having been called — `expect(mockJson).toHaveBeenCalledWith({error: "Unauthorized"}, 401)`, `expect(mockContext.set).toHaveBeenCalledWith("auth", expect.any(Object))` — and never on a `Response`. Nothing checks that the middleware produces that status through Hono's own dispatch, or that an early return actually stops the chain. The `as unknown as Context` compounds it: the fake type-checks no matter what the middleware starts reading, so a middleware that begins calling `c.req.query()` or `c.header()` gets `undefined` at run time with `pnpm check` still green.

**Depends on:** item 7, which removes `MockEnv` from the same file.

**Scope.** Rebuild both files around a bare `new Hono<APIRouteContext>()` (the type is exported from `src/pages/api/[...path].ts`), one `app.use("*", ...)` seeding `auth`, `env`, and `db` the way `d1Middleware`, `authMiddleware`, and `envMiddleware` do inside `createHonoApp()`, the middleware under test, and a terminal handler returning 200 so a passing chain is distinguishable from a rejected one. Exercise it through `app.request()` and assert on `res.status` and the parsed body. Delete `tests/unit/utils/mock-types.ts` outright, `MockNext` with it. Keep every existing stub — the `vi.mock("jose", ...)` and `vi.mock("@/lib/jwks-cache", ...)` in the JWT file and the `vi.mock("@/lib/auth", ...)` in the auth file all stay; this item changes how the context is built, not what is stubbed.

**Acceptance.** No file under `tests/` imports `mock-types`. Each existing case keeps an equivalent assertion expressed as a status plus body, and the rejection cases prove the chain stopped by asserting the terminal handler's 200 body is absent rather than by asserting `next` was not called.

**Validation.** `pnpm test:run` with the same or a greater test count, and `pnpm check`.

### 9. [x] Make `pnpm check` produce the generated types it depends on

**Gap.** `worker-configuration.d.ts` is listed in the root `tsconfig.json` `include`, is gitignored, and is produced only by `pnpm cf-types` (`wrangler types`). It is the sole declaration of `Env` — the type behind every `createAuth(env)`, every middleware factory in `src/lib/hono/middleware/`, `queueEmail(to, template, env, options)`, and `context.locals.runtime.env`. On a fresh clone the file does not exist, so `pnpm check` fails with "Cannot find name 'Env'" across most of `src/`, and `pnpm dev` fails with it because `dev` is `pnpm check && astro dev`. The command that gates the dev server cannot run until someone knows to invoke a second, undocumented command first. The composition already exists one script over: `build` is `pnpm cf-types && astro build`, so the generated file is a build product there and a manual prerequisite in `check`.

**Second gap, same root cause.** The `Test` workflow runs `pnpm test:run` and Playwright and nothing else — no type check, no build. A change that breaks `astro check` reaches `main` without a red signal, which is also why the missing prerequisite has gone unnoticed.

**Scope.**

- Compose `check` as `pnpm cf-types && astro check --minimumSeverity warning`. `build` keeps its own `pnpm cf-types` so it still stands alone. `dev`, `test:run`, and `tsconfig.json` are unchanged.
- Add a `Type check` step running `pnpm check` to the `unit-tests` job in `.github/workflows/test.yml`, after `Install dependencies`. `wrangler types` reads `wrangler.jsonc` directly and needs no Cloudflare credentials and no `.dev.vars`, so this adds a dependency on a committed config file, not on a network call — confirm that in CI rather than assuming it.
- Do not add a `prepare`/`postinstall` hook, do not commit `worker-configuration.d.ts`, and do not remove it from `.gitignore`.

**Accepted cost.** `pnpm check` and `pnpm dev` each spend one extra `wrangler types` invocation. Measure it and put the number in the PR description; if it is not roughly a second, say so rather than merging on the assumption.

**Acceptance.** Delete `worker-configuration.d.ts` and confirm `pnpm check` fails on the current script — that failure is the evidence for this item and belongs in the PR description. With the same file deleted, `pnpm check` then regenerates it and exits 0, and `pnpm dev` starts.

**Validation.** `pnpm check`, `pnpm test:run`, and `pnpm build` pass; the `Test` workflow passes with the added step; `git status` is clean apart from the intended changes.

### 10. [x] Type-check the email consumer worker and make its manifest match how it is built

**Gap.** `pnpm-workspace.yaml` lists only `"."` as a package and `pnpm-lock.yaml` has a single importer, so `workers/indigo-email-queue-consumer/package.json` is never installed. Its declared `@react-email/components@^0.0.36` and `@react-email/render@^1.0.6` are several majors behind the root's `^0.5.3` and `^1.2.3`, and its `@cloudflare/workers-types@^4.20250127.0`, `typescript@^5.5.2`, and `wrangler@^4.62.0` are likewise never resolved. What actually builds the worker is the root install: `pnpm email-worker:deploy` runs the root `wrangler` with `--config`, and `render-template.ts` resolves `@react-email/render` and the `@app/components/email/*` templates out of the root `node_modules`. The manifest therefore describes a dependency set nothing uses, and whoever later adds the package under `packages:` silently moves production email rendering onto a much older library than the one the templates are authored against.

**Second gap.** `workers/indigo-email-queue-consumer/tsconfig.json` is not referenced by any `package.json` script or CI step. The root `tsconfig.json` excludes `workers`, so nothing type-checks the worker at all — a broken `@app` import or a `MessageBatch` signature change surfaces at deploy time. `tests/unit/email-worker-render.test.ts` (item 4) exercises `renderEmailTemplate` but not `src/index.ts` or `src/send-email.ts`.

**Depends on:** item 9, which adds the CI step this item extends.

**Scope.**

- Bring the worker's `@react-email/components`, `@react-email/render`, `react`, `react-dom`, `@types/react`, `@types/react-dom`, `typescript`, and `@cloudflare/workers-types` ranges onto the same values as the root `package.json`, so the manifest names the versions that actually bundle it.
- Add an `email-worker:check` script running `tsc --noEmit -p workers/indigo-email-queue-consumer/tsconfig.json`, and add it to the `Type check` step from item 9.
- Out of scope, deliberately: do not add the worker under `packages:` in `pnpm-workspace.yaml`. Doing so would resolve a second `wrangler` and `workerd` for every install, which is its own decision with its own blast radius. Leave the worker's independent `wrangler` entry in place; this item makes the ranges it declares honest, it does not remove its ability to be pinned separately.

**Acceptance.** `pnpm email-worker:check` exits 0. If the first run surfaces pre-existing diagnostics — a missing `lib` entry for the DOM types the email components need is the most likely one — fix them minimally in the worker's own `tsconfig.json` and record what was needed in the PR description. `pnpm-lock.yaml` is unchanged by the manifest edit, which is the proof that the worker's dependencies were never installed in the first place. `pnpm email-worker:dev` still starts.

**Validation.** `pnpm email-worker:check`, `pnpm check`, `pnpm test:run` (`tests/unit/email-worker-render.test.ts` passes unchanged), and `pnpm build`.


### 11. Land the deferred dependency upgrades

**Gap.** This PR takes the `npm_and_yarn` security group to the highest versions that need no code changes (`better-auth ^1.6.22`, `hono ^4.12.34`, `vitest ~3.2.6`). Everything below is a further upgrade that a `pnpm update --latest` surfaces but that does not land cleanly. Two are blocked upstream; the rest each need a specific code change. A full working implementation of all of them exists on the `deps/update-all-to-latest` branch (commit `d90f440`, opened and closed as PR #35) — that branch passes `pnpm check`, `pnpm test:run`, `pnpm build`, and `pnpm email-worker:check`, and is the reference for the work below rather than something to merge as-is.

**Blocked upstream — do not attempt yet.**

- **TypeScript 7.** `astro check` runs through `@astrojs/language-server`, which needs the programmatic compiler API that TypeScript's native 7.x compiler does not ship. Installing 7.0.2 makes `pnpm check` fail outright with `The TypeScript module loaded (found 7.0.2) does not expose the programmatic API`. Stay on 6.x until [withastro/roadmap#1321](https://github.com/withastro/roadmap/discussions/1321) closes. Note 6.x still requires the `baseUrl` removal below.
- **Vitest 5 / `@vitest/ui` 5.** `@cloudflare/vitest-pool-workers` peer-requires `vitest ^4.1.0`, and 0.22.0 is its newest release. Vitest can go to 4.x but no further until the pool ships a v5 peer range.

**Scope — each item is independently landable.**

- [x] **`typescript` 5.9 → 6.0.3.** Remove `baseUrl` from both `tsconfig.json` and `workers/indigo-email-queue-consumer/tsconfig.json`; it is deprecated in 6.x and errors under `tsc`, which makes `pnpm email-worker:check` fail. The `paths` entries in both files already resolve relative to their own config, so nothing else changes.
- [x] **`vitest` 3.2 → 4.1 with `@cloudflare/vitest-pool-workers` 0.9 → 0.22.** The pool dropped both `defineWorkersProject` and the `@cloudflare/vitest-pool-workers/config` entrypoint. Rewrite `vitest.config.ts` to import `cloudflareTest` and `readD1Migrations` from the package root, wrap the existing `poolOptions.workers` value in `plugins: [cloudflareTest(...)]`, and use `defineConfig` from `vitest/config`. The package ships the exact transformation as a codemod at `@cloudflare/vitest-pool-workers/codemods/vitest-v3-to-v4`; our config uses the async-function form, which that codemod refuses, so port it by hand. Separately, `env.EMAIL_QUEUE.send()` now resolves with delivery metadata instead of `undefined`, so the assertion in `tests/integration/env-bindings.test.ts` must stop pinning the return value.
- [ ] **`better-auth` 1.6 → 1.7.** Account identity is now scoped by issuer ([1.7 upgrade guide](https://better-auth.com/docs/guides/1-7-upgrade-guide#account-identity-is-scoped-by-issuer)). Add a required `issuer` column and a unique `(issuer, accountId)` index to `account`, plus the JWT plugin's new optional `expiresAt`, `alg`, and `crv` columns on `jwks`; without them Better Auth throws `The field "issuer" does not exist in the "account" Drizzle schema` at request time. The migration `pnpm db:generate` produces is `ALTER TABLE account ADD issuer text NOT NULL`, which SQLite rejects on any populated table — replace it by hand with the table-rebuild pattern already used in `0001`, backfilling `issuer` as `local:credential` where `providerId = 'credential'` and `'local:oauth:' || providerId` otherwise. That mirrors `createLocalAccountIssuer` / `createOAuthAccountIssuer` in `@better-auth/core`. 1.7 also pulls `@better-auth/prisma-adapter` and therefore `prisma` transitively; its unapproved build scripts make `pnpm install` exit non-zero, so add `"@prisma/engines": false` and `prisma: false` under `allowBuilds` in `pnpm-workspace.yaml` — this project uses the Drizzle adapter and must not run them.
- [x] **shadcn primitives behind their majors.** `react-day-picker` 9 → 10, `recharts` 2 → 3 (currently pinned exactly, without a caret, for this reason), and `react-resizable-panels` 3 → 4 each break the vendored component that wraps them: `classNames.table` is gone from day-picker, recharts v3 reshaped the `Tooltip` and `Legend` prop types, and resizable renamed `PanelGroup`/`PanelResizeHandle` to `Group`/`Separator` and swapped the `data-panel-group-direction` styling hook for `aria-[orientation]`. The shadcn registry has since been updated for all three, so refresh `src/components/ui/calendar.tsx`, `chart.tsx`, and `resizable.tsx` from it rather than hand-porting, rewriting the `cn` and `@/registry/new-york-v4/ui/*` imports to this project's paths. None of the three has a consumer in `src/` yet, so the blast radius is limited to the files themselves.

**Known consequence of moving to Vitest 4.** Better Auth leaves a floating rejected promise every time an endpoint throws an `APIError`, even though the awaited call path handles it and the route still returns the correct response. Vitest 4 reports these as unhandled errors and fails the run; Vitest 3 did not. It reproduces with a bare `auth.api.*` call with no Hono in the stack, and it reproduces on 1.4.17 as well, so it is pre-existing upstream behaviour that Vitest 4 surfaces rather than anything the upgrade introduces. Filter exactly those with an `onUnhandledError` hook in `vitest.config.ts` that returns `false` for errors named `APIError` carrying a numeric `statusCode`; prefer that over `dangerouslyIgnoreUnhandledErrors`, which would hide genuine unhandled errors too. Revisit if Better Auth fixes the leak upstream.

**Acceptance.** `pnpm check` reports 0 errors and 0 warnings, `pnpm test:run` passes with no unhandled errors and exits 0, `pnpm build` and `pnpm email-worker:check` succeed, and `pnpm db:migrate:local` applies cleanly against a database that already holds `account` rows — verify the backfilled `issuer` values rather than only that the migration ran.

**Validation.** All of the above, plus `pnpm install` exiting 0 on a clean `node_modules` to confirm the prisma build-script entries are in place.

### 12. [x] Preserve the refresh-token lifetime through sign-in and rotation

**Gap.** `signInTokens` in `src/plugins/better-auth/refresh-access/index.ts` computes a refresh window from `options?.refreshToken?.expiresIn || 30` days and hands it to `ctx.context.internalAdapter.createSession(user.user.id, true, {…, expiresAt}, false)`. The adapter assembles the row as `{...override, expiresAt: dontRememberMe ? 24h : sessionExpiration, userId, token, createdAt, updatedAt, ...defaults, ...(overrideAll ? override : {})}` — `expiresAt` is assigned _after_ the override is spread and is restored only when `overrideAll` is true. This call passes `dontRememberMe: true` and `overrideAll: false`, so the computed 30-day value is discarded and the session lands with the 24-hour expiry. `refreshToken.expiresIn` is dead configuration, and a mobile client's refresh token stops working roughly a day after sign-in no matter how often it refreshes.

**Second gap, same file.** Rotation in `refreshTokens` reapplies the original expiry with `ctx.context.internalAdapter.updateSession(newSession.id, {expiresAt: session.expiresAt})`, but `updateSession` is keyed on the session **token**, not the row id — it issues `where token = <id>`, which matches nothing. The rotated row keeps whatever `createSession` assigned it rather than the window it was signed in with, and the no-op is invisible because nothing reads the row back. The adjacent `deleteSession(claimMarker)` call is correct: it passes a token.

**Nothing covers either.** `tests/integration/auth-routes.test.ts` pins statuses and token shapes across sign-in, refresh, rotation, concurrency, and revoke, but never reads a `session` row's `expiresAt`, so both defects pass the suite today.

**Scope.**

- Read `createSession`, `updateSession`, and `deleteSession` out of the installed `better-auth` (the lockfile resolves 1.6.22) and confirm both behaviours above _before_ changing anything; record the signatures and what you observed in the PR description. If either differs, adjust the fix and say so rather than applying this description verbatim.
- In `signInTokens`, pass `dontRememberMe: false` to `createSession` and set the intended expiry with a follow-up `updateSession(session.token, {expiresAt: refreshTokenExpiry})`, with a comment recording why the second call is required. Do not reach for `overrideAll: true` — it would also hand the override control of `token`, `createdAt`, and `updatedAt`.
- In `refreshTokens`, key the expiry restoration on `newSession.token` instead of `newSession.id`.
- Leave the response payloads, the claim-marker concurrency guard, and `revokeTokens` unchanged. No schema, migration, or route change.

**Acceptance.** Two new cases in `tests/integration/auth-routes.test.ts` read the `session` table through Drizzle: after sign-in, the row holding the returned `refreshToken` has `expiresAt` within a minute of 30 days out; after one rotation, the new row's `expiresAt` is within a minute of the original row's. Confirm both fail against the current implementation first — a new test that passes before the fix proves nothing here, and the observed pre-change values belong in the PR description. Every existing case in that file passes unchanged.

**Validation.** `pnpm test:run` and `pnpm check`.

### 13. Give the refresh and revoke endpoints a declared request body

**Gap.** The plugin declares three endpoints through `createAuthEndpoint` using two conventions. `signInTokens` declares `body: z.object({basicToken: z.string()})`, so the framework validates its body and the call site gets a real type. `refreshTokens` and `revokeTokens` declare only `method` and `requireHeaders`, then read `ctx.body?.refreshToken || ctx.query?.refreshToken` and hand-check the result for emptiness. Each endpoint's contract is written in its handler instead of its definition, and `auth.api.refreshTokens({body})` in `src/lib/hono/routes/auth-routes.ts` passes an unvalidated `await c.req.json()` straight through.

**Second cost — the token travels in the URL.** The `ctx.query` fallback accepts a refresh token as a query parameter. Better Auth mounts plugin endpoints on the auth handler and `src/pages/api/auth/[...all].ts` forwards every path to it, so these endpoints are reachable outside the `/api/v1` router that owns the `{error}` shape and the response-time middleware. Query strings land in request logs. Confirm that reachability rather than trusting this note — issue `POST /api/auth/auth-tokens/refresh?refreshToken=<valid token>` against `pnpm preview` and record the status and body in the PR description.

**Depends on:** item 12 — same file; land the lifetime fix first rather than racing two changes through it.

**Scope.** Add `body: z.object({refreshToken: z.string().min(1)})` to `refreshTokens` and `revokeTokens`, read the token from `ctx.body.refreshToken` only, and drop the `ctx.query` fallback. Remove the hand-written `if (!refreshToken)` guard only after establishing what the declared schema actually rejects and with what status — if the guard is still reachable, keep it and say so. Leave `signInTokens`, the rotation and claim-marker logic, revoke idempotency, and the `{accessToken, refreshToken, tokenType}` / `{success: true}` payloads alone. Touch `src/lib/hono/routes/auth-routes.ts` only as far as the new body types require.

**Acceptance.** `tests/integration/auth-routes.test.ts` is the gate and passes **unchanged** — it already pins the 400 plus `{error: "Missing refresh token"}`, the 401s for garbage and expired tokens, revoke idempotency, rotation, and the concurrent-rotation case; needing to edit any of them means the outward contract moved and the change has overshot. Add two cases: `/api/v1/auth/refresh-access` with an empty JSON body returns a client error rather than a 500, and a request built as `createAuth(env as Env).handler(new Request("http://localhost/api/auth/auth-tokens/refresh?refreshToken=<valid token>", {method: "POST"}))` no longer rotates the token. A search of `src/plugins/` for `ctx.query` returns nothing.

**Validation.** `pnpm test:run` and `pnpm check`.

### 14. Give the API app one error contract, including top-level error and not-found handlers

**Gap.** Error rendering is declared once, inline in `src/lib/hono/routes/auth-routes.ts`: an `onError` mapping `APIError` to `{error: message}` plus `error.statusCode`, and everything else to a 500 `{error: "Internal server error"}`. Three parts of the same API do not have it.

- `src/lib/hono/routes/account-routes.ts` registers no `onError`, so anything thrown under `/api/v1/account/*` escapes to Hono's default handler and reaches the client as plain-text `Internal Server Error` instead of the `{error}` shape the rest of the API returns. That router is also typed `Hono<{Variables: {user: …}}>` rather than the shared `APIRouteContext`, while the `jwtMiddleware` mounted on it reads `c.get("auth")` and `c.get("env")` — variables its local type does not declare. It works because the parent chain sets them; the type understates what the router depends on.
- `createHonoApp` in `src/pages/api/[...path].ts` registers neither `onError` nor `notFound`. A throw inside the `v1.use("*", …)` chain (`d1Middleware`, `authMiddleware`, `envMiddleware`) renders as plain text, and `GET /api/v1/does-not-exist` returns Hono's plain-text `404 Not Found`. An API that answers JSON everywhere else hands a client text on two of its most common failure paths.
- Every handler in `auth-routes.ts` opens with an unguarded `await c.req.json()`, so a malformed body throws a `SyntaxError` that the existing `onError` maps to 500. A syntactically invalid request is a client error.

Nothing under `tests/integration/` exercises an unmatched route, a middleware failure, or a malformed body.

**Scope.**

- Move the `onError` body out of `auth-routes.ts` into a shared `handleAPIError` in a new `src/lib/hono/error-handler.ts`, and register it on `authRoutes`, on `accountRoutes`, and on the root app in `createHonoApp`. Add a `SyntaxError` branch returning 400 `{error: "Invalid JSON body"}` ahead of the 500 fallback; keep the existing `APIError` branch and its `console` behaviour as they are.
- Add `app.notFound((c) => c.json({error: "Not found"}, 404))` in `createHonoApp`, after `app.route("/api/v1", v1)`.
- Retype `accountRoutes` as `Hono<APIRouteContext>`, importing the type from `src/pages/api/[...path].ts` the way `authRoutes` already does.
- Establish rather than assume that a throw inside `v1.use("*", …)` reaches the root `onError` — `v1.route()` flattens the sub-router into the parent's dispatch chain, so one registration should cover both routers and the shared middleware. If it does not, register on `v1` as well and record why.
- Do not add, rename, or remove an endpoint, and do not change any success payload.

**Acceptance.** A new `tests/integration/api-error-handling.test.ts` asserts three things, each confirmed to fail against the current code first: `GET /api/v1/does-not-exist` returns 404 `{error: "Not found"}`; `createHonoApp` built against an env whose `BETTER_AUTH_SECRET` is empty returns a JSON 500 `{error: "Internal server error"}` from `GET /api/v1/health` — `createAuth` throws on that input inside `authMiddleware`, so this covers the middleware path rather than a route handler; and `POST /api/v1/auth/sign-up` with `Content-Type: application/json` and a malformed body returns 400 `{error: "Invalid JSON body"}`. `tests/integration/auth-routes.test.ts`, `tests/integration/auth-routes-locale.test.ts`, and `tests/integration/api-surface.test.ts` pass unchanged.

**Validation.** `pnpm test:run`, `pnpm check`, and `pnpm build`.

### 15. Cover the Astro page middleware and skip its session lookup for anonymous requests

**Gap.** `src/middleware.ts` runs on every non-`/api/` request and unconditionally builds an auth instance and issues `createAuth(env, locale).api.getSession({headers})` — a fresh Drizzle client and a D1 round trip — even when the request carries no session cookie at all. That is every first visit to `/`, every `/en/sign-in` load, and every 404: requests where the lookup cannot return a session and where time to first byte matters most.

**Second gap.** The file also owns the locale redirect for `/` and the `/api/` short-circuit, and it has no test. `tests/unit/middleware/` covers the three Hono middlewares (`d1-middleware`, `auth-middleware`, `jwt-middleware`); `tests/unit/middleware/auth-middleware.test.ts` targets `@/lib/hono/middleware/authMiddleware`, not this file. Nothing asserts what `src/middleware.ts` writes into `context.locals` or when it redirects.

**Scope.**

- Add a cookie-presence predicate to the Astro `authMiddleware`: split the `Cookie` header on `;`, take the text before the first `=` as the name, trim it, and treat the request as carrying a session only when a cookie whose **name** ends with `better-auth.session_token` has a non-empty value. The suffix match is what makes the `__Secure-` prefixed production cookie work — confirm the exact name against the installed `better-auth` and a locally issued cookie rather than trusting this note. On an anonymous request, set `context.locals.user` and `context.locals.session` to `null` and call `next()` without constructing an auth instance.
- Key the skip on cookie presence, not on pathname, so an already-signed-in visitor is still redirected away from the auth pages by the existing logic.
- Add `tests/unit/middleware/astro-auth-middleware.test.ts`. `src/middleware.ts` imports `astro:middleware`, which does not resolve under the Workers pool: add a `resolve.alias` entry in `vitest.config.ts` pointing it at a small stub under `tests/` implementing `defineMiddleware` as identity and `sequence` as left-to-right composition, and verify that composition semantics against the installed Astro rather than guessing. If aliasing proves unworkable, fall back to exporting the predicate as a named function, cover it directly, and state in the PR that the middleware body itself remains uncovered.
- Do not change `getLocaleFromRequest`, the locale precedence, the redirect targets, or what the middleware writes into `context.locals`.

**Acceptance.** With `@/lib/auth` mocked, `createAuth` is not called for a request with no `Cookie` header, for a decoy cookie whose _value_ contains the name (`returnTo=/x?next=better-auth.session_token`), or for an empty-valued `better-auth.session_token=`; and it _is_ called when the session cookie is present but not first (`preferred_lang=ja; __Secure-better-auth.session_token=abc`). Confirm the first three fail against the current implementation before writing the fix. The same file also covers the `/api/` short-circuit and the `/` locale redirect for a `preferred_lang=ja` cookie and for an `Accept-Language: ja` header. `tests/e2e/auth/protected-routes.spec.ts` and `tests/e2e/auth/sign-in.spec.ts` pass unchanged — they are what prove the signed-in redirects survived.

**Validation.** `pnpm test:run` and `pnpm check`.
