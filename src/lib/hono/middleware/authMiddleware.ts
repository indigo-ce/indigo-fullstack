import {createAuth} from "@/lib/auth";
import type {APIRouteContext} from "@/pages/api/[...path]";
import type {Context, Next} from "hono";

export const authMiddleware =
  (db: D1Database) => async (c: Context<APIRouteContext>, next: Next) => {
    c.set("auth", createAuth(db));
    await next();
  };
