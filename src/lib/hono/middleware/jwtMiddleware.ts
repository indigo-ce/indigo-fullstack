import {jwtVerify, createLocalJWKSet} from "jose";
import {JOSEError} from "jose/errors";
import jwksCache from "@/lib/jwks-cache";
import {user} from "@/db/schema";
import type {APIRouteContext} from "@/pages/api/[...path]";
import type {Context, Next} from "hono";

export const jwtMiddleware = async (
  c: Context<APIRouteContext>,
  next: Next
) => {
  const token = c.req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return c.json({error: "Unauthorized"}, 401);
  }

  try {
    const jwks = await jwksCache.getKeys(c.get("auth"));
    const jwksSet = createLocalJWKSet(jwks);

    const env = c.get("env");
    const betterAuthBaseUrl = env.BETTER_AUTH_BASE_URL;
    if (!betterAuthBaseUrl) {
      console.error("Missing BETTER_AUTH_BASE_URL environment variable");
      return c.json(
        {error: "Server misconfiguration", code: "SERVER_ERROR"},
        500
      );
    }

    const {payload} = await jwtVerify(token, jwksSet, {
      issuer: betterAuthBaseUrl,
      audience: betterAuthBaseUrl
    });

    if (!payload) {
      return c.json(
        {error: "Invalid or expired access token.", code: "JWT_EXPIRED"},
        401
      );
    }

    // Validate required payload fields
    if (!payload.sub || typeof payload.sub !== 'string') {
      return c.json(
        {error: "Invalid token payload: missing or invalid subject", code: "JWT_INVALID"},
        401
      );
    }

    if (!payload.email || typeof payload.email !== 'string') {
      return c.json(
        {error: "Invalid token payload: missing or invalid email", code: "JWT_INVALID"},
        401
      );
    }

    // Create user object with proper type checking
    const userData: typeof user.$inferSelect = {
      id: payload.sub,
      name: typeof payload.name === 'string' ? payload.name : '',
      email: payload.email,
      emailVerified: typeof payload.emailVerified === 'boolean' ? payload.emailVerified : false,
      image: typeof payload.image === 'string' ? payload.image : null,
      createdAt: typeof payload.createdAt === 'string' ? new Date(payload.createdAt) : new Date(),
      updatedAt: typeof payload.updatedAt === 'string' ? new Date(payload.updatedAt) : new Date()
    };

    c.set("user", userData);

    await next();
  } catch (error) {
    if (error instanceof JOSEError && error.code === "ERR_JWT_EXPIRED") {
      return c.json(
        {error: "Invalid or expired access token.", code: "JWT_EXPIRED"},
        401
      );
    } else {
      console.error(error);
      return c.json(
        {
          error: "You are not authorized to access this resource",
          code: "UNAUTHORIZED"
        },
        401
      );
    }
  }
};
