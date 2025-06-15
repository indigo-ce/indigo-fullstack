import type {Context, Next} from "hono";
import type {APIRouteContext} from "@/pages/api/[...path]";

export const envMiddleware = (env: Env) => {
  return async (c: Context<APIRouteContext>, next: Next) => {
    c.set("env", env);
    await next();
  };
};
