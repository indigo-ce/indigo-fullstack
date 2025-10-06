import {test, expect} from "@playwright/test";

/**
 * Language Switching Tests
 *
 * Verify that language selection works correctly and persists across navigation.
 */

test.describe("Language Switching", () => {
  // Clear cookies before each test to ensure clean state
  test.beforeEach(async ({context}) => {
    await context.clearCookies();
  });

  test("should switch from English to Japanese", async ({page}) => {
    // Start on English homepage and wait for page to fully load
    await page.goto("/", {waitUntil: "networkidle"});

    // Find language selector by role and text content (works with SSR)
    const languageSelector = page.locator('footer button[role="combobox"]').filter({hasText: "English"});
    await languageSelector.waitFor({state: "visible"});

    // Open language selector
    await languageSelector.click();

    // Wait for dropdown to appear and click Japanese option
    // The dropdown options appear dynamically after click
    await page.getByRole("option", {name: /日本語/}).click();

    // Verify URL changed to Japanese locale
    await page.waitForURL(/\/ja/);

    // Verify Japanese content is visible
    await expect(page.getByRole("link", {name: "ログイン"})).toBeVisible();
  });

  test("should persist language preference on navigation", async ({page}) => {
    // Switch to Japanese
    await page.goto("/", {waitUntil: "networkidle"});

    const languageSelector = page.locator('footer button[role="combobox"]').filter({hasText: "English"});
    await languageSelector.waitFor({state: "visible"});

    await languageSelector.click();
    await page.getByRole("option", {name: /日本語/}).click();
    await page.waitForURL(/\/ja/);

    // Navigate to another page
    await page.getByRole("link", {name: "ログイン"}).click();

    // Verify we're still on Japanese locale
    expect(page.url()).toContain("/ja/");
    await expect(
      page.getByRole("heading", {name: /ログイン|サインイン/i})
    ).toBeVisible();
  });

  test("should switch from Japanese to English", async ({page}) => {
    // Start on Japanese homepage
    await page.goto("/ja", {waitUntil: "networkidle"});

    const languageSelector = page.locator('footer button[role="combobox"]').filter({hasText: "日本語"});
    await languageSelector.waitFor({state: "visible"});

    // Open language selector and switch to English
    await languageSelector.click();
    await page.getByRole("option", {name: /English/}).click();

    // Verify URL changed to English locale
    await page.waitForURL(/\/en/);

    // Verify English content is visible
    await expect(page.getByRole("link", {name: "Sign In"})).toBeVisible();
  });
});
