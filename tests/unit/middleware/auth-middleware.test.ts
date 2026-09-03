import {describe, it, expect, vi, beforeEach} from "vitest";
import {Hono} from "hono";
import {authMiddleware} from "@/lib/hono/middleware/authMiddleware";
import type {APIRouteContext} from "@/pages/api/[...path]";

// Mock the auth creation function
vi.mock("@/lib/auth", () => ({
  createAuth: vi.fn().mockReturnValue({
    api: {
      signIn: vi.fn(),
      signUp: vi.fn()
    }
  })
}));

function buildApp(env: Env) {
  const app = new Hono<APIRouteContext>();
  app.use("*", authMiddleware(env));
  app.get("/", (c) =>
    c.json({authSet: c.get("auth") !== undefined}, 200)
  );
  return app;
}

describe("Auth Middleware Unit Tests", () => {
  let mockEnv: Env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      SESSION: {},
      SEND_EMAIL_FROM: "test@example.com",
      BETTER_AUTH_BASE_URL: "http://localhost:3000",
      DB: {},
      ASSETS: {},
      BETTER_AUTH_SECRET: "test-secret"
    } as unknown as Env;
  });

  it("should set auth object in context", async () => {
    const app = buildApp(mockEnv);
    const response = await app.request("/");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({authSet: true});
  });

  it("should call next middleware", async () => {
    const app = buildApp(mockEnv);
    const response = await app.request("/");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({authSet: true});
  });

  it("should handle different environment configurations", async () => {
    const testEnv = {
      NODE_ENV: "test",
      SESSION: {} as KVNamespace,
      SEND_EMAIL_FROM: "test@example.com",
      BETTER_AUTH_SECRET: "test-secret",
      BETTER_AUTH_BASE_URL: "http://localhost:3000",
      DB: {},
      ASSETS: {}
    } as unknown as Env;
    const app = buildApp(testEnv);
    const response = await app.request("/");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({authSet: true});
  });
});
