import {ActionError, defineAction} from "astro:actions";
import {z} from "astro:schema";
import {auth} from "@/lib/auth";

export const authentication = {
  resetPassword: defineAction({
    input: z.object({
      newPassword: z.string(),
      confirmPassword: z.string(),
      token: z.string(),
    }),
    handler: async ({newPassword, confirmPassword, token}) => {
      if (newPassword !== confirmPassword) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Passwords do not match",
        });
      }

      const {status} = await auth.api.resetPassword({
        body: {
          newPassword: newPassword,
          token,
        },
      });

      if (status) {
        return {redirect: "/sign-in"};
      } else {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Failed to reset password",
        });
      }
    },
  }),
  resendVerificationEmail: defineAction({
    input: z.object({
      email: z.string().email(),
    }),
    handler: async ({email}) => {
      await auth.api.sendVerificationEmail({
        body: {
          email,
          callbackUrl: "/dashboard",
        },
      });
    },
  }),
};
