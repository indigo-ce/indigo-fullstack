import {betterAuth} from "better-auth";
import {createDrizzle} from "@/db";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {jwt} from "better-auth/plugins/jwt";
import {refreshAccessToken} from "@/plugins/better-auth/refresh-access";
import {render} from "@react-email/render";
import {sendEmail} from "./email";
import AccountDeleted from "@/components/email/AccountDeleted";
import ChangeEmailVerification from "@/components/email/ChangeEmailVerification";
import EmailVerification from "@/components/email/EmailVerification";
import PasswordReset from "@/components/email/PasswordReset";

export function createAuth(env: Env) {
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is not set");
  }

  if (!env.BETTER_AUTH_BASE_URL) {
    throw new Error("BETTER_AUTH_BASE_URL is not set");
  }

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_BASE_URL,
    trustedOrigins: [env.BETTER_AUTH_BASE_URL],
    database: drizzleAdapter(createDrizzle(env.DB), {provider: "sqlite"}),
    user: {
      changeEmail: {
        enabled: true,
        sendChangeEmailVerification: async ({user, newEmail, url}) => {
          await sendEmail(
            user.email,
            "Email Change Request",
            await render(
              ChangeEmailVerification({
                name: user.name || "friend",
                url,
                newEmail
              })
            ),
            env
          );
        }
      },
      deleteUser: {
        enabled: true,
        afterDelete: async (user) => {
          await sendEmail(
            user.email,
            "Account Deleted",
            await render(AccountDeleted({name: user.name || "friend"})),
            env
          );
        }
      }
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Set to true to require email verification to sign in
      sendResetPassword: async ({user, url}) => {
        await sendEmail(
          user.email,
          "Reset Your Password",
          await render(
            PasswordReset({name: user.name || "friend", resetLink: url})
          ),
          env
        );
      }
    },
    emailVerification: {
      sendOnSignUp: env.RESEND_API_KEY !== "test-key", // Only send if we have a valid API key
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({user, url}) => {
        await sendEmail(
          user.email,
          "Verify Your Email",
          await render(EmailVerification({name: user.name || "friend", url})),
          env
        );
      }
    },
    plugins: [refreshAccessToken(), jwt()]
  });
}
