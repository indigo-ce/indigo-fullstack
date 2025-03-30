import {ActionError, defineAction} from "astro:actions";
import {z} from "astro:schema";
import {auth} from "@/lib/auth";
import {APIError} from "better-auth/api";

export const authentication = {
  sendResetPasswordEmail: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
    }),
    handler: async ({email}) => {
      try {
        await auth.api.forgetPassword({
          body: {
            email,
          },
        });

        return {success: true};
      } catch (error) {
        if (error instanceof APIError) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "Failed to send reset link.",
          });
        } else {
          console.error(error);
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "Failed to send reset link.",
          });
        }
      }
    },
  }),
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
};
