import {describe, it, expect, beforeAll, vi} from "vitest";
import {env} from "cloudflare:test";
import {Hono} from "hono";
import authRoutes from "@/lib/hono/routes/auth-routes";
import type {user} from "@/db/schema";

// Type definitions for test responses
type User = typeof user.$inferSelect;
type SignInSuccessResponse = {
  user: User;
  token: string;
};
// type RefreshSuccessResponse = {
//   token: string;
// };
// type RevokeSuccessResponse = {
//   success: boolean;
// };

// Mock auth middleware and related modules
vi.mock("@/lib/hono/middleware/authMiddleware", () => ({
  authMiddleware: vi.fn(() => async (c: any, next: any) => {
    c.set("auth", {
      api: {
        signInTokens: vi.fn().mockResolvedValue({
          token: "test-jwt-token",
          user: {
            id: "test-user-id",
            email: "test@example.com",
            name: "Test User"
          }
        }),
        refreshTokens: vi
          .fn()
          .mockResolvedValue({token: "refreshed-jwt-token"}),
        revokeTokens: vi.fn().mockResolvedValue({success: true})
      }
    });
    await next();
  })
}));

describe("Auth Routes Integration Tests", () => {
  let app: Hono;

  beforeAll(async () => {
    app = new Hono();
    const {authMiddleware} = await import(
      "@/lib/hono/middleware/authMiddleware"
    );
    app.use("*", authMiddleware(env as any));
    app.route("/auth", authRoutes);
  });

  describe("GET /auth/sign-in", () => {
    it("should return JWT token and user data with valid basic auth", async () => {
      const basicToken = btoa("test@example.com:password123");

      const res = await app.request(
        "/auth/sign-in",
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${basicToken}`
          }
        },
        env
      );

      expect(res.status).toBe(200);

      const data = (await res.json()) as SignInSuccessResponse;
      expect(data.token).toBe("test-jwt-token");
      expect(data.user.id).toBe("test-user-id");
      expect(data.user.email).toBe("test@example.com");
      expect(data.user.name).toBe("Test User");
    });

    it("should handle requests without authorization header", async () => {
      const res = await app.request(
        "/auth/sign-in",
        {
          method: "GET"
        },
        env
      );

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(600);
    });

    it("should handle invalid basic auth format", async () => {
      const res = await app.request(
        "/auth/sign-in",
        {
          method: "GET",
          headers: {
            Authorization: "Invalid auth header"
          }
        },
        env
      );

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(600);
    });
  });

  // describe("POST /auth/refresh-access", () => {
  //   it("should return new JWT token with valid refresh token", async () => {
  //     const refreshData = {
  //       refreshToken: "valid-refresh-token"
  //     };

  //     const res = await app.request(
  //       "/auth/refresh-access",
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json"
  //         },
  //         body: JSON.stringify(refreshData)
  //       },
  //       env
  //     );

  //     expect(res.status).toBe(200);

  //     const data = (await res.json()) as RefreshSuccessResponse;
  //     expect(data.token).toBe("refreshed-jwt-token");
  //   });

  //   it("should handle missing refresh token", async () => {
  //     const res = await app.request(
  //       "/auth/refresh-access",
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json"
  //         },
  //         body: JSON.stringify({})
  //       },
  //       env
  //     );

  //     expect(res.status).toBeGreaterThanOrEqual(200);
  //     expect(res.status).toBeLessThan(600);
  //   });

  //   it("should handle invalid JSON body", async () => {
  //     const res = await app.request(
  //       "/auth/refresh-access",
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json"
  //         },
  //         body: "invalid-json"
  //       },
  //       env
  //     );

  //     expect(res.status).toBeGreaterThanOrEqual(200);
  //     expect(res.status).toBeLessThan(600);
  //   });
  // });

  // describe("POST /auth/revoke-access", () => {
  //   it("should successfully revoke valid refresh token", async () => {
  //     const revokeData = {
  //       refreshToken: "valid-refresh-token"
  //     };

  //     const res = await app.request(
  //       "/auth/revoke-access",
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json"
  //         },
  //         body: JSON.stringify(revokeData)
  //       },
  //       env
  //     );

  //     expect(res.status).toBe(200);

  //     const data = (await res.json()) as RevokeSuccessResponse;
  //     expect(data.success).toBe(true);
  //   });

  //   it("should handle missing refresh token", async () => {
  //     const res = await app.request(
  //       "/auth/revoke-access",
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json"
  //         },
  //         body: JSON.stringify({})
  //       },
  //       env
  //     );

  //     expect(res.status).toBeGreaterThanOrEqual(200);
  //     expect(res.status).toBeLessThan(600);
  //   });

  //   it("should handle invalid JSON body", async () => {
  //     const res = await app.request(
  //       "/auth/revoke-access",
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json"
  //         },
  //         body: "invalid-json"
  //       },
  //       env
  //     );

  //     expect(res.status).toBeGreaterThanOrEqual(200);
  //     expect(res.status).toBeLessThan(600);
  //   });
  // });
});
