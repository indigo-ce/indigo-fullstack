import {ActionError, defineAction} from "astro:actions";
import {z} from "astro:schema";
import {createAuth} from "@/lib/auth";

export const authentication = {
  resetPassword: defineAction({
    input: z.object({
      newPassword: z.string(),
      confirmPassword: z.string(),
      token: z.string()
    }),
    handler: async ({newPassword, confirmPassword, token}, context) => {
      if (newPassword !== confirmPassword) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Passwords do not match"
        });
      }

      const {status} = await createAuth(
        context.locals.runtime.env.DB
      ).api.resetPassword({
        body: {
          newPassword: newPassword,
          token
        }
      });

      if (status) {
        return {redirect: "/sign-in"};
      } else {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Failed to reset password"
        });
      }
    }
  }),
  resendVerificationEmail: defineAction({
    input: z.object({
      email: z.string().email()
    }),
    handler: async ({email}, context) => {
      await createAuth(context.locals.runtime.env.DB).api.sendVerificationEmail(
        {
          body: {
            email,
            callbackURL: "/dashboard"
          }
        }
      );
    }
  })
};
