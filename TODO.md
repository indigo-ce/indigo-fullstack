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

### 9. Make `pnpm check` produce the generated types it depends on

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

