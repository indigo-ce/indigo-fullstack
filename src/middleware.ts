import {defineMiddleware, sequence} from "astro:middleware";
import {createAuth} from "@/lib/auth";

const authMiddleware = defineMiddleware(async (context, next) => {
  if (context.request.url.includes("/api/")) {
    return next();
  }

  const isAuthenticated = await createAuth(
    context.locals.runtime.env
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

export const onRequest = sequence(authMiddleware);
