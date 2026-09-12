import {jwtVerify, createLocalJWKSet} from "jose";
import {JOSEError} from "jose/errors";
import {eq} from "drizzle-orm";
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

  let payload;
  try {
    const env = c.get("env");
    const betterAuthBaseUrl = env.BETTER_AUTH_BASE_URL;
    if (!betterAuthBaseUrl) {
      console.error("Missing BETTER_AUTH_BASE_URL environment variable");
      return c.json(
        {error: "Server misconfiguration", code: "SERVER_ERROR"},
        500
      );
    }

    const verify = async (jwks: Parameters<typeof createLocalJWKSet>[0]) => {
      const jwksSet = createLocalJWKSet(jwks);
      return jwtVerify(token, jwksSet, {
        issuer: betterAuthBaseUrl,
        audience: betterAuthBaseUrl
      });
    };

    try {
      ({payload} = await verify(await jwksCache.getKeys(c.get("auth"))));
    } catch (error) {
      if (error instanceof JOSEError && error.code === "ERR_JWT_EXPIRED") {
        throw error;
      }
      // The cached key set may predate the signing key (fresh database) or a
      // rotation. Refetch once and retry before rejecting the token.
      ({payload} = await verify(await jwksCache.getKeys(c.get("auth"), true)));
    }

    if (!payload) {
      return c.json(
        {error: "Invalid or expired access token.", code: "JWT_EXPIRED"},
        401
      );
    }

    // Validate required payload fields
    if (!payload.sub || typeof payload.sub !== "string") {
      return c.json(
        {
          error: "Invalid token payload: missing or invalid subject",
          code: "JWT_INVALID"
        },
        401
      );
    }

    if (!payload.email || typeof payload.email !== "string") {
      return c.json(
        {
          error: "Invalid token payload: missing or invalid email",
          code: "JWT_INVALID"
        },
        401
      );
    }

    // Serve the user from the database so a deleted account stops being
    // authorized the moment its row is gone and profile reads never go stale.
    const db = c.get("db");
    const row = await db.query.user.findFirst({
      where: eq(user.id, payload.sub)
    });

    if (!row) {
      return c.json(
        {
          error: "You are not authorized to access this resource",
          code: "UNAUTHORIZED"
        },
        401
      );
    }

    c.set("user", row);

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
