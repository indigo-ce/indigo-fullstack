import {beforeEach, describe, expect, it, vi} from "vitest";

vi.mock("@/lib/auth", () => ({
  createAuth: vi.fn(() => ({
    handler: vi.fn().mockResolvedValue(new Response("ok"))
  }))
}));

import {createAuth} from "@/lib/auth";
import {ALL} from "@/pages/api/auth/[...all]";

const createAuthMock = vi.mocked(createAuth);
type RouteContext = Parameters<typeof ALL>[0];

function buildContext({
  url = "https://example.com/api/auth/change-email",
  preferredLang,
  acceptLanguage
}: {
  url?: string;
  preferredLang?: string;
  acceptLanguage?: string;
} = {}): RouteContext {
  const headers = new Headers();
  if (acceptLanguage !== undefined) {
    headers.set("accept-language", acceptLanguage);
  }

  return {
    url: new URL(url),
    request: new Request(url, {headers}),
    cookies: {
      get: (name: string) =>
        name === "preferred_lang" && preferredLang !== undefined
          ? {value: preferredLang}
          : undefined
    }
  } as unknown as RouteContext;
}

function secondArg(): unknown {
  return createAuthMock.mock.calls[0][1];
}

describe("browser auth catch-all locale", () => {
  beforeEach(() => {
    createAuthMock.mockClear();
  });

  it("passes ja when the preferred_lang cookie is ja", async () => {
    await ALL(buildContext({preferredLang: "ja"}));

    expect(createAuthMock).toHaveBeenCalledOnce();
    expect(secondArg()).toBe("ja");
  });

  it("passes ja for an Accept-Language: ja request with no cookie", async () => {
    await ALL(buildContext({acceptLanguage: "ja"}));

    expect(createAuthMock).toHaveBeenCalledOnce();
    expect(secondArg()).toBe("ja");
  });

  it("passes en when neither cookie nor header names a locale", async () => {
    await ALL(buildContext());

    expect(createAuthMock).toHaveBeenCalledOnce();
    expect(secondArg()).toBe("en");
  });
});
