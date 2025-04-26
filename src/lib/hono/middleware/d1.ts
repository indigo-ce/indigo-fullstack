import type {APIRouteContext} from "@/pages/api/[...path]";
import type {Context, Next} from "hono";

export const d1Middleware =
  (db: D1Database) => async (c: Context<APIRouteContext>, next: Next) => {
    c.set("db", db);
    await next();
  };
