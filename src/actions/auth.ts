import {ActionError, defineAction} from "astro:actions";
import {z} from "astro:schema";
import {createAuth} from "@/lib/auth";
import {defaultLocale, locales, type Locale} from "@/i18n/constants";

export const authentication = {
  resetPassword: defineAction({
    input: z.object({
      newPassword: z.string(),
      confirmPassword: z.string(),
      token: z.string(),
      locale: z.string().optional()
    }),
    handler: async ({newPassword, confirmPassword, token, locale}, context) => {
      if (newPassword !== confirmPassword) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Passwords do not match"
        });
      }

      const userLocale = locale && locales.includes(locale as Locale)
        ? locale
        : defaultLocale;

      const {status} = await createAuth(
        context.locals.runtime.env,
        userLocale
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
      locale: z.string().optional()
    }),
    handler: async ({email, locale}, context) => {
      const userLocale = locale && locales.includes(locale as Locale)
        ? locale
        : defaultLocale;

      await createAuth(context.locals.runtime.env, userLocale).api.sendVerificationEmail({
        body: {
          email,
          callbackURL: "/dashboard"
        }
      });

      return {success: true};
    }
  })
};
