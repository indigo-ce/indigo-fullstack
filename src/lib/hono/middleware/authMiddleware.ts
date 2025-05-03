import {createAuth} from "@/lib/auth";
import type {APIRouteContext} from "@/pages/api/[...path]";
import type {Context, Next} from "hono";

export const authMiddleware =
  (env: Env) => async (c: Context<APIRouteContext>, next: Next) => {
    c.set("auth", createAuth(env));
    await next();
  };
