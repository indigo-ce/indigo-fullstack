import {betterAuth} from "better-auth";
import {createDrizzle} from "@/db";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {jwt} from "better-auth/plugins/jwt";
import {refreshAccessToken} from "@/plugins/better-auth/refresh-access";
import {queueEmail} from "./email";

export function createAuth(env: Env, locale: string = "en") {
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is not set");
  }

  if (!env.BETTER_AUTH_BASE_URL) {
    throw new Error("BETTER_AUTH_BASE_URL is not set");
  }

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_BASE_URL,
    generateId: () => crypto.randomUUID().toUpperCase(),
    trustedOrigins: [env.BETTER_AUTH_BASE_URL],
    database: drizzleAdapter(createDrizzle(env.DB), {provider: "sqlite"}),
    user: {
      changeEmail: {
        enabled: true
      },
      deleteUser: {
        enabled: true,
        afterDelete: async (user) => {
          await queueEmail(
            user.email,
            {type: "account-deleted", props: {name: user.name || "friend"}},
            env,
            {locale}
          );
        }
      }
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Set to true to require email verification to sign in
      sendResetPassword: async ({user, url}) => {
        await queueEmail(
          user.email,
          {
            type: "password-reset",
            props: {name: user.name || "friend", resetLink: url}
          },
          env,
          {locale}
        );
      }
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({user, url}) => {
        // Replace the API endpoint with our custom verification redirect page
        const customUrl = url.replace(
          "/api/auth/verify-email",
          "/email-verification-redirect"
        );

        await queueEmail(
          user.email,
          {
            type: "email-verification",
            props: {name: user.name || "friend", url: customUrl}
          },
          env,
          {locale}
        );
      }
    },
    plugins: [refreshAccessToken(), jwt()]
  });
}
