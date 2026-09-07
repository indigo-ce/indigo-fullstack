import {describe, it, expect, vi, beforeEach} from "vitest";

vi.mock("astro:middleware", () => ({
  defineMiddleware: (fn: unknown) => fn,
  sequence: (...fns: unknown[]) => fns
}));

vi.mock("@/lib/auth", () => ({
  createAuth: vi.fn()
}));

import {createAuth} from "@/lib/auth";
import {authMiddleware, languageMiddleware} from "@/middleware";

function createAuthMockContext(cookieHeader: string | null, url?: string) {
  const headers = new Headers();
  if (cookieHeader !== null) {
    headers.set("cookie", cookieHeader);
  }

  return {
    request: {
      url: url ?? "https://example.com/en/dashboard",
      headers
    },
    locals: {
      runtime: {env: {}},
      user: undefined,
      session: undefined
    },
    cookies: {
      get: vi.fn().mockReturnValue(undefined)
    }
  };
}

function createLanguageMockContext({
  url = "https://example.com/",
  preferredLang,
  acceptLanguage
}: {
  url?: string;
  preferredLang?: string;
  acceptLanguage?: string;
} = {}) {
  const headers = new Headers();
  if (acceptLanguage !== undefined) {
    headers.set("accept-language", acceptLanguage);
  }

  return {
    request: {url, headers},
    cookies: {
      get: vi.fn().mockImplementation((name: string) => {
        if (name === "preferred_lang" && preferredLang !== undefined) {
          return {value: preferredLang};
        }
        return undefined;
      })
    },
    redirect: vi.fn().mockReturnValue("redirect-result")
  };
}

describe("Astro auth middleware", () => {
  beforeEach(() => {
    vi.mocked(createAuth).mockReset();
  });

  it("skips the session lookup when there is no Cookie header", async () => {
    const context = createAuthMockContext(null);
    const next = vi.fn().mockResolvedValue("next-result");

    await authMiddleware(context as never, next as never);

    expect(createAuth).not.toHaveBeenCalled();
    expect(context.locals.user).toBeNull();
    expect(context.locals.session).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("skips the session lookup when the Cookie header holds only unrelated cookies", async () => {
    const context = createAuthMockContext("preferred_lang=ja");
    const next = vi.fn().mockResolvedValue("next-result");

    await authMiddleware(context as never, next as never);

    expect(createAuth).not.toHaveBeenCalled();
    expect(context.locals.user).toBeNull();
    expect(context.locals.session).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("performs the session lookup when the unprefixed session cookie is present", async () => {
    const getSession = vi.fn().mockResolvedValue(null);
    vi.mocked(createAuth).mockReturnValue({
      api: {getSession}
    } as never);

    const context = createAuthMockContext("better-auth.session_token=abc123");
    const next = vi.fn().mockResolvedValue("next-result");

    await authMiddleware(context as never, next as never);

    expect(createAuth).toHaveBeenCalledTimes(1);
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(context.locals.user).toBeNull();
    expect(context.locals.session).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("performs the session lookup when the __Secure- prefixed session cookie is present", async () => {
    const getSession = vi.fn().mockResolvedValue(null);
    vi.mocked(createAuth).mockReturnValue({
      api: {getSession}
    } as never);

    const context = createAuthMockContext(
      "__Secure-better-auth.session_token=abc123"
    );
    const next = vi.fn().mockResolvedValue("next-result");

    await authMiddleware(context as never, next as never);

    expect(createAuth).toHaveBeenCalledTimes(1);
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("skips the session lookup when the cookie name only appears inside another cookie's value", async () => {
    const context = createAuthMockContext(
      "returnTo=/x?next=better-auth.session_token"
    );
    const next = vi.fn().mockResolvedValue("next-result");

    await authMiddleware(context as never, next as never);

    expect(createAuth).not.toHaveBeenCalled();
    expect(context.locals.user).toBeNull();
    expect(context.locals.session).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("skips the session lookup when the session cookie has an empty value", async () => {
    const context = createAuthMockContext("better-auth.session_token=");
    const next = vi.fn().mockResolvedValue("next-result");

    await authMiddleware(context as never, next as never);

    expect(createAuth).not.toHaveBeenCalled();
    expect(context.locals.user).toBeNull();
    expect(context.locals.session).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("performs the session lookup when the session cookie is not the first cookie in the header", async () => {
    const getSession = vi.fn().mockResolvedValue(null);
    vi.mocked(createAuth).mockReturnValue({
      api: {getSession}
    } as never);

    const context = createAuthMockContext(
      "preferred_lang=ja; __Secure-better-auth.session_token=abc"
    );
    const next = vi.fn().mockResolvedValue("next-result");

    await authMiddleware(context as never, next as never);

    expect(createAuth).toHaveBeenCalledTimes(1);
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("short-circuits API requests without touching the auth stack", async () => {
    const context = createAuthMockContext(
      "better-auth.session_token=abc123",
      "https://example.com/api/v1/health"
    );
    const next = vi.fn().mockResolvedValue("next-result");

    const result = await authMiddleware(context as never, next as never);

    expect(createAuth).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(result).toBe("next-result");
  });
});

describe("Astro language middleware", () => {
  it("short-circuits API requests without redirecting", async () => {
    const context = createLanguageMockContext({
      url: "https://example.com/api/v1/health"
    });
    const next = vi.fn().mockResolvedValue("next-result");

    const result = await languageMiddleware(context as never, next as never);

    expect(context.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(result).toBe("next-result");
  });

  it("redirects the root path to the cookie language", async () => {
    const context = createLanguageMockContext({preferredLang: "ja"});
    const next = vi.fn().mockResolvedValue("next-result");

    await languageMiddleware(context as never, next as never);

    expect(context.redirect).toHaveBeenCalledWith("/ja");
    expect(next).not.toHaveBeenCalled();
  });

  it("redirects the root path to the Accept-Language language", async () => {
    const context = createLanguageMockContext({acceptLanguage: "ja"});
    const next = vi.fn().mockResolvedValue("next-result");

    await languageMiddleware(context as never, next as never);

    expect(context.redirect).toHaveBeenCalledWith("/ja");
    expect(next).not.toHaveBeenCalled();
  });

  it("passes the root path through when the language is the default", async () => {
    const context = createLanguageMockContext({
      acceptLanguage: "en-US,en;q=0.9"
    });
    const next = vi.fn().mockResolvedValue("next-result");

    const result = await languageMiddleware(context as never, next as never);

    expect(context.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(result).toBe("next-result");
  });
});
