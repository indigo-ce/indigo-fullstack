import {APIError} from "better-auth/api";
import type {Context} from "hono";
import type {ContentfulStatusCode} from "hono/utils/http-status";
import type {APIRouteContext} from "@/pages/api/[...path]";

export function handleAPIError(
  error: Error,
  c: Context<APIRouteContext>
): Response {
  if (error instanceof APIError) {
    return c.json(
      {error: error.body?.message},
      error.statusCode as ContentfulStatusCode
    );
  }
  if (error instanceof SyntaxError) {
    return c.json({error: "Invalid JSON body"}, 400);
  }
  return c.json({error: "Internal server error"}, 500);
}
