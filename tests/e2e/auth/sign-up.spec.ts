import {test, expect} from "@playwright/test";
import {signUp, fillSignUpForm, submitForm} from "../fixtures/auth-helpers";
import {
  TEST_USERS,
  TEST_PASSWORDS,
  TEST_EMAILS,
  ROUTES
} from "../config/test-data";

/**
 * Sign Up Flow Tests
 *
 * Note: These tests assume email verification is required.
 * In development, check Resend dashboard for verification emails.
 */

test.describe("Sign Up Flow", () => {
  test("should complete full sign-up flow", async ({page}) => {
    const newUser = TEST_USERS.new();

    // Navigate to sign-up page
    await page.goto(ROUTES.signUp);

    // Wait for page to load
    await expect(page).toHaveTitle(/Sign Up|Indigo/i);

    // Sign up using helper
    await signUp(page, newUser.email, newUser.password, newUser.name);

    // Wait for redirect to verify email page or success message
    await page.waitForURL(/\/en\/(verify-email|dashboard|sign-in)/);

    // Verify we're on an expected post-signup page
    const currentUrl = page.url();
    expect(
      currentUrl.includes("/verify-email") ||
        currentUrl.includes("/dashboard") ||
        currentUrl.includes("/sign-in")
    ).toBeTruthy();
  });

  test("should show validation errors for invalid email", async ({page}) => {
    const newUser = TEST_USERS.new();

    // Fill form with invalid email
    await fillSignUpForm(
      page,
      TEST_EMAILS.invalid,
      newUser.password,
      newUser.name
    );

    // Submit the form - browser's HTML5 validation will catch this
    await submitForm(page);

    // Check that we're still on the sign-up page (form didn't submit)
    await expect(page).toHaveURL(/\/en\/sign-up/);
  });

  test("should show validation errors for weak password", async ({page}) => {
    const newUser = TEST_USERS.new();

    // Fill form with weak password
    await fillSignUpForm(
      page,
      newUser.email,
      TEST_PASSWORDS.weak,
      newUser.name
    );

    // Submit the form
    await submitForm(page);

    // Check for validation error - Better Auth returns "Password must be at least 8 characters long."
    const errorMessage = page.locator("text=/password must be at least/i");
    await expect(errorMessage).toBeVisible({timeout: 5000});
  });
});
