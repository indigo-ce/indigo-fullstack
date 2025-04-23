import {Hono} from "hono";
import type {APIRoute} from "astro";
import {auth} from "@/lib/auth";
import responseTimeMiddleware from "@/lib/hono/middleware/response-time";
import jwtMiddleware from "@/lib/hono/middleware/jwt";
import authRoutes from "@/lib/hono/routes/auth-routes";
import accountRoutes from "@/lib/hono/routes/account-routes";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
  };
}>().basePath("/api/");

app.use("*", responseTimeMiddleware);
app.use("*/account/*", jwtMiddleware);

app.get("/health", (c) => {
  return c.json({status: "ok"});
});

app.route("/auth", authRoutes);
app.route("/account", accountRoutes);

export const ALL: APIRoute = (context) => app.fetch(context.request);
export type App = typeof app;
