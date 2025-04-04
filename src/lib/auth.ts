import {betterAuth} from "better-auth";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {db} from "@/db";
import {render} from "@react-email/render";
import PasswordReset from "@/components/email/PasswordReset";
import EmailVerification from "@/components/email/EmailVerification";
import {sendEmail} from "./email";

export const auth = betterAuth({
  baseURL: import.meta.env.BETTER_AUTH_BASE_URL || "http://localhost:4321",
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true to require email verification to sign in
    sendResetPassword: async ({user, url}) => {
      await sendEmail(
        user.email,
        "Reset Your Password",
        await render(
          PasswordReset({name: user.name || "friend", resetLink: url}),
        ),
      );
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({user, url}) => {
      await sendEmail(
        user.email,
        "Verify Your Email",
        await render(EmailVerification({name: user.name || "friend", url})),
      );
    },
  },
});
