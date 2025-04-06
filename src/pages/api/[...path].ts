import {Hono} from "hono";
import type {APIRoute} from "astro";
import {auth} from "@/lib/auth";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
  };
}>().basePath("/api/");

app.get("/health", (c) => {
  return c.json({
    status: "ok",
  });
});

app.get("/v1/posts", (c) => {
  return c.json({
    posts: [
      {id: 1, title: "Hello World"},
      {id: 2, title: "Good Stuff"},
    ],
  });
});

export const ALL: APIRoute = (context) => app.fetch(context.request);
export type App = typeof app;
