import {describe, it, expect, vi, beforeEach} from "vitest";
import type {Context, Next} from "hono";
import {authMiddleware} from "@/lib/hono/middleware/authMiddleware";

// Mock the auth creation function
vi.mock("@/lib/auth", () => ({
  createAuth: vi.fn().mockReturnValue({
    api: {
      signInUsername: vi.fn(),
      signUpUsername: vi.fn(),
      signOut: vi.fn()
    }
  })
}));

describe("Auth Middleware", () => {
  let mockContext: Partial<Context>;
  let mockNext: Next;
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      DB: {} as D1Database,
      BETTER_AUTH_SECRET: "test-secret",
      BETTER_AUTH_BASE_URL: "http://localhost:3000"
    } as Env;
    
    mockContext = {
      set: vi.fn()
    };
    mockNext = vi.fn();
  });

  it("should create auth instance and call next", async () => {
    const middleware = authMiddleware(mockEnv);
    await middleware(mockContext as Context, mockNext);
    
    expect(mockContext.set).toHaveBeenCalledWith("auth", expect.any(Object));
    expect(mockNext).toHaveBeenCalled();
  });

  it("should handle auth creation", async () => {
    const middleware = authMiddleware(mockEnv);
    await middleware(mockContext as Context, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
  });
});