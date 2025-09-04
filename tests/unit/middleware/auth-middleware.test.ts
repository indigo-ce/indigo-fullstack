import {describe, it, expect, vi, beforeEach} from "vitest";
import type {Context, Next} from "hono";
import {authMiddleware} from "@/lib/hono/middleware/authMiddleware";
import type {MockNext, MockEnv} from "tests/unit/utils/mock-types";
import {createMockContext} from "tests/unit/utils/mock-types";

// Mock the auth creation function
vi.mock("@/lib/auth", () => ({
  createAuth: vi.fn().mockReturnValue({
    api: {
      signIn: vi.fn(),
      signUp: vi.fn()
    }
  })
}));

describe("Auth Middleware Unit Tests", () => {
  let mockContext: Context;
  let mockNext: MockNext;
  let mockEnv: MockEnv;

  beforeEach(() => {
    mockContext = createMockContext();
    mockNext = vi.fn();
    mockEnv = {
      SESSION: {},
      SEND_EMAIL_FROM: "test@example.com",
      RESEND_API_KEY: "test-key",
      BETTER_AUTH_SECRET: "test-secret"
    };
  });

  it("should set auth object in context", async () => {
    const middleware = authMiddleware(mockEnv);

    await middleware(mockContext, mockNext);

    expect(mockContext.set).toHaveBeenCalledWith("auth", expect.any(Object));
    expect(mockNext).toHaveBeenCalled();
  });

  it("should call next middleware", async () => {
    const middleware = authMiddleware(mockEnv);

    await middleware(mockContext, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("should handle different environment configurations", async () => {
    const testEnv: MockEnv = {
      NODE_ENV: "test",
      SESSION: {} as KVNamespace,
      SEND_EMAIL_FROM: "test@example.com",
      RESEND_API_KEY: "test-key",
      BETTER_AUTH_SECRET: "test-secret",
      BETTER_AUTH_BASE_URL: "http://localhost:3000",
      DB: {},
      ASSETS: {}
    };

    const middleware = authMiddleware(testEnv);

    await middleware(mockContext, mockNext);

    expect(mockContext.set).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });
});
