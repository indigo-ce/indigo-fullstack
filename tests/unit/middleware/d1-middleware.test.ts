import {describe, it, expect, vi, beforeEach} from "vitest";
import type {Context, Next} from "hono";
import {d1Middleware} from "@/lib/hono/middleware/d1Middleware";

// Mock the database creation function
vi.mock("@/db", () => ({
  createDrizzle: vi.fn().mockReturnValue({
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  })
}));

describe("D1 Middleware", () => {
  let mockContext: Partial<Context>;
  let mockNext: Next;
  let mockDB: D1Database;

  beforeEach(() => {
    mockDB = {} as D1Database;
    mockContext = {
      set: vi.fn()
    };
    mockNext = vi.fn();
  });

  it("should create database connection and call next", async () => {
    const middleware = d1Middleware(mockDB);
    await middleware(mockContext as Context, mockNext);
    
    expect(mockContext.set).toHaveBeenCalledWith("db", expect.any(Object));
    expect(mockNext).toHaveBeenCalled();
  });

  it("should handle database creation", async () => {
    const middleware = d1Middleware(mockDB);
    await middleware(mockContext as Context, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
  });
});