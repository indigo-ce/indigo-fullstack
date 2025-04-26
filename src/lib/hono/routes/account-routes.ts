import {Hono} from "hono";
import {user} from "@/db/schema";

const accountRoutes = new Hono<{
  Variables: {
    user: typeof user.$inferSelect | null;
  };
}>();

accountRoutes.get("/v1/profile", (c) => {
  const user = c.get("user");
  return c.json({
    user
  });
});

accountRoutes.get("/v1/posts", (c) => {
  return c.json({
    posts: [
      {id: 1, title: "Hello World"},
      {id: 2, title: "Good Stuff"}
    ]
  });
});

export default accountRoutes;
