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

  console.log("JWT MIDDLEWARE");

  if (!token) {
    return c.json({error: "Unauthorized"}, 401);
  }

  try {
    const jwks = await jwksCache.getKeys(c.get("auth"));
    const jwksSet = createLocalJWKSet(jwks);

    if (!import.meta.env.BETTER_AUTH_BASE_URL) {
      console.error("Missing BETTER_AUTH_BASE_URL environment variable");
      return c.json(
        {error: "Server misconfiguration", code: "SERVER_ERROR"},
        500
      );
    }

    const {payload} = await jwtVerify(token, jwksSet, {
      issuer: import.meta.env.BETTER_AUTH_BASE_URL,
      audience: import.meta.env.BETTER_AUTH_BASE_URL
    });

    if (!payload) {
      return c.json(
        {error: "Invalid or expired access token.", code: "JWT_EXPIRED"},
        401
      );
    }

    c.set("user", {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      emailVerified: payload.emailVerified,
      image: payload.image,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt
    } as typeof user.$inferSelect);

    await next();
  } catch (error) {
    if (error instanceof JOSEError && error.code === "ERR_JWT_EXPIRED") {
      return c.json(
        {error: "Invalid or expired access token.", code: "JWT_EXPIRED"},
        401
      );
    } else {
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
