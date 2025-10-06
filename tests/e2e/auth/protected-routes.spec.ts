import {test, expect} from "@playwright/test";
import {ROUTES} from "../config/test-data";

/**
 * Protected Routes Tests
 *
 * Verify that authentication is properly enforced on protected pages.
 */

test.describe("Protected Routes", () => {
  test("should redirect to sign-in when accessing dashboard while logged out", async ({
    page
  }) => {
    // Try to access a protected route
    await page.goto(ROUTES.dashboard);

    // Should redirect to sign-in
    await page.waitForURL(/\/en\/sign-in/);
    expect(page.url()).toContain("/sign-in");
  });

  test("should redirect to sign-in when accessing account page while logged out", async ({
    page
  }) => {
    // Try to access account settings
    await page.goto(ROUTES.account);

    // Should redirect to sign-in
    await page.waitForURL(/\/en\/sign-in/);
    expect(page.url()).toContain("/sign-in");
  });
});
