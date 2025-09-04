import {describe, it, expect, vi, beforeEach} from "vitest";
import type {Context} from "hono";
import {jwtMiddleware} from "@/lib/hono/middleware/jwtMiddleware";
import type {MockNext} from "tests/unit/utils/mock-types";

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
  let mockContext: Context;
  let mockNext: MockNext;
  let mockGet: any;
  let mockJson: any;
  let mockSet: any;
  let mockHeader: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Create mock functions
    mockGet = vi.fn();
    mockJson = vi.fn();
    mockSet = vi.fn();
    mockHeader = vi.fn();

    // Create mock context with our functions
    mockContext = {
      req: {
        header: mockHeader
      },
      json: mockJson,
      get: mockGet,
      set: mockSet,
      // Add required Context properties
      env: {} as any,
      var: {} as any,
      executionCtx: {} as any,
      event: {} as any,
      finalized: false,
      error: undefined as any,
      status: vi.fn(),
      header: vi.fn(),
      body: vi.fn(),
      text: vi.fn(),
      html: vi.fn(),
      redirect: vi.fn(),
      cookie: vi.fn(),
      notFound: vi.fn(),
      res: {} as any,
      newResponse: vi.fn(),
      render: vi.fn()
    } as unknown as Context;

    mockNext = vi.fn();
  });

  it("should reject requests without authorization header", async () => {
    mockHeader.mockReturnValue(undefined);

    await jwtMiddleware(mockContext, mockNext);

    expect(mockJson).toHaveBeenCalledWith({error: "Unauthorized"}, 401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should reject requests without Bearer token", async () => {
    mockHeader.mockReturnValue("InvalidFormat");

    await jwtMiddleware(mockContext, mockNext);

    expect(mockJson).toHaveBeenCalledWith({error: "Unauthorized"}, 401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should handle missing BETTER_AUTH_BASE_URL", async () => {
    mockHeader.mockReturnValue("Bearer valid-token");
    mockGet.mockImplementation((key: string) => {
      if (key === "auth") return {};
      if (key === "env") return {};
      return undefined;
    });

    const jwksCache = await import("@/lib/jwks-cache");
    (jwksCache.default.getKeys as any).mockResolvedValue({});

    await jwtMiddleware(mockContext, mockNext);

    expect(mockJson).toHaveBeenCalledWith(
      {error: "Server misconfiguration", code: "SERVER_ERROR"},
      500
    );
  });

  it("should handle JWT verification errors", async () => {
    const {jwtVerify, createLocalJWKSet} = await import("jose");

    mockHeader.mockReturnValue("Bearer invalid-token");
    mockGet.mockImplementation((key: string) => {
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

    await jwtMiddleware(mockContext, mockNext);

    expect(mockJson).toHaveBeenCalledWith(
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

    mockHeader.mockReturnValue("Bearer valid-token");
    mockGet.mockImplementation((key: string) => {
      if (key === "auth") return {};
      if (key === "env") return {BETTER_AUTH_BASE_URL: "http://localhost:3000"};
      return undefined;
    });

    const jwksCache = await import("@/lib/jwks-cache");
    (jwksCache.default.getKeys as any).mockResolvedValue({});
    (createLocalJWKSet as any).mockReturnValue({});
    (jwtVerify as any).mockResolvedValue({payload: mockPayload});

    await jwtMiddleware(mockContext, mockNext);

    expect(mockSet).toHaveBeenCalledWith(
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