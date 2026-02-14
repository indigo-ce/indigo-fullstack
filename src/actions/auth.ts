import {ActionError, defineAction} from "astro:actions";
import {z} from "astro:schema";
import {createAuth} from "@/lib/auth";
import {defaultLocale, locales} from "@/i18n/constants";

export const authentication = {
  resetPassword: defineAction({
    input: z.object({
      newPassword: z.string(),
      confirmPassword: z.string(),
      token: z.string(),
      locale: z.enum(locales).optional()
    }),
    handler: async ({newPassword, confirmPassword, token, locale}, context) => {
      if (newPassword !== confirmPassword) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Passwords do not match"
        });
      }

      const {status} = await createAuth(
        context.locals.runtime.env,
        locale ?? defaultLocale
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
      email: z.string().email(),
      locale: z.enum(locales).optional()
    }),
    handler: async ({email, locale}, context) => {
      await createAuth(context.locals.runtime.env, locale ?? defaultLocale).api.sendVerificationEmail({
        body: {
          email,
          callbackURL: "/dashboard"
        }
      });

      return {success: true};
    }
  })
};
