import {authMiddleware} from "@/lib/hono/middleware/authMiddleware";
import {createAuth} from "@/lib/auth";
import {createDrizzle} from "@/db";
import {d1Middleware} from "@/lib/hono/middleware/d1Middleware";
import {envMiddleware} from "@/lib/hono/middleware/envMiddleware";
import {handleAPIError} from "@/lib/hono/error-handler";
import {Hono} from "hono";
import {user} from "@/db/schema";
import accountRoutes from "@/lib/hono/routes/account-routes";
import authRoutes from "@/lib/hono/routes/auth-routes";
import responseTimeMiddleware from "@/lib/hono/middleware/response-time";
import type {APIRoute} from "astro";
import {env} from "cloudflare:workers";

export type APIRouteContext = {
  Variables: {
    db: ReturnType<typeof createDrizzle>;
    auth: ReturnType<typeof createAuth>;
    user: typeof user.$inferSelect | null;
    env: Env;
  };
};

export const createHonoApp = (env: Env) => {
  const app = new Hono<APIRouteContext>();
  const v1 = new Hono<APIRouteContext>();

  // Apply middlewares to all v1 routes
  v1.use("*", d1Middleware(env.DB));
  v1.use("*", authMiddleware(env));
  v1.use("*", envMiddleware(env));
  v1.use("*", responseTimeMiddleware);

  v1.get("/health", (c) => {
    return c.json({status: "ok"});
  });

  v1.route("/auth", authRoutes);
  v1.route("/account", accountRoutes);

  v1.get("/routes", (c) => {
    // Validators register as separate route records, so de-duplicate.
    const routes = new Set(
      v1.routes
        .filter((route) => route.method !== "ALL")
        .map((route) => `${route.method} /api/v1${route.path}`)
    );
    return c.json([...routes]);
  });

  // Mount the v1 API
  app.route("/api/v1", v1);

  // Backstop for failures thrown outside the per-router `onError` handlers
  // (e.g. the shared v1 middleware) and for unmatched paths.
  app.onError(handleAPIError);
  app.notFound((c) => c.json({error: "Not found"}, 404));

  return app;
};

export const ALL: APIRoute = async (_context) => {
  const app = createHonoApp(env);
  return app.fetch(_context.request);
};

export type App = ReturnType<typeof createHonoApp>;
