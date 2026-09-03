import {describe, it, expect, vi, beforeEach} from "vitest";
import {Hono} from "hono";
import {jwtMiddleware} from "@/lib/hono/middleware/jwtMiddleware";
import type {APIRouteContext} from "@/pages/api/[...path]";

// Mock the jose library
vi.mock("jose", () => ({
  jwtVerify: vi.fn(),
  createLocalJWKSet: vi.fn(),
  JOSEError: class JOSEError extends Error {
    code: string;
    constructor(message: string, code: string = "ERR_JWT_EXPIRED") {
      super(message);
      this.code = code;
    }
  }
}));

// Mock the jwks cache
vi.mock("@/lib/jwks-cache", () => ({
  default: {
    getKeys: vi.fn()
  }
}));

type ContextFixture = {
  auth?: APIRouteContext["Variables"]["auth"];
  env?: Env;
  db?: APIRouteContext["Variables"]["db"];
};

function buildApp(fixture: ContextFixture = {}) {
  const app = new Hono<APIRouteContext>();
  app.use("*", async (c, next) => {
    c.set("auth", (fixture.auth ?? {}) as APIRouteContext["Variables"]["auth"]);
    c.set("env", (fixture.env ?? {}) as Env);
    if (fixture.db) c.set("db", fixture.db);
    await next();
  });
  app.use("*", jwtMiddleware);
  app.get("/", (c) => c.json({user: c.get("user")}, 200));
  return app;
}

describe("JWT Middleware Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should reject requests without authorization header", async () => {
    const app = buildApp();
    const response = await app.request("/");
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({error: "Unauthorized"});
  });

  it("should reject requests without Bearer token", async () => {
    const app = buildApp();
    const response = await app.request("/", {
      headers: {Authorization: "InvalidFormat"}
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({error: "Unauthorized"});
  });

  it("should handle missing BETTER_AUTH_BASE_URL", async () => {
    const jwksCache = await import("@/lib/jwks-cache");
    (jwksCache.default.getKeys as ReturnType<typeof vi.fn>).mockResolvedValue(
      {}
    );

    const app = buildApp({env: {} as Env});
    const response = await app.request("/", {
      headers: {Authorization: "Bearer valid-token"}
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "Server misconfiguration",
      code: "SERVER_ERROR"
    });
  });

  it("should handle JWT verification errors", async () => {
    const {jwtVerify, createLocalJWKSet} = await import("jose");

    const jwksCache = await import("@/lib/jwks-cache");
    (jwksCache.default.getKeys as ReturnType<typeof vi.fn>).mockResolvedValue(
      {}
    );
    (createLocalJWKSet as ReturnType<typeof vi.fn>).mockReturnValue({});

    // Create a mock JOSE error
    const mockJOSEError = new Error("Token expired");
    (mockJOSEError as unknown as {code: string}).code = "ERR_JWT_EXPIRED";
    (jwtVerify as ReturnType<typeof vi.fn>).mockRejectedValue(mockJOSEError);

    const app = buildApp({
      env: {BETTER_AUTH_BASE_URL: "http://localhost:3000"} as unknown as Env
    });
    const response = await app.request("/", {
      headers: {Authorization: "Bearer invalid-token"}
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: "You are not authorized to access this resource",
      code: "UNAUTHORIZED"
    });
  });

  it("should set user in context on successful verification", async () => {
    const {jwtVerify, createLocalJWKSet} = await import("jose");

    const mockPayload = {
      sub: "user-123",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      image: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const jwksCache = await import("@/lib/jwks-cache");
    (jwksCache.default.getKeys as ReturnType<typeof vi.fn>).mockResolvedValue(
      {}
    );
    (createLocalJWKSet as ReturnType<typeof vi.fn>).mockReturnValue({});
    (jwtVerify as ReturnType<typeof vi.fn>).mockResolvedValue({
      payload: mockPayload
    });

    const app = buildApp({
      env: {BETTER_AUTH_BASE_URL: "http://localhost:3000"} as unknown as Env
    });
    const response = await app.request("/", {
      headers: {Authorization: "Bearer valid-token"}
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      user: expect.objectContaining({
        id: mockPayload.sub,
        name: mockPayload.name,
        email: mockPayload.email
      })
    });
  });
});