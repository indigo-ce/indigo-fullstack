import {describe, it, expect, vi, beforeEach} from "vitest";
import type {Context, Next} from "hono";
import {jwtMiddleware} from "@/lib/hono/middleware/jwtMiddleware";

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

describe("JWT Middleware Unit Tests", () => {
  let mockContext: Partial<Context>;
  let mockNext: Next;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockContext = {
      req: {
        header: vi.fn()
      } as any,
      json: vi.fn(),
      get: vi.fn(),
      set: vi.fn()
    } as any;
    mockNext = vi.fn();
  });

  it("should reject requests without authorization header", async () => {
    (mockContext.req!.header as any).mockReturnValue(undefined);

    await jwtMiddleware(mockContext as Context, mockNext);

    expect(mockContext.json).toHaveBeenCalledWith({error: "Unauthorized"}, 401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should reject requests without Bearer token", async () => {
    (mockContext.req!.header as any).mockReturnValue("InvalidFormat");

    await jwtMiddleware(mockContext as Context, mockNext);

    expect(mockContext.json).toHaveBeenCalledWith({error: "Unauthorized"}, 401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should handle missing BETTER_AUTH_BASE_URL", async () => {
    (mockContext.req!.header as any).mockReturnValue("Bearer valid-token");
    (mockContext.get as any).mockImplementation((key: string) => {
      if (key === "auth") return {};
      if (key === "env") return {};
      return undefined;
    });

    const jwksCache = await import("@/lib/jwks-cache");
    (jwksCache.default.getKeys as any).mockResolvedValue({});

    await jwtMiddleware(mockContext as Context, mockNext);

    expect(mockContext.json).toHaveBeenCalledWith(
      {error: "Server misconfiguration", code: "SERVER_ERROR"},
      500
    );
  });

  it("should handle JWT verification errors", async () => {
    const {jwtVerify, createLocalJWKSet} = await import("jose");

    (mockContext.req!.header as any).mockReturnValue("Bearer invalid-token");
    (mockContext.get as any).mockImplementation((key: string) => {
      if (key === "auth") return {};
      if (key === "env") return {BETTER_AUTH_BASE_URL: "http://localhost:3000"};
      return undefined;
    });

    const jwksCache = await import("@/lib/jwks-cache");
    (jwksCache.default.getKeys as any).mockResolvedValue({});
    (createLocalJWKSet as any).mockReturnValue({});

    // Create a mock JOSE error
    const mockJOSEError = new Error("Token expired");
    (mockJOSEError as any).code = "ERR_JWT_EXPIRED";
    (jwtVerify as any).mockRejectedValue(mockJOSEError);

    await jwtMiddleware(mockContext as Context, mockNext);

    expect(mockContext.json).toHaveBeenCalledWith(
      {
        error: "You are not authorized to access this resource",
        code: "UNAUTHORIZED"
      },
      401
    );
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

    (mockContext.req!.header as any).mockReturnValue("Bearer valid-token");
    (mockContext.get as any).mockImplementation((key: string) => {
      if (key === "auth") return {};
      if (key === "env") return {BETTER_AUTH_BASE_URL: "http://localhost:3000"};
      return undefined;
    });

    const jwksCache = await import("@/lib/jwks-cache");
    (jwksCache.default.getKeys as any).mockResolvedValue({});
    (createLocalJWKSet as any).mockReturnValue({});
    (jwtVerify as any).mockResolvedValue({payload: mockPayload});

    await jwtMiddleware(mockContext as Context, mockNext);

    expect(mockContext.set).toHaveBeenCalledWith(
      "user",
      expect.objectContaining({
        id: mockPayload.sub,
        name: mockPayload.name,
        email: mockPayload.email
      })
    );
    expect(mockNext).toHaveBeenCalled();
  });
});
