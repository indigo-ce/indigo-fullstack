import {test, expect} from "@playwright/test";
import {fillSignInForm, submitForm} from "../fixtures/auth-helpers";
import {
  TEST_USERS,
  TEST_PASSWORDS,
  TEST_EMAILS,
  ROUTES
} from "../config/test-data";

/**
 * Sign In Flow Tests
 */

test.describe("Sign In Flow", () => {
  test("should show error for invalid credentials", async ({page}) => {
    await page.goto(ROUTES.signIn);

    await fillSignInForm(page, TEST_USERS.existing.email, TEST_PASSWORDS.wrong);
    await submitForm(page);

    // Should show error message - "Invalid email or password. Please try again."
    const errorMessage = page.locator(
      "text=/invalid email or password|please try again/i"
    );
    await expect(errorMessage).toBeVisible({timeout: 5000});
  });

  test("should show error for non-existent email", async ({page}) => {
    await page.goto(ROUTES.signIn);

    await fillSignInForm(page, TEST_EMAILS.nonexistent, TEST_PASSWORDS.valid);
    await submitForm(page);

    // Better Auth returns same message for non-existent users (security best practice)
    const errorMessage = page.locator(
      "text=/invalid email or password|please try again/i"
    );
    await expect(errorMessage).toBeVisible({timeout: 5000});
  });
});
