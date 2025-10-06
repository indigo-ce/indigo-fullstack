import {render} from "@react-email/render";
import {defineAction} from "astro:actions";
import {z} from "astro:schema";

import WelcomeEmail from "@/components/email/WelcomeEmail";
import CustomEmail from "@/components/email/CustomEmail";
import EmailVerification from "@/components/email/EmailVerification";
import {sendEmail} from "@/lib/email";

export const email = {
  sendWelcomeEmail: defineAction({
    input: z.object({
      email: z.string().email(),
      name: z.string().optional()
    }),
    handler: async ({email, name}, context) => {
      await sendEmail(
        email,
        "Welcome to Indigo Stack CE!",
        await render(WelcomeEmail({name: name || "friend"})),
        context.locals.runtime.env
      );
    }
  }),
  sendCustomEmail: defineAction({
    input: z.object({
      email: z.string().email(),
      subject: z.string(),
      html: z.string()
    }),
    handler: async ({email, subject, html}, context) => {
      await sendEmail(
        email,
        subject,
        await render(CustomEmail({html})),
        context.locals.runtime.env
      );
    }
  }),
  sendEmailVerificationEmail: defineAction({
    input: z.object({
      email: z.string().email(),
      name: z.string().optional(),
      verificationLink: z.string()
    }),
    handler: async ({email, name, verificationLink}, context) => {
      await sendEmail(
        email,
        "Verify Your Email",
        await render(
          EmailVerification({name: name || "friend", url: verificationLink})
        ),
        context.locals.runtime.env
      );
    }
  })
};
