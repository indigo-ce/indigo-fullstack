import {createAuth} from "@/lib/auth";
import {createDrizzle} from "@/db";
import {d1Middleware} from "@/lib/hono/middleware/d1Middleware";
import {Hono} from "hono";
import {jwtMiddleware} from "@/lib/hono/middleware/jwtMiddleware";
import {user} from "@/db/schema";
import accountRoutes from "@/lib/hono/routes/account-routes";
import authRoutes from "@/lib/hono/routes/auth-routes";
import responseTimeMiddleware from "@/lib/hono/middleware/response-time";
import type {APIRoute} from "astro";
import {authMiddleware} from "@/lib/hono/middleware/authMiddleware";

export type APIRouteContext = {
  Variables: {
    db: ReturnType<typeof createDrizzle>;
    auth: ReturnType<typeof createAuth>;
    user: typeof user.$inferSelect | null;
  };
};

export const createHonoApp = (db: D1Database) => {
  const app = new Hono<APIRouteContext>();
  app.use("*", d1Middleware(db));
  app.use("*", authMiddleware(db));
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
