import {test, expect} from "@playwright/test";
// The attribute is load-bearing: the project's module target is ESNext, so a
// bare JSON import becomes a native ESM import that Node rejects unless it
// carries { type: "json" }.
import en from "../../src/translations/en.json" with {type: "json"};
import ja from "../../src/translations/ja.json" with {type: "json"};

/**
 * Metadata Tests
 *
 * Verify pages can contribute to the shared layout's <head> through the
 * named "head" slot in Layout.astro. Assertions run against
 * document.head.querySelector specifically: a meta description rendered
 * into <body> would pass a bare page locator but is exactly the failure
 * this mechanism exists to prevent.
 */

test.describe("Metadata", () => {
  test("should render the English meta description in the document head", async ({
    page
  }) => {
    await page.goto("/");

    const content = await page.evaluate(() =>
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute("content")
    );
    expect(content).toBe(en.home.description);
  });

  test("should render the Japanese meta description in the document head", async ({
    page
  }) => {
    await page.goto("/ja");

    const content = await page.evaluate(() =>
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute("content")
    );
    expect(content).toBe(ja.home.description);
  });
});
