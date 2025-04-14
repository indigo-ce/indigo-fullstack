import type {auth} from "@/lib/auth";
import {Hono} from "hono";

const accountRoutes = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
  };
}>();

accountRoutes.get("/v1/profile", (c) => {
  const user = c.get("user");
  return c.json({
    user,
  });
});

accountRoutes.get("/v1/posts", (c) => {
  return c.json({
    posts: [
      {id: 1, title: "Hello World"},
      {id: 2, title: "Good Stuff"},
    ],
  });
});

export default accountRoutes;
