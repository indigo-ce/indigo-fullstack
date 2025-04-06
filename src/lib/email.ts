import {
  createTestAccount,
  createTransport,
  getTestMessageUrl,
} from "nodemailer";
import type {Transporter} from "nodemailer";
import {Resend} from "resend";

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<any> {
  // Modern approach using Resend API
  if (import.meta.env.PROD && import.meta.env.RESEND_API_KEY) {
    return sendEmailWithResend(to, subject, html);
  }

  // Check if we have a Resend API key in development
  if (import.meta.env.RESEND_API_KEY) {
    return sendEmailWithResend(to, subject, html);
  }

  // Fallback to using SMTP (useful for development)
  return sendEmailWithSMTP(to, subject, html);
}

async function sendEmailWithResend(
  to: string,
  subject: string,
  html: string,
): Promise<any> {
  const from =
    import.meta.env.SEND_EMAIL_FROM || "Astro Starter <noreply@example.com>";
  const resend = new Resend(import.meta.env.RESEND_API_KEY);

  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    return data;
  } catch (error) {
    throw error;
  }
}

async function sendEmailWithSMTP(
  to: string,
  subject: string,
  html: string,
): Promise<any> {
  const transporter = await getEmailTransporter();
  const from =
    import.meta.env.SEND_EMAIL_FROM || "Astro Starter <noreply@example.com>";
  const message = {to, subject, html, from};

  return new Promise((resolve, reject) => {
    transporter.sendMail(message, (err, info) => {
      if (err) {
        console.error(err);
        reject(err);
        return;
      }

      console.log("Message sent:", info.messageId);
      const testUrl = getTestMessageUrl(info);
      if (testUrl) console.log("Preview URL:", testUrl);
      resolve(info);
    });
  });
}

async function getEmailTransporter(): Promise<Transporter> {
  return new Promise((resolve, reject) => {
    // Use SMTP configuration if available
    if (
      import.meta.env.SMTP_HOST &&
      import.meta.env.SMTP_USER &&
      import.meta.env.SMTP_PASS
    ) {
      const host = import.meta.env.SMTP_HOST;
      const port = parseInt(import.meta.env.SMTP_PORT || "587");
      const secure = import.meta.env.SMTP_SECURE === "true";

      const transporter = createTransport({
        host,
        port,
        secure,
        auth: {
          user: import.meta.env.SMTP_USER,
          pass: import.meta.env.SMTP_PASS,
        },
      });

      resolve(transporter);
      return;
    }

    // Create a test email account using ethereal.email when in development
    createTestAccount((err, account) => {
      if (err) {
        console.error("Failed to create a testing account", err);
        reject(err);
        return;
      }

      const {user, pass, smtp} = account;
      const {host, port, secure} = smtp;

      console.log(`Test email account created: ${user}`);
      const transporter = createTransport({
        host,
        port,
        secure,
        auth: {user, pass},
      });
      resolve(transporter);
    });
  });
}
