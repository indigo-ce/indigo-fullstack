import {beforeEach, describe, expect, it, vi} from "vitest";
import {betterAuth} from "better-auth";
import {createAuth} from "@/lib/auth";

vi.mock("better-auth", () => ({
  betterAuth: vi.fn(() => ({}))
}));

const betterAuthMock = vi.mocked(betterAuth);
const baseURL = "https://ce.indigostack.org";

function createTestEnv(extraOrigins?: string): Env {
  return {
    BETTER_AUTH_SECRET: "test-secret",
    BETTER_AUTH_BASE_URL: baseURL,
    BETTER_AUTH_TRUSTED_ORIGINS: extraOrigins,
    DB: {} as D1Database,
    EMAIL_QUEUE: {} as Queue,
    SESSION: {} as KVNamespace,
    ASSETS: {} as Fetcher
  } as unknown as Env;
}

function getTrustedOrigins(extraOrigins?: string) {
  createAuth(createTestEnv(extraOrigins));
  return betterAuthMock.mock.calls[0][0].trustedOrigins;
}

describe("createAuth trusted origins", () => {
  beforeEach(() => {
    betterAuthMock.mockClear();
  });

  it("uses only the base URL when no extra origins are configured", () => {
    expect(getTrustedOrigins()).toEqual([baseURL]);
  });

  it("appends one configured origin", () => {
    expect(getTrustedOrigins("https://preview.example.com")).toEqual([
      baseURL,
      "https://preview.example.com"
    ]);
  });

  it("trims comma-separated origins", () => {
    expect(
      getTrustedOrigins(
        " https://preview.example.com, https://staging.example.com "
      )
    ).toEqual([
      baseURL,
      "https://preview.example.com",
      "https://staging.example.com"
    ]);
  });

  it("drops empty entries from a trailing comma", () => {
    expect(getTrustedOrigins("https://preview.example.com,")).toEqual([
      baseURL,
      "https://preview.example.com"
    ]);
  });
});
