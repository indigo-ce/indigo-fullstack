import {createAuth} from "@/lib/auth";
import {APIError} from "better-auth/api";
import {Hono} from "hono";
import type {ContentfulStatusCode} from "hono/utils/http-status";
import type {APIRouteContext} from "@/pages/api/[...path]";

const authRoutes = new Hono<APIRouteContext>();

authRoutes.get("/v1/sign-in", async (c) => {
  try {
    const auth = createAuth(c.get("db"));
    const response = await auth.api.signInTokens({
      body: {
        basicToken: c.req.header("Authorization") ?? ""
      }
    });

    return c.json(response);
  } catch (error: any) {
    if (error instanceof APIError) {
      return c.json(
        {
          error: error.body?.message
        },
        error.statusCode as ContentfulStatusCode
      );
    }

    return c.json(
      {
        error: "Internal server error"
      },
      500
    );
  }
});

export default authRoutes;
