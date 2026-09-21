import {test, expect} from "@playwright/test";

/**
 * Typography Tests
 *
 * Verify the self-hosted Inter pipeline is wired: the `fonts` entry in
 * astro.config.mjs, the <Font> tag in Layout.astro, and the --font-sans
 * mapping in the stylesheets must all be in place for body text to resolve
 * to Astro's namespaced Inter family through Tailwind's font-sans stack.
 */

test.describe("Typography", () => {
  test("should render body text with the self-hosted Inter face", async ({
    page
  }) => {
    await page.goto("/");

    const fontFamily = await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).fontFamily);
    // Astro namespaces configured families as "<name>-<hash>", with a
    // metric-matched "<name>-<hash> fallback: <generic>" companion.
    expect(fontFamily).toContain("Inter-");
  });
});
