import {describe, it, expect, beforeAll, beforeEach, vi} from "vitest";
import {env} from "cloudflare:test";
import {Hono} from "hono";
import authRoutes from "@/lib/hono/routes/auth-routes";
import type {APIRouteContext} from "@/pages/api/[...path]";

// Track createAuth calls to verify locale parameter
const createAuthSpy = vi.fn().mockReturnValue({
  api: {
    signUpEmail: vi.fn().mockResolvedValue({id: "new-user"}),
    sendVerificationEmail: vi.fn().mockResolvedValue({status: true}),
    requestPasswordReset: vi.fn().mockResolvedValue({status: true}),
    resetPassword: vi.fn().mockResolvedValue({status: true}),
    signInTokens: vi.fn().mockResolvedValue({token: "jwt", user: {}}),
    refreshTokens: vi.fn().mockResolvedValue({token: "refreshed"}),
    revokeTokens: vi.fn().mockResolvedValue({success: true})
  }
});

vi.mock("@/lib/auth", () => ({
  createAuth: (...args: unknown[]) => createAuthSpy(...args)
}));

// Mock authMiddleware to set auth from the spy (for non-locale routes like sign-in)
vi.mock("@/lib/hono/middleware/authMiddleware", () => ({
  authMiddleware: vi.fn(() => async (c: any, next: any) => {
    c.set("auth", createAuthSpy(env, "en"));
    await next();
  })
}));

describe("Auth Routes Locale Integration Tests", () => {
  let app: Hono<APIRouteContext>;

  beforeAll(async () => {
    app = new Hono<APIRouteContext>();

    // Set up env middleware so routes can access c.get("env")
    app.use("*", async (c, next) => {
      c.set("env", env as any);
      await next();
    });

    // Set up auth middleware for non-locale routes
    const {authMiddleware} = await import(
      "@/lib/hono/middleware/authMiddleware"
    );
    app.use("*", authMiddleware(env as any));

    app.route("/auth", authRoutes);
  });

  beforeEach(() => {
    createAuthSpy.mockClear();
  });

  describe("POST /auth/sign-up", () => {
    const body = {
      email: "test@example.com",
      password: "password123",
      name: "Test User"
    };

    it("should pass Japanese locale to createAuth when Accept-Language is ja", async () => {
      await app.request("/auth/sign-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "ja"
        },
        body: JSON.stringify(body)
      });

      // The route calls createAuth directly (not the middleware one)
      // Find the call with "ja" locale
      const routeCall = createAuthSpy.mock.calls.find(
        (call: unknown[]) => call[1] === "ja"
      );
      expect(routeCall).toBeDefined();
      expect(routeCall![1]).toBe("ja");
    });

    it("should pass English locale to createAuth when Accept-Language is en-US", async () => {
      await app.request("/auth/sign-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "en-US"
        },
        body: JSON.stringify(body)
      });

      const routeCall = createAuthSpy.mock.calls.find(
        (call: unknown[]) => call[1] === "en"
      );
      expect(routeCall).toBeDefined();
      expect(routeCall![1]).toBe("en");
    });

    it("should default to en when Accept-Language is unsupported", async () => {
      await app.request("/auth/sign-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "fr-FR"
        },
        body: JSON.stringify(body)
      });

      // All createAuth calls should use "en" (default) since "fr" isn't supported
      const routeCall = createAuthSpy.mock.calls.find(
        (call: unknown[]) => call[1] !== "en"
      );
      expect(routeCall).toBeUndefined();
    });

    it("should default to en when no Accept-Language header is sent", async () => {
      await app.request("/auth/sign-up", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body)
      });

      const allLocales = createAuthSpy.mock.calls.map(
        (call: unknown[]) => call[1]
      );
      expect(allLocales).toContain("en");
      expect(allLocales).not.toContain("ja");
    });

    it("should pick first supported locale from multi-value header", async () => {
      await app.request("/auth/sign-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "fr, ja;q=0.9, en;q=0.8"
        },
        body: JSON.stringify(body)
      });

      const routeCall = createAuthSpy.mock.calls.find(
        (call: unknown[]) => call[1] === "ja"
      );
      expect(routeCall).toBeDefined();
    });
  });

  describe("POST /auth/send-verification-email", () => {
    it("should pass Japanese locale to createAuth", async () => {
      await app.request("/auth/send-verification-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "ja-JP"
        },
        body: JSON.stringify({email: "test@example.com"})
      });

      const routeCall = createAuthSpy.mock.calls.find(
        (call: unknown[]) => call[1] === "ja"
      );
      expect(routeCall).toBeDefined();
    });

    it("should default to en without Accept-Language", async () => {
      await app.request("/auth/send-verification-email", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email: "test@example.com"})
      });

      const allLocales = createAuthSpy.mock.calls.map(
        (call: unknown[]) => call[1]
      );
      expect(allLocales.every((l: string) => l === "en")).toBe(true);
    });
  });

  describe("POST /auth/forgot-password", () => {
    it("should pass Japanese locale to createAuth", async () => {
      await app.request("/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "ja"
        },
        body: JSON.stringify({email: "test@example.com"})
      });

      const routeCall = createAuthSpy.mock.calls.find(
        (call: unknown[]) => call[1] === "ja"
      );
      expect(routeCall).toBeDefined();
    });

    it("should default to en for unsupported locale", async () => {
      await app.request("/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "de-DE"
        },
        body: JSON.stringify({email: "test@example.com"})
      });

      const routeCall = createAuthSpy.mock.calls.find(
        (call: unknown[]) => call[1] !== "en"
      );
      expect(routeCall).toBeUndefined();
    });
  });

  describe("POST /auth/reset-password (non-locale route)", () => {
    it("should use middleware auth, not create locale-specific auth", async () => {
      await app.request("/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "ja"
        },
        body: JSON.stringify({newPassword: "new123", token: "reset-token"})
      });

      // reset-password uses c.get("auth") from middleware, not createAuth with locale
      // So no createAuth call should have "ja" as the locale
      const jaCall = createAuthSpy.mock.calls.find(
        (call: unknown[]) => call[1] === "ja"
      );
      expect(jaCall).toBeUndefined();
    });
  });
});
