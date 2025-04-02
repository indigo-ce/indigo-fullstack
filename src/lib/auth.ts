import {betterAuth} from "better-auth";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {db} from "@/db";
import {render} from "@react-email/render";
import PasswordReset from "@/components/email/PasswordReset";
import {sendEmail} from "./email";

export const auth = betterAuth({
  baseURL: import.meta.env.BETTER_AUTH_BASE_URL || "http://localhost:4321",
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
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
});
