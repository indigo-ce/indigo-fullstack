import {describe, it, expect, vi, beforeEach} from "vitest";
import type {Context, Next} from "hono";
import {jwtMiddleware} from "@/lib/hono/middleware/jwtMiddleware";

// Mock the jose library
vi.mock("jose", () => ({
  jwtVerify: vi.fn(),
  createLocalJWKSet: vi.fn()
}));

// Mock JWKS cache
vi.mock("@/lib/jwks-cache", () => ({
  default: {
    getKeys: vi.fn().mockResolvedValue({
      keys: [{
        kty: "RSA",
        kid: "test-key-id", 
        n: "test-n",
        e: "AQAB"
      }]
    })
  }
}));

describe("JWT Middleware", () => {
  let mockContext: Partial<Context>;
  let mockNext: Next;

  beforeEach(async () => {
    mockContext = {
      req: {
        header: vi.fn()
      },
      get: vi.fn().mockImplementation((key) => {
        if (key === "auth") return { someAuthObject: true };
        if (key === "env") return {
          BETTER_AUTH_BASE_URL: "http://localhost:3000"
        };
        return {};
      }),
      set: vi.fn(),
      json: vi.fn()
    };
    mockNext = vi.fn();
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  it("should return 401 when no token provided", async () => {
    mockContext.req!.header = vi.fn().mockReturnValue(null);
    
    await jwtMiddleware(mockContext as Context, mockNext);
    
    expect(mockContext.json).toHaveBeenCalledWith({ error: "Unauthorized" }, 401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should handle valid JWT token", async () => {
    const {jwtVerify, createLocalJWKSet} = await import("jose");
    const jwksCache = (await import("@/lib/jwks-cache")).default;
    
    mockContext.req!.header = vi.fn().mockReturnValue("Bearer valid.jwt.token");
    vi.mocked(createLocalJWKSet).mockReturnValue({});
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: {
        sub: "user-123",
        email: "test@example.com",
        name: "Test User"
      }
    });
    
    await jwtMiddleware(mockContext as Context, mockNext);
    
    expect(mockContext.set).toHaveBeenCalledWith("user", expect.any(Object));
    expect(mockNext).toHaveBeenCalled();
  });

  it("should handle invalid JWT token", async () => {
    const {jwtVerify} = await import("jose");
    
    mockContext.req!.header = vi.fn().mockReturnValue("Bearer invalid.jwt.token");
    const joseError = new Error("Invalid token");
    joseError.code = "ERR_JWT_EXPIRED";
    vi.mocked(jwtVerify).mockRejectedValue(joseError);
    
    await jwtMiddleware(mockContext as Context, mockNext);
    
    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      401
    );
    expect(mockNext).not.toHaveBeenCalled();
  });
});