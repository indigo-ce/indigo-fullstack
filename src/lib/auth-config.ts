import {betterAuth} from "better-auth";
import * as schema from "@/db/schema";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {refreshAccessToken} from "@/plugins/better-auth/refresh-access";
import {jwt} from "better-auth/plugins";

// WARNING: This file is only used to generate the auth schema since getting a hold of D1 database is not possible outside of request context.
export const auth = betterAuth({
  database: drizzleAdapter(
    {},
    {
      provider: "sqlite",
      schema: schema
    }
  ),
  plugins: [refreshAccessToken(), jwt()]
});
