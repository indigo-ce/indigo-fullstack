import {APIError} from "better-auth/api";
import {Hono} from "hono";
import type {ContentfulStatusCode} from "hono/utils/http-status";
import type {APIRouteContext} from "@/pages/api/[...path]";
import {createAuth} from "@/lib/auth";
import {getLanguageFromHeaders} from "@/i18n/utils";
import {defaultLocale} from "@/i18n/constants";

const authRoutes = new Hono<APIRouteContext>();

// Centralized error handling for all auth routes
authRoutes.onError((error, c) => {
  if (error instanceof APIError) {
    return c.json(
      {error: error.body?.message},
      error.statusCode as ContentfulStatusCode
    );
  }
  return c.json({error: "Internal server error"}, 500);
});

function validateBody(
  body: Record<string, unknown>,
  required: string[]
): string | null {
  const missing = required.filter((f) => !body[f]);
  return missing.length > 0
    ? `Missing required fields: ${missing.join(", ")}`
    : null;
}

// --- Mobile auth routes (locale-aware for email sending) ---

authRoutes.post("/sign-up", async (c) => {
  const body = await c.req.json();
  const error = validateBody(body, ["email", "password", "name"]);
  if (error) return c.json({error}, 400);

  const locale = getLanguageFromHeaders(c.req.raw.headers) || defaultLocale;
  const auth = createAuth(c.get("env"), locale);

  const data = await auth.api.signUpEmail({
    body: {
      email: body.email,
      password: body.password,
      name: body.name,
      callbackURL: body.callbackURL || "/dashboard"
    }
  });

  return c.json(data);
});

authRoutes.post("/send-verification-email", async (c) => {
  const body = await c.req.json();
  const error = validateBody(body, ["email"]);
  if (error) return c.json({error}, 400);

  const locale = getLanguageFromHeaders(c.req.raw.headers) || defaultLocale;
  const auth = createAuth(c.get("env"), locale);

  const data = await auth.api.sendVerificationEmail({
    body: {
      email: body.email,
      callbackURL: body.callbackURL || "/dashboard"
    }
  });

  return c.json(data);
});

authRoutes.post("/forgot-password", async (c) => {
  const body = await c.req.json();
  const error = validateBody(body, ["email"]);
  if (error) return c.json({error}, 400);

  const locale = getLanguageFromHeaders(c.req.raw.headers) || defaultLocale;
  const auth = createAuth(c.get("env"), locale);

  const data = await auth.api.requestPasswordReset({
    body: {
      email: body.email,
      redirectTo: body.redirectTo || "/reset-password"
    }
  });

  return c.json(data);
});

authRoutes.post("/reset-password", async (c) => {
  const body = await c.req.json();
  const error = validateBody(body, ["newPassword", "token"]);
  if (error) return c.json({error}, 400);

  // No locale needed — reset doesn't send emails
  const auth = c.get("auth");

  const data = await auth.api.resetPassword({
    body: {
      newPassword: body.newPassword,
      token: body.token
    }
  });

  return c.json(data);
});

// --- Token-based auth routes ---

// POST /auth/sign-in - Exchange credentials for access + refresh tokens
// Expects Authorization: Basic base64(email:password)
authRoutes.post("/sign-in", async (c) => {
  const auth = c.get("auth");

  const data = await auth.api.signInTokens({
    body: {
      basicToken: c.req.header("Authorization") ?? ""
    }
  });

  return c.json(data);
});

// POST /auth/refresh-access - Get new access token using refresh token
// Expects body: { refreshToken: string }
authRoutes.post("/refresh-access", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json();

  const data = await auth.api.refreshTokens({body});

  return c.json(data);
});

// POST /auth/revoke-access - Invalidate refresh token (logout)
// Expects body: { refreshToken: string }
authRoutes.post("/revoke-access", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json();

  const data = await auth.api.revokeTokens({body});

  return c.json(data);
});

export default authRoutes;
