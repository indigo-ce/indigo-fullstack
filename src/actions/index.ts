import {ActionError, defineAction} from "astro:actions";
import {sendEmail} from "@/lib/email";
import {z} from "astro:content";
import {render} from "@react-email/render";
import {auth} from "@/lib/auth";

import WelcomeEmail from "@/components/email/WelcomeEmail";
import CustomEmail from "@/components/email/CustomEmail";
import PasswordReset from "@/components/email/PasswordReset";
import EmailVerification from "@/components/email/EmailVerification";

export const server = {
  sendWelcomeEmail: defineAction({
    input: z.object({
      email: z.string().email(),
      name: z.string().optional(),
    }),
    handler: async ({email, name}) => {
      await sendEmail(
        email,
        "Welcome to Astro Starter!",
        await render(WelcomeEmail({name: name || "friend"})),
      );
    },
  }),
  sendCustomEmail: defineAction({
    input: z.object({
      email: z.string().email(),
      subject: z.string(),
      html: z.string(),
    }),
    handler: async ({email, subject, html}) => {
      await sendEmail(email, subject, await render(CustomEmail({html})));
    },
  }),
  sendPasswordResetEmail: defineAction({
    input: z.object({
      email: z.string().email(),
      name: z.string().optional(),
      resetLink: z.string(),
    }),
    handler: async ({email, name, resetLink}) => {
      await sendEmail(
        email,
        "Reset Your Password",
        await render(PasswordReset({name: name || "friend", resetLink})),
      );
    },
  }),
  sendEmailVerificationEmail: defineAction({
    input: z.object({
      email: z.string().email(),
      name: z.string().optional(),
      verificationLink: z.string(),
    }),
    handler: async ({email, name, verificationLink}) => {
      await sendEmail(
        email,
        "Verify Your Email",
        await render(
          EmailVerification({name: name || "friend", verificationLink}),
        ),
      );
    },
  }),
  forgotPassword: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
    }),
    handler: async ({email}) => {
      await auth.api.forgetPassword({
        body: {
          email,
          redirectTo: "/forgot-password?sent=true",
        },
      });
    },
  }),
  resetPassword: defineAction({
    accept: "form",
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

      await auth.api.resetPassword({
        body: {
          newPassword: newPassword,
          token,
        },
      });
    },
  }),
};
