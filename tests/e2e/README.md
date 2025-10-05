# E2E Testing with Playwright

This directory contains end-to-end tests for the Indigo application using [Playwright](https://playwright.dev/).

## Directory Structure

```
tests/e2e/
├── auth/                    # Authentication-related tests
│   ├── sign-up.spec.ts      # User registration flows
│   ├── sign-in.spec.ts      # User login flows
│   └── protected-routes.spec.ts # Access control tests
├── config/                  # Test configuration and data
│   └── test-data.ts         # Centralized test constants
├── fixtures/                # Reusable test helpers
│   └── auth-helpers.ts      # Authentication helper functions
└── README.md                # This file
```

## Running Tests

### Basic Commands

```bash
# Run all e2e tests
pnpm test:e2e

# Run tests in interactive UI mode
pnpm test:e2e:ui

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Run tests in debug mode with step-by-step execution
pnpm test:e2e:debug

# View last test report
pnpm test:e2e:report

# Generate test code interactively
pnpm test:e2e:codegen
```

### Running Specific Tests

```bash
# Run tests from a specific file
pnpm test:e2e auth/sign-up.spec.ts

# Run a specific test by name
pnpm test:e2e -g "should complete full sign-up flow"

# Run tests in a specific directory
pnpm test:e2e auth/
```

## Writing Tests

### Test Organization

Tests are organized by feature in subdirectories:

- **auth/** - All authentication-related tests (sign-up, sign-in, protected routes)
- Add new feature directories as needed (e.g., **profile/**, **settings/**)

### Using Test Helpers

Import reusable helpers to reduce duplication:

```typescript
import {signUp, signIn, fillSignUpForm} from "../fixtures/auth-helpers";
import {TEST_USERS, ROUTES} from "../config/test-data";

test("should sign up a new user", async ({page}) => {
  const newUser = TEST_USERS.new();
  await signUp(page, newUser.email, newUser.password, newUser.name);

  // Assert expectations...
});
```

### Test Data Management

Use centralized test data from [config/test-data.ts](config/test-data.ts):

```typescript
import {TEST_USERS, TEST_PASSWORDS, ROUTES} from "../config/test-data";

// Generate unique user for sign-up tests
const newUser = TEST_USERS.new();

// Use existing user for sign-in tests
const existingUser = TEST_USERS.existing;

// Use predefined routes
await page.goto(ROUTES.signUp);
```

### Selector Strategy

Use `data-testid` attributes for stable, implementation-independent selectors:

```typescript
// ✅ Good - Uses data-testid
await page.getByTestId("email-input").fill(email);
await page.getByTestId("submit-button").click();

// ❌ Avoid - Coupled to implementation details
await page.fill('input[name="email"]', email);
await page.click('button.bg-blue-500');
```

When adding new UI components that need testing, add `data-testid` attributes:

```astro
<input
  type="email"
  name="email"
  data-testid="email-input"
/>
```

### Test Patterns

#### Testing Form Validation

```typescript
test("should show validation error for invalid input", async ({page}) => {
  await fillSignUpForm(page, "invalid-email", "weak", "Test User");
  await submitForm(page);

  const errorMessage = page.locator("text=/validation error/i");
  await expect(errorMessage).toBeVisible({timeout: 5000});
});
```

#### Testing Protected Routes

```typescript
test("should redirect unauthenticated users", async ({page}) => {
  await page.goto(ROUTES.dashboard);
  await page.waitForURL(/\/sign-in/);
  expect(page.url()).toContain("/sign-in");
});
```

#### Testing Authenticated Flows

For tests requiring authentication, sign in first:

```typescript
test("should access protected page after sign-in", async ({page}) => {
  await signIn(page, TEST_USERS.existing.email, TEST_USERS.existing.password);
  await page.waitForURL(/\/dashboard/);

  // Test protected functionality...
});
```

## Configuration

Configuration is in [playwright.config.ts](../../playwright.config.ts) at the project root.

Key settings:

- **Base URL**: `http://127.0.0.1:8787` (Wrangler dev server)
- **Timeout**: 180 seconds for server startup
- **Retries**: 2 retries on CI, 0 locally
- **Workers**: 1 worker on CI, unlimited locally
- **Reporter**: List + HTML on CI, HTML only locally

## Test Environment

Tests run against a local development build:

1. `pnpm preview:test` builds the app and starts Wrangler on port 8787
2. Playwright waits for the server to be ready
3. Tests execute against the running server
4. Server shuts down after tests complete (unless `reuseExistingServer` is true)

The `NODE_ENV=test` environment variable is set automatically.

## Email Verification in Tests

Tests assume email verification is required. In development:

- Emails are sent via Resend API
- Check the [Resend dashboard](https://resend.com/emails) for verification emails
- Consider mocking email sending for faster test execution
- Or use Better Auth's email verification bypass for test environments

## Debugging Tests

### UI Mode (Recommended)

```bash
pnpm test:e2e:ui
```

Interactive mode with:
- Time travel debugging
- Step-by-step execution
- Visual test selector
- Watch mode

### Debug Mode

```bash
pnpm test:e2e:debug
```

Opens Playwright Inspector for step-by-step debugging with breakpoints.

### Headed Mode

```bash
pnpm test:e2e:headed
```

See the browser while tests run (useful for visual debugging).

### Trace Viewer

Traces are automatically captured on first retry. View with:

```bash
pnpm test:e2e:report
```

## Best Practices

1. **Use descriptive test names** - Should clearly describe what is being tested
2. **Keep tests focused** - One test should verify one behavior
3. **Use helper functions** - Reduce duplication with shared utilities
4. **Use data-testid** - Stable selectors that don't break with styling changes
5. **Avoid hard waits** - Use Playwright's auto-waiting and explicit waits
6. **Clean up test data** - Each test should be independent
7. **Document complex tests** - Add comments explaining non-obvious logic

## Troubleshooting

### Server Won't Start

If tests fail with "Server did not start", check:

- Port 8787 is not already in use
- Build completes successfully (`pnpm build`)
- Wrangler is properly configured

### Tests Are Flaky

- Increase timeout for slow operations
- Use proper waits (`waitForURL`, `waitForSelector`)
- Check for race conditions
- Run in headed mode to observe behavior

### Selectors Not Found

- Verify `data-testid` attributes exist in components
- Check for typos in test IDs
- Ensure elements are visible (not hidden by CSS)
- Use Playwright Inspector to debug selectors

## CI/CD Integration

Tests are optimized for CI environments:

- Sequential execution (1 worker) for stability
- 2 automatic retries on failure
- List reporter for readable console output
- HTML report artifact for debugging failures

To run tests as they would in CI:

```bash
CI=true pnpm test:e2e
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Selectors](https://playwright.dev/docs/selectors)
- [Debugging Tests](https://playwright.dev/docs/debug)
