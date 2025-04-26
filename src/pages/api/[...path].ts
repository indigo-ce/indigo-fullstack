import {Hono} from "hono";
import type {APIRoute} from "astro";
import responseTimeMiddleware from "@/lib/hono/middleware/response-time";
import {jwtMiddleware} from "@/lib/hono/middleware/jwt";
import authRoutes from "@/lib/hono/routes/auth-routes";
import accountRoutes from "@/lib/hono/routes/account-routes";
import {d1Middleware} from "@/lib/hono/middleware/d1";
import {user} from "@/db/schema";

export type APIRouteContext = {
  Variables: {
    db: D1Database;
    user: typeof user.$inferSelect | null;
  };
};

export const createHonoApp = (db: D1Database) => {
  const app = new Hono<APIRouteContext>();
  app.use("*", d1Middleware(db));
  app.use("*", responseTimeMiddleware);
  app.use("*/account/*", jwtMiddleware);

  app.get("/health", (c) => {
    return c.json({status: "ok"});
  });

  app.route("/auth", authRoutes);
  app.route("/account", accountRoutes);

  return app;
};

export const ALL: APIRoute = async (context) => {
  const app = createHonoApp(context.locals.runtime.env.DB);
  return app.fetch(context.request);
};

export type App = ReturnType<typeof createHonoApp>;
