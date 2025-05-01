import type {APIRoute} from "astro";
import {createAuth} from "@/lib/auth";

// Forward all /auth/* requests to the auth handler
export const ALL: APIRoute = async (context) => {
  return createAuth(context.locals.runtime.env.DB).handler(context.request);
};
