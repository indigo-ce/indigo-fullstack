---
name: indigo-testing
description: This skill should be used when the user asks to "write a test", "add an e2e test", "run tests", "debug a failing test", "add a test helper", "set up Playwright", "add a data-testid", "test a protected route", "test language switching", "add test data", or works with end-to-end testing in Indigo stack projects.
---

# Testing

Indigo stack projects use [Playwright](https://playwright.dev/) for end-to-end tests. Tests run against a full production build served by Wrangler — the real Cloudflare Workers runtime, not a Node.js dev server.

## Directory Structure

```
tests/e2e/
├── auth/
│   ├── sign-up.spec.ts          # Registration flows
│   ├── sign-in.spec.ts          # Login flows
│   └── protected-routes.spec.ts # Access control
├── config/
│   └── test-data.ts             # Centralized constants and routes
├── fixtures/
│   └── auth-helpers.ts          # Reusable auth helpers
└── README.md
```

## Running Tests

```bash
# Run all tests (builds first, starts Wrangler on :8787)
pnpm test:e2e

# Interactive UI with time-travel debugging
pnpm test:e2e:ui

# See browser while running
pnpm test:e2e:headed

# Step-by-step with Playwright Inspector
pnpm test:e2e:debug

# View HTML report from last run
pnpm test:e2e:report

# Generate test code interactively
pnpm test:e2e:codegen

# Target a single file
pnpm test:e2e auth/sign-up.spec.ts

# Target by test name
pnpm test:e2e -g "should complete full sign-up flow"

# Simulate CI behavior
CI=true pnpm test:e2e
```

## How the Test Server Works

`playwright.config.ts` runs `pnpm preview:test` before the suite:

```
pnpm preview:test = astro build && wrangler dev --port 8787
```

Tests hit `http://127.0.0.1:8787`. Locally, `reuseExistingServer: true` skips rebuild if the server is already up. `NODE_ENV=test` is set automatically.

CI behavior: 1 worker (sequential), 2 retries, list + HTML reporters, `forbidOnly` enforced.

## Test Data

All constants live in `tests/e2e/config/test-data.ts`. Never hardcode URLs or credentials inline.

```typescript
import {TEST_USERS, TEST_PASSWORDS, TEST_EMAILS, ROUTES} from "../config/test-data";

// Unique user per test run — timestamp prevents collision
const user = TEST_USERS.new();
// → { email: "test-<timestamp>@example.com", password: "SecureP@ssw0rd123", name: "Test User" }

// Static credentials for sign-in tests (user must exist in test DB)
const existing = TEST_USERS.existing;

// All routes include the default locale prefix
await page.goto(ROUTES.signUp); // "/en/sign-up"
```

Add new routes and fixtures to `test-data.ts` — don't scatter them across spec files.

## Auth Helpers

`tests/e2e/fixtures/auth-helpers.ts` wraps common flows. All helpers use `data-testid` selectors internally.

```typescript
import {signUp, signIn, fillSignUpForm, fillSignInForm, submitForm} from "../fixtures/auth-helpers";

// Navigate + fill + submit
await signUp(page, email, password, name);
await signIn(page, email, password);

// Fill without submitting (for validation tests)
await fillSignUpForm(page, email, password, name);
await submitForm(page);
```

## Selector Strategy

Use `data-testid` attributes — they survive CSS refactors and class renames.

```typescript
// ✅
await page.getByTestId("email-input").fill(email);
await page.getByTestId("submit-button").click();

// ❌
await page.fill('input[name="email"]', email);
await page.click('button.bg-primary');
```

Add `data-testid` to any component that tests need to target:

```astro
<input type="email" name="email" data-testid="email-input" />
<button type="submit" data-testid="submit-button">Sign In</button>
```

For third-party UI without `data-testid`, use semantic role selectors:

```typescript
await page.getByRole("option", {name: /日本語/}).click();
await page.getByRole("heading", {name: /sign in/i});
```

## Common Test Patterns

### Form validation

```typescript
test("should show error for weak password", async ({page}) => {
  await fillSignUpForm(page, email, TEST_PASSWORDS.weak, name);
  await submitForm(page);

  const error = page.locator("text=/password must be at least/i");
  await expect(error).toBeVisible({timeout: 5000});
});
```

HTML5 validation (bad email format) blocks submission client-side — assert still on same page:

```typescript
await fillSignUpForm(page, TEST_EMAILS.invalid, password, name);
await submitForm(page);
await expect(page).toHaveURL(/\/en\/sign-up/);
```

### Protected routes

```typescript
test("should redirect unauthenticated users", async ({page}) => {
  await page.goto(ROUTES.dashboard);
  await page.waitForURL(/\/en\/sign-in/);
  expect(page.url()).toContain("/sign-in");
});
```

### Authenticated flows

```typescript
test("should access protected page after sign-in", async ({page}) => {
  await signIn(page, TEST_USERS.existing.email, TEST_USERS.existing.password);
  await page.waitForURL(/\/dashboard/);
  // test protected functionality
});
```

### URL assertions

Routes are locale-prefixed. Use regex:

```typescript
await page.waitForURL(/\/en\/sign-in/);
expect(page.url()).toContain("/sign-in");

// When redirect destination may vary
await page.waitForURL(/\/en\/(verify-email|dashboard|sign-in)/);
```

### Error message assertions

Errors display at the top of forms (never inline). Use regex and a timeout:

```typescript
const error = page.locator("text=/invalid email or password/i");
await expect(error).toBeVisible({timeout: 5000});
```

### i18n / language switching

Clear cookies in `beforeEach` to reset locale state:

```typescript
test.beforeEach(async ({context}) => {
  await context.clearCookies();
});

test("should switch to Japanese", async ({page}) => {
  await page.goto("/", {waitUntil: "networkidle"});

  const selector = page.getByTestId("language-selector");
  await selector.waitFor({state: "visible"});
  await selector.click();

  await page.getByTestId("language-option-ja").click();

  await page.waitForURL(/\/ja/);
  await expect(page.getByRole("link", {name: "ログイン"})).toBeVisible();
});
```

Use `waitUntil: "networkidle"` when testing UI that renders after SSR hydration.

## Adding New Tests

1. Create a spec file in the relevant directory, or add a directory for a new feature area.
2. Add routes and user fixtures to `tests/e2e/config/test-data.ts`.
3. Add shared flows to `tests/e2e/fixtures/` if reused across multiple spec files.
4. Add `data-testid` to any new UI components that tests need to target.

## Email Verification in Tests

Sign-up tests redirect to `/verify-email` because Better Auth requires email verification. Tests assert on the redirect, not on email delivery. To test flows that need a verified account, create and verify the user in a `beforeAll` hook via the API or directly in the database.

## Debugging

| Problem | Fix |
|---|---|
| Server won't start | Check port 8787 is free; run `pnpm build` to see build errors |
| `data-testid` not found | Verify attribute in rendered HTML; use Playwright Inspector |
| Flaky tests | Replace fixed timeouts with `waitForURL` / `waitFor`; run headed to observe |
| Locale wrong | Clear cookies in `beforeEach`; check `Accept-Language` handling |
