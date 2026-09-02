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
- Narrow `test.include` to `tests/**/*.test.ts` and add coverage exclusions for `tests/**`, `*.config.*`, `drizzle/**`, and `worker-configuration.d.ts`.
- Extend `skills/indigo-testing/SKILL.md` with a short section on the Vitest layer (Workers pool, migration bootstrap, no global mocks); it currently documents Playwright only.

**Acceptance.** A test can call `applyD1Migrations(env.DB, env.TEST_MIGRATIONS)` in `beforeAll` and then read and write the `user` and `session` tables. No test file resolves a globally mocked `better-auth` or `@react-email/render`. Coverage output reports application code only.

**Validation.** `pnpm test:run` and `pnpm test:coverage` pass locally and in the `Test` workflow. `pnpm check` passes with no `cloudflare:test` type conflicts.

### 2. Replace the mocked mobile auth integration test with real request coverage

**Gap.** `tests/integration/auth-routes.test.ts` mocks `authMiddleware` and asserts against its own mock return values, so it verifies nothing about the running code. It asserts `data.token` on sign-in, a field neither the route nor the refresh-access plugin has ever returned, and three of its cases assert only `status >= 200 && status < 600`, which cannot fail. The mobile token surface therefore has no real coverage.

**Depends on:** item 1.

**Scope.** Rewrite the file to drive `createHonoApp(env)` against real D1 and real Better Auth: apply migrations, create a user via `createAuth(env).api.signUpEmail`, then exercise `POST /api/v1/auth/sign-in` (Basic auth), `/api/v1/auth/refresh-access`, and `/api/v1/auth/revoke-access` through the mounted app. Cover the success shapes, a missing refresh token (400), a garbage token (401), an expired token (401), revoke idempotency for unknown tokens, rotation invalidating the previous token, and a revoked token rejected on reuse. Put the sign-in response-shape assertion in one shared helper so the field-name work in item 3 touches a single place. Leave `tests/integration/auth-routes-locale.test.ts` alone — mocking `createAuth` there is the right tool for asserting locale propagation.

**Acceptance.** No `vi.mock` of `authMiddleware` or `@/lib/auth` remains in the file. Every assertion pins a specific status and body. Tests fail if the plugin stops rotating refresh tokens or stops deleting the session on revoke.

**Validation.** `pnpm test:run`. Temporarily disabling rotation in `src/plugins/better-auth/refresh-access/index.ts` must make the suite red.

### 3. Align the sign-in token response with the documented API contract

**Gap.** `CLAUDE.md` documents `POST /api/v1/auth/sign-in` as returning `{accessToken, refreshToken}`, and `/auth/refresh-access` does return `accessToken`/`refreshToken`/`tokenType`. The `signInTokens` endpoint in `src/plugins/better-auth/refresh-access/index.ts` instead returns `access`/`refresh`, so a mobile client has to read two different field names for the same two values across two calls in the same flow.

**Depends on:** item 2 (the rewritten tests pin the shape before and after the change).

**Scope.** Rename the two fields in the `signInTokens` response to `accessToken` and `refreshToken`, keeping `user` and `tokenType` as they are. Update the shared assertion helper from item 2 and any README or `CLAUDE.md` prose that describes the sign-in payload. No other endpoint changes.

**Acceptance.** `sign-in`, `refresh-access`, and `revoke-access` responses use one consistent vocabulary; the documented contract matches the code. A test asserts the exact key set returned by sign-in.

**Validation.** `pnpm test:run` and `pnpm check`. Grep the repo for `\.access\b` and `\.refresh\b` on token payloads to confirm no reader was missed.

### 4. Cover email worker template rendering

**Gap.** `workers/indigo-email-queue-consumer/src/render-template.ts` maps every `EmailTemplate` variant in `src/lib/email-queue.ts` to a React Email component and is the only place localized email HTML is produced, yet it has no test — a missing or mis-localized template surfaces only in production. The worker imports application code through the `@app` alias, which is declared in the worker `tsconfig.json` but not in `vitest.config.ts` or `tests/tsconfig.json`, so no test can currently import it.

**Depends on:** item 1 (the global `@react-email/render` mock must be gone).

**Scope.** Add an `@app` → `./src` alias to `vitest.config.ts` `resolve.alias` and a matching `paths` entry plus `include` coverage for the worker sources in `tests/tsconfig.json`. Add `tests/unit/email-worker-render.test.ts` that renders all five `EmailTemplate` variants in both `en` and `ja` and asserts the output starts with a doctype and contains locale-specific copy from each template.

**Acceptance.** The test fails if a template is dropped from the switch, if a locale string regresses, or if rendering is stubbed out. The exhaustive `never` default in `render-template.ts` stays intact.

**Validation.** `pnpm test:run` and `pnpm check`.

### 5. Cover the JWT-guarded API surface end to end

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

