import {Hono} from "hono";
import type {APIRouteContext} from "@/pages/api/[...path]";
import {handleAPIError} from "@/lib/hono/error-handler";
import {jwtMiddleware} from "@/lib/hono/middleware/jwtMiddleware";

const accountRoutes = new Hono<APIRouteContext>();

accountRoutes.onError(handleAPIError);
accountRoutes.use("*", jwtMiddleware);

accountRoutes.get("/profile", (c) => {
  const user = c.get("user");
  return c.json(user);
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
