import {Hono} from "hono";
import {user} from "@/db/schema";
import {jwtMiddleware} from "@/lib/hono/middleware/jwtMiddleware";
const accountRoutes = new Hono<{
  Variables: {
    user: typeof user.$inferSelect | null;
  };
}>();

accountRoutes.use("*", jwtMiddleware);

accountRoutes.get("/profile", (c) => {
  const user = c.get("user");
  return c.json({
    user
  });
});

accountRoutes.get("/posts", (c) => {
  return c.json({
    posts: [
      {id: 1, title: "Hello World"},
      {id: 2, title: "Good Stuff"}
    ]
  });
});

export default accountRoutes;
