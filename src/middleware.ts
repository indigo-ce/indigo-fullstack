import {defineMiddleware} from "astro:middleware";
import {auth} from "@/lib/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  const isAuthenticated = await auth.api.getSession({
    headers: context.request.headers,
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
