import {describe, it, expect, vi, beforeEach} from "vitest";
import {Hono} from "hono";
import {JOSEError} from "jose/errors";
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

function mockDb(row: unknown) {
  return {
    query: {user: {findFirst: vi.fn().mockResolvedValue(row)}}
  } as unknown as APIRouteContext["Variables"]["db"];
}

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
      env: {BETTER_AUTH_BASE_URL: "http://localhost:3000"} as unknown as Env,
      db: mockDb({
        id: mockPayload.sub,
        name: "Stored Name",
        email: mockPayload.email,
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    });
    const response = await app.request("/", {
      headers: {Authorization: "Bearer valid-token"}
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      user: expect.objectContaining({
        id: mockPayload.sub,
        name: "Stored Name",
        email: mockPayload.email
      })
    });
  });

  it("retries verification once with a forced refresh after a non-expiry failure", async () => {
    const {jwtVerify, createLocalJWKSet} = await import("jose");

    const retryPayload = {
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
    (jwtVerify as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(
        Object.assign(new JOSEError("Unknown key"), {code: "ERR_JWS_INVALID"})
      )
      .mockResolvedValueOnce({payload: retryPayload});

    const app = buildApp({
      env: {BETTER_AUTH_BASE_URL: "http://localhost:3000"} as unknown as Env,
      db: mockDb({
        id: retryPayload.sub,
        name: retryPayload.name,
        email: retryPayload.email,
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    });
    const response = await app.request("/", {
      headers: {Authorization: "Bearer valid-token"}
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      user: expect.objectContaining({
        id: retryPayload.sub,
        email: retryPayload.email
      })
    });
    expect(jwksCache.default.getKeys).toHaveBeenCalledTimes(2);
    expect(jwksCache.default.getKeys).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      true
    );
  });

  it("returns the same unauthorized response when the retried verification also fails", async () => {
    const {jwtVerify, createLocalJWKSet} = await import("jose");

    const jwksCache = await import("@/lib/jwks-cache");
    (jwksCache.default.getKeys as ReturnType<typeof vi.fn>).mockResolvedValue(
      {}
    );
    (createLocalJWKSet as ReturnType<typeof vi.fn>).mockReturnValue({});
    (jwtVerify as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(
        Object.assign(new JOSEError("Unknown key"), {code: "ERR_JWS_INVALID"})
      )
      .mockRejectedValueOnce(
        Object.assign(new JOSEError("Still unknown"), {
          code: "ERR_JWS_INVALID"
        })
      );

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
    expect(jwksCache.default.getKeys).toHaveBeenCalledTimes(2);
  });

  it("rejects a verified token whose user row is absent", async () => {
    const {jwtVerify, createLocalJWKSet} = await import("jose");

    const jwksCache = await import("@/lib/jwks-cache");
    (jwksCache.default.getKeys as ReturnType<typeof vi.fn>).mockResolvedValue(
      {}
    );
    (createLocalJWKSet as ReturnType<typeof vi.fn>).mockReturnValue({});
    (jwtVerify as ReturnType<typeof vi.fn>).mockResolvedValue({
      payload: {sub: "deleted-user", email: "deleted@example.com"}
    });

    const app = buildApp({
      env: {BETTER_AUTH_BASE_URL: "http://localhost:3000"} as unknown as Env,
      db: mockDb(null)
    });
    const response = await app.request("/", {
      headers: {Authorization: "Bearer valid-token"}
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: "You are not authorized to access this resource",
      code: "UNAUTHORIZED"
    });
  });

  it("lets a user-lookup failure propagate instead of answering 401", async () => {
    const {jwtVerify, createLocalJWKSet} = await import("jose");

    const jwksCache = await import("@/lib/jwks-cache");
    (jwksCache.default.getKeys as ReturnType<typeof vi.fn>).mockResolvedValue(
      {}
    );
    (createLocalJWKSet as ReturnType<typeof vi.fn>).mockReturnValue({});
    (jwtVerify as ReturnType<typeof vi.fn>).mockResolvedValue({
      payload: {sub: "user-123", email: "test@example.com"}
    });

    const app = buildApp({
      env: {BETTER_AUTH_BASE_URL: "http://localhost:3000"} as unknown as Env,
      db: {
        query: {
          user: {findFirst: vi.fn().mockRejectedValue(new Error("D1 down"))}
        }
      } as unknown as APIRouteContext["Variables"]["db"]
    });
    const response = await app.request("/", {
      headers: {Authorization: "Bearer valid-token"}
    });

    // Hono's default error handler answers 500 here; in the real app the
    // shared handleAPIError renders the JSON 500. Either way it must not
    // be the middleware's 401 UNAUTHORIZED.
    expect(response.status).toBe(500);
  });
});
