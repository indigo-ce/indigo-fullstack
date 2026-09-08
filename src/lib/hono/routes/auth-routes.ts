import {APIError} from "better-auth/api";
import {Hono, type Env as HonoEnv, type MiddlewareHandler} from "hono";
import {zValidator, type Hook} from "@hono/zod-validator";
import {z} from "zod";
import type {APIRouteContext} from "@/pages/api/[...path]";
import {handleAPIError} from "@/lib/hono/error-handler";
import {createAuth} from "@/lib/auth";
import {getLanguageFromHeaders} from "@/i18n/utils";
import {defaultLocale} from "@/i18n/constants";

const authRoutes = new Hono<APIRouteContext>();

// Centralized error handling for all auth routes
authRoutes.onError(handleAPIError);

type ValidationResult<T extends z.ZodType> = Parameters<
  Hook<z.infer<T>, HonoEnv, string, "json", {}, T>
>[0];

const validationHook = <T extends z.ZodType>(
  result: ValidationResult<T>
): void => {
  if (result.success || !result.error) return;

  const missingFields = result.error.issues
    .filter(
      (issue) =>
        issue.code === "invalid_type" &&
        issue.message.endsWith("received undefined")
    )
    .map((issue) => issue.path.join("."))
    .filter(Boolean);
  const issueMessages = result.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  const message =
    missingFields.length > 0
      ? `Missing required fields: ${missingFields.join(", ")}`
      : issueMessages.every((issue) => issue.endsWith("Missing refresh token"))
        ? "Missing refresh token"
        : issueMessages.join(", ");

  throw new APIError("BAD_REQUEST", {message});
};

type JsonValidationInput<T extends z.ZodType> = {
  in: {json: z.input<T>};
  out: {json: z.output<T>};
};

const validateJson = <T extends z.ZodType>(
  schema: T
): MiddlewareHandler<APIRouteContext, string, JsonValidationInput<T>> =>
  zValidator("json", schema, (result) =>
    validationHook<T>(result)
  ) as MiddlewareHandler<APIRouteContext, string, JsonValidationInput<T>>;

// Rejects empty and malformed JSON bodies before the validators see them,
// preserving the pinned `Invalid JSON body` contract. Attached per route
// rather than globally because POST /sign-in reads an Authorization header
// and legitimately carries no body.
const rejectMalformedJSON: MiddlewareHandler<APIRouteContext> = async (
  c,
  next
) => {
  try {
    await c.req.raw.clone().json();
  } catch {
    throw new APIError("BAD_REQUEST", {message: "Invalid JSON body"});
  }

  await next();
};

const signUpSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  name: z.string().min(1),
  callbackURL: z.string().optional()
});

const verificationEmailSchema = z.object({
  email: z.email(),
  callbackURL: z.string().optional()
});

const forgotPasswordSchema = z.object({
  email: z.email(),
  redirectTo: z.string().optional()
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(1),
  token: z.string().min(1)
});

const refreshTokenSchema = z.object({
  refreshToken: z
    .string({error: "Missing refresh token"})
    .min(1, {error: "Missing refresh token"})
});

// --- Mobile auth routes (locale-aware for email sending) ---

authRoutes.post(
  "/sign-up",
  rejectMalformedJSON,
  validateJson(signUpSchema),
  async (c) => {
    const body = c.req.valid("json");

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
  }
);

authRoutes.post(
  "/send-verification-email",
  rejectMalformedJSON,
  validateJson(verificationEmailSchema),
  async (c) => {
    const body = c.req.valid("json");

    const locale = getLanguageFromHeaders(c.req.raw.headers) || defaultLocale;
    const auth = createAuth(c.get("env"), locale);

    const data = await auth.api.sendVerificationEmail({
      body: {
        email: body.email,
        callbackURL: body.callbackURL || "/dashboard"
      }
    });

    return c.json(data);
  }
);

authRoutes.post(
  "/forgot-password",
  rejectMalformedJSON,
  validateJson(forgotPasswordSchema),
  async (c) => {
    const body = c.req.valid("json");

    const locale = getLanguageFromHeaders(c.req.raw.headers) || defaultLocale;
    const auth = createAuth(c.get("env"), locale);

    const data = await auth.api.requestPasswordReset({
      body: {
        email: body.email,
        redirectTo: body.redirectTo || "/reset-password"
      }
    });

    return c.json(data);
  }
);

authRoutes.post(
  "/reset-password",
  rejectMalformedJSON,
  validateJson(resetPasswordSchema),
  async (c) => {
    const body = c.req.valid("json");

    // No locale needed — reset doesn't send emails
    const auth = c.get("auth");

    const data = await auth.api.resetPassword({
      body: {
        newPassword: body.newPassword,
        token: body.token
      }
    });

    return c.json(data);
  }
);

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
authRoutes.post(
  "/refresh-access",
  rejectMalformedJSON,
  validateJson(refreshTokenSchema),
  async (c) => {
    const auth = c.get("auth");
    const body = c.req.valid("json");

    const data = await auth.api.refreshTokens({body});

    return c.json(data);
  }
);

// POST /auth/revoke-access - Invalidate refresh token (logout)
// Expects body: { refreshToken: string }
authRoutes.post(
  "/revoke-access",
  rejectMalformedJSON,
  validateJson(refreshTokenSchema),
  async (c) => {
    const auth = c.get("auth");
    const body = c.req.valid("json");

    const data = await auth.api.revokeTokens({body});

    return c.json(data);
  }
);

export default authRoutes;
