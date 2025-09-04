import type { Context, Next } from "hono";
import type { MockedFunction } from "vitest";
import { vi } from "vitest";

// Create a mock context that can be safely cast to Context
export function createMockContext() {
  // Create individual mock functions that we can reference later
  const mockGet = vi.fn();
  const mockJson = vi.fn();
  const mockSet = vi.fn();
  const mockHeader = vi.fn();
  
  const mockContext = {
    req: {
      header: mockHeader
    },
    json: mockJson,
    get: mockGet,
    set: mockSet,
    // Add required Context properties to avoid casting errors  
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
  };
  
  return mockContext as unknown as Context;
}

// Type for mocked Next function
export type MockNext = MockedFunction<Next>;

// Basic mock environment interface that matches Env requirements
export interface MockEnv {
  NODE_ENV?: string;
  SESSION: any; // Required in Env
  SEND_EMAIL_FROM: string; // Required in Env  
  RESEND_API_KEY?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_BASE_URL: string; // Required in Env
  DB: any; // Required in Env
  ASSETS: any; // Required in Env
}