import {betterAuth} from "better-auth";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {db} from "@/db";
import {render} from "@react-email/render";
import PasswordReset from "@/components/email/PasswordReset";
import EmailVerification from "@/components/email/EmailVerification";
import {sendEmail} from "./email";
import AccountDeleted from "@/components/email/AccountDeleted";

export const auth = betterAuth({
  baseURL: import.meta.env.BETTER_AUTH_BASE_URL || "http://localhost:4321",
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  user: {
    deleteUser: {
      enabled: true,
      afterDelete: async (user) => {
        await sendEmail(
          user.email,
          "Account Deleted",
          await render(AccountDeleted({name: user.name || "friend"})),
        );
      },
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
