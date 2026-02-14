import {describe, it, expect} from "vitest";
import {
  getLanguageFromHeaders,
  getLocaleFromUrl,
  localizeUrl,
  getLocaleFromRequest
} from "@/i18n/utils";

describe("i18n Utilities", () => {
  describe("getLanguageFromHeaders", () => {
    it("should return locale from simple Accept-Language header", () => {
      const headers = new Headers({"Accept-Language": "ja"});
      expect(getLanguageFromHeaders(headers)).toBe("ja");
    });

    it("should extract base language from region-qualified header", () => {
      const headers = new Headers({"Accept-Language": "ja-JP"});
      expect(getLanguageFromHeaders(headers)).toBe("ja");
    });

    it("should return first supported locale from multi-value header", () => {
      const headers = new Headers({"Accept-Language": "fr, ja;q=0.9, en;q=0.8"});
      expect(getLanguageFromHeaders(headers)).toBe("ja");
    });

    it("should return en when it appears first and is supported", () => {
      const headers = new Headers({"Accept-Language": "en-US, ja;q=0.5"});
      expect(getLanguageFromHeaders(headers)).toBe("en");
    });

    it("should return null when no supported locale matches", () => {
      const headers = new Headers({"Accept-Language": "fr, de, es"});
      expect(getLanguageFromHeaders(headers)).toBeNull();
    });

    it("should return null when header is missing", () => {
      const headers = new Headers();
      expect(getLanguageFromHeaders(headers)).toBeNull();
    });
  });

  describe("getLocaleFromUrl", () => {
    it("should extract locale from URL path", () => {
      expect(getLocaleFromUrl("/ja/dashboard")).toBe("ja");
    });

    it("should return default locale for unsupported language prefix", () => {
      expect(getLocaleFromUrl("/fr/dashboard")).toBe("en");
    });

    it("should return default locale for root path", () => {
      expect(getLocaleFromUrl("/")).toBe("en");
    });

    it("should return en when en is the prefix", () => {
      expect(getLocaleFromUrl("/en/settings")).toBe("en");
    });
  });

  describe("localizeUrl", () => {
    it("should add locale prefix to a plain path", () => {
      expect(localizeUrl("/dashboard", "ja")).toBe("/ja/dashboard");
    });

    it("should replace existing locale prefix", () => {
      expect(localizeUrl("/en/dashboard", "ja")).toBe("/ja/dashboard");
    });

    it("should default to en for unsupported locale", () => {
      expect(localizeUrl("/dashboard", "fr" as any)).toBe("/en/dashboard");
    });

    it("should handle root path", () => {
      expect(localizeUrl("/", "ja")).toBe("/ja");
    });

    it("should default to en when no locale is provided", () => {
      expect(localizeUrl("/dashboard")).toBe("/en/dashboard");
    });
  });

  describe("getLocaleFromRequest", () => {
    function makeCookies(value?: string) {
      return {
        get: (name: string) =>
          name === "preferred_lang" && value ? {value} : undefined
      };
    }

    it("should prioritize cookie over everything else", () => {
      const url = new URL("https://example.com/en/dashboard");
      const headers = new Headers({"Accept-Language": "en"});
      const cookies = makeCookies("ja");

      expect(getLocaleFromRequest(url, cookies, headers)).toBe("ja");
    });

    it("should fall back to URL path when no cookie is set", () => {
      const url = new URL("https://example.com/ja/dashboard");
      const headers = new Headers({"Accept-Language": "en"});
      const cookies = makeCookies();

      expect(getLocaleFromRequest(url, cookies, headers)).toBe("ja");
    });

    it("should fall back to Accept-Language when no cookie or URL locale", () => {
      const url = new URL("https://example.com/dashboard");
      const headers = new Headers({"Accept-Language": "ja-JP"});
      const cookies = makeCookies();

      expect(getLocaleFromRequest(url, cookies, headers)).toBe("ja");
    });

    it("should return default locale when nothing matches", () => {
      const url = new URL("https://example.com/dashboard");
      const headers = new Headers();
      const cookies = makeCookies();

      expect(getLocaleFromRequest(url, cookies, headers)).toBe("en");
    });

    it("should ignore invalid cookie values", () => {
      const url = new URL("https://example.com/ja/page");
      const headers = new Headers();
      const cookies = makeCookies("fr");

      expect(getLocaleFromRequest(url, cookies, headers)).toBe("ja");
    });
  });
});
