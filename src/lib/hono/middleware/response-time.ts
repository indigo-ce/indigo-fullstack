import {createMiddleware} from "hono/factory";

const responseTime = createMiddleware(async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  c.res.headers.set("X-Response-Time", `${ms}ms`);
});

export default responseTime;
