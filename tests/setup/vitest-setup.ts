import {vi} from "vitest";

// Strategic mocking for Node.js compatibility in Workers runtime
vi.mock("better-auth", () => ({
  betterAuth: vi.fn(() => ({}))
}));

vi.mock("@react-email/render", () => ({
  render: vi.fn(() => "<html>Mock Email Content</html>")
}));

// Mock Web Crypto API for consistent test UUIDs
Object.defineProperty(globalThis, 'crypto', {
  value: {
    ...globalThis.crypto,
    randomUUID: vi.fn().mockReturnValue('test-uuid-123'),
    getRandomValues: vi.fn().mockImplementation((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: globalThis.crypto?.subtle || {}
  },
  writable: true
});