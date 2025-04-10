import {Hono} from "hono";
import type {APIRoute} from "astro";
import {auth} from "@/lib/auth";
import {APIError} from "better-auth/api";
import type {ContentfulStatusCode} from "hono/utils/http-status";
import responseTimeMiddleware from "@/lib/hono/middleware/response-time";
import jwtMiddleware from "@/lib/hono/middleware/jwt";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
  };
}>().basePath("/api/");

app.use("*", responseTimeMiddleware);
app.use("*/account/*", jwtMiddleware);

app.get("/health", (c) => {
  return c.json({
    status: "ok",
  });
});

app.get("/v1/account/profile", (c) => {
  const user = c.get("user");
  return c.json({
    user,
  });
});

app.get("/v1/account/posts", (c) => {
  return c.json({
    posts: [
      {id: 1, title: "Hello World"},
      {id: 2, title: "Good Stuff"},
    ],
  });
});

app.get("/v1/sign-in", async (c) => {
  try {
    const response = await auth.api.signInTokens({
      body: {
        basicToken: c.req.header("Authorization") ?? "",
      },
    });
    return c.json(response);
  } catch (error: any) {
    if (error instanceof APIError) {
      return c.json(
        {
          error: error.body?.message,
        },
        error.statusCode as ContentfulStatusCode,
      );
    }

    return c.json(
      {
        error: "Internal server error",
      },
      500,
    );
  }
});

export const ALL: APIRoute = (context) => app.fetch(context.request);
export type App = typeof app;
