import {defineMiddleware} from "astro:middleware";
import {createAuth} from "@/lib/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.request.url.includes("/api/")) {
    return next();
  }

  const isAuthenticated = await createAuth(
    context.locals.runtime.env.DB
  ).api.getSession({
    headers: context.request.headers
  });

  if (isAuthenticated) {
    context.locals.user = isAuthenticated.user;
    context.locals.session = isAuthenticated.session;
  } else {
    context.locals.user = null;
    context.locals.session = null;
  }

  return next();
});
