import {betterAuth} from "better-auth";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {db} from "@/db";
import {actions} from "astro:actions";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({user, url, token}, request) => {
      await actions.sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetLink: url,
      });
    },
  },
});
