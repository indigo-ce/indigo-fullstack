import {authMiddleware} from "@/lib/hono/middleware/authMiddleware";
import {createAuth} from "@/lib/auth";
import {createDrizzle} from "@/db";
import {d1Middleware} from "@/lib/hono/middleware/d1Middleware";
import {Hono} from "hono";
import {user} from "@/db/schema";
import accountRoutes from "@/lib/hono/routes/account-routes";
import authRoutes from "@/lib/hono/routes/auth-routes";
import responseTimeMiddleware from "@/lib/hono/middleware/response-time";
import type {APIRoute} from "astro";

export type APIRouteContext = {
  Variables: {
    db: ReturnType<typeof createDrizzle>;
    auth: ReturnType<typeof createAuth>;
    user: typeof user.$inferSelect | null;
  };
};

export const createHonoApp = (env: Env & Env) => {
  const app = new Hono<APIRouteContext>();
  const v1 = new Hono<APIRouteContext>();

  // Apply middlewares to all v1 routes
  v1.use("*", d1Middleware(env.DB));
  v1.use("*", authMiddleware(env));
  v1.use("*", responseTimeMiddleware);

  v1.get("/health", (c) => {
    return c.json({status: "ok"});
  });

  v1.route("/auth", authRoutes);
  v1.route("/account", accountRoutes);

  v1.get("/routes", (c) => {
    return c.json(
      v1.routes
        .filter((route) => route.method !== "ALL")
        .map((route) => `${route.method} /api/v1${route.path}`)
    );
  });

  // Mount the v1 API
  app.route("/api/v1", v1);

  return app;
};

export const ALL: APIRoute = async (context) => {
  const app = createHonoApp(context.locals.runtime.env);
  return app.fetch(context.request);
};

export type App = ReturnType<typeof createHonoApp>;
