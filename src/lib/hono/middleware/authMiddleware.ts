import {createAuth} from "@/lib/auth";
import {defaultLocale} from "@/i18n/constants";
import type {APIRouteContext} from "@/pages/api/[...path]";
import type {Context, Next} from "hono";

export const authMiddleware =
  (env: Env) => async (c: Context<APIRouteContext>, next: Next) => {
    // For API routes, default to the default locale
    c.set("auth", createAuth(env, defaultLocale));
    await next();
  };
