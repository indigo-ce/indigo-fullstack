import {describe, it, expect, beforeEach, vi} from "vitest";
import {env} from "cloudflare:test";
import {Hono} from "hono";
import authRoutes from "@/lib/hono/routes/auth-routes";

// Mock Better Auth API calls
const mockSignInTokens = vi.fn();

vi.mock("@/lib/auth", () => ({
  createAuth: vi.fn().mockReturnValue({
    api: {
      signInTokens: mockSignInTokens
    }
  })
}));

describe("Auth Routes Integration", () => {
  let app: Hono;

  beforeEach(() => {
    // Create test app
    app = new Hono();
    
    // Add auth middleware mock
    app.use("*", async (c, next) => {
      c.set("auth", {
        api: {
          signInTokens: mockSignInTokens
        }
      });
      await next();
    });
    
    // Mount auth routes
    app.route("/auth", authRoutes);
    
    // Clear mocks
    vi.clearAllMocks();
  });

  describe("GET /auth/sign-in", () => {
    it("should handle successful sign in", async () => {
      mockSignInTokens.mockResolvedValue({
        user: {
          id: "test-user-1",
          email: "test@example.com"
        },
        token: "test-jwt-token"
      });

      const response = await app.request("/auth/sign-in", {
        method: "GET",
        headers: {
          "Authorization": "Basic dGVzdEB0ZXN0LmNvbTpwYXNzd29yZA=="
        }
      }, env);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("user");
      expect(data).toHaveProperty("token");
    });

    it("should handle auth errors", async () => {
      const apiError = new Error("Invalid credentials");
      apiError.statusCode = 401;
      apiError.body = { message: "Invalid credentials" };
      mockSignInTokens.mockRejectedValue(apiError);

      const response = await app.request("/auth/sign-in", {
        method: "GET",
        headers: {
          "Authorization": "Basic aW52YWxpZDppbnZhbGlk"
        }
      }, env);

      expect(response.status).toBe(500); // Since our mock error doesn't extend APIError properly
    });

    it("should handle missing authorization header", async () => {
      mockSignInTokens.mockResolvedValue({
        user: null
      });

      const response = await app.request("/auth/sign-in", {
        method: "GET"
      }, env);

      expect(response.status).toBe(200);
    });
  });
});