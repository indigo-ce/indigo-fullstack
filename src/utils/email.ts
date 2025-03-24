import {
  createTestAccount,
  createTransport,
  getTestMessageUrl,
} from "nodemailer";
import type {Transporter} from "nodemailer";
import {Resend} from "resend";
import {render, renderAsync} from "@react-email/render";

// Import React Email templates
import WelcomeEmail from "../emails/WelcomeEmail";
import CustomEmail from "../emails/CustomEmail";

type WelcomeEmailParams = {name: "welcome"; params: {name: string}};
type CustomEmailParams = {
  name: "custom";
  params: {html: string; title?: string};
};

type TemplateParams = WelcomeEmailParams | CustomEmailParams;

type SendEmailOptions = {
  /** Email address of the recipient */
  to: string;
  /** Subject line of the email */
  subject: string;
  /** Parameters to send to the template */
  template: TemplateParams;
};

export async function sendEmail(options: SendEmailOptions): Promise<any> {
  // Modern approach using Resend API
  if (import.meta.env.PROD && import.meta.env.RESEND_API_KEY) {
    return sendEmailWithResend(options);
  }

  // Check if we have a Resend API key in development
  if (import.meta.env.RESEND_API_KEY) {
    return sendEmailWithResend(options);
  }

  // Fallback to using SMTP (useful for development)
  return sendEmailWithSMTP(options);
}

async function sendEmailWithResend(options: SendEmailOptions): Promise<any> {
  const {to, subject, template} = options;

  // Render React email template to HTML
  let html: string;

  try {
    html = await renderEmailTemplate(template.name, template.params);
  } catch (error) {
    console.error("Error rendering email template for Resend:", error);

    // Emergency fallback template if all other methods fail
    if (template.name === "welcome") {
      const name =
        typeof template.params.name === "string"
          ? template.params.name
          : "friend";
      html = `<html><body><h1>Welcome to Astro Starter</h1><p>Hello ${name},</p><p>Welcome aboard!</p></body></html>`;
    } else {
      html = `<html><body><h1>Astro Starter</h1><p>You have a new message.</p></body></html>`;
    }
  }

  // Build the email message
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

    console.log("Message sent with Resend:", data.id);
    return data;
  } catch (error) {
    console.error("Error sending with Resend:", error);
    throw error;
  }
}

async function sendEmailWithSMTP(options: SendEmailOptions): Promise<any> {
  const transporter = await getEmailTransporter();

  return new Promise(async (resolve, reject) => {
    const {to, subject, template} = options;

    // Render React email template to HTML
    let html: string;

    try {
      html = await renderEmailTemplate(template.name, template.params);
    } catch (error) {
      console.error("Error rendering email template:", error);

      // Emergency fallback template if all other methods fail
      if (template.name === "welcome") {
        const name =
          typeof template.params.name === "string"
            ? template.params.name
            : "friend";
        html = `<html><body><h1>Welcome to Astro Starter</h1><p>Hello ${name},</p><p>Welcome aboard!</p></body></html>`;
      } else {
        html = `<html><body><h1>Astro Starter</h1><p>You have a new message.</p></body></html>`;
      }
    }

    // Build the email message
    const from =
      import.meta.env.SEND_EMAIL_FROM || "Astro Starter <noreply@example.com>";
    const message = {to, subject, html, from};

    // Send the email
    transporter.sendMail(message, (err, info) => {
      // Log the error if one occurred
      if (err) {
        console.error(err);
        reject(err);
        return;
      }

      // Log the message ID and preview URL if available.
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

async function renderEmailTemplate(
  name: TemplateParams["name"],
  params: TemplateParams["params"],
): Promise<string> {
  try {
    // Render the appropriate React component to HTML
    let renderedHTML: string;

    if (name === "welcome") {
      // Try with async render first, fall back to sync render if needed
      try {
        renderedHTML = await renderAsync(WelcomeEmail({name: params.name}));
      } catch (err) {
        renderedHTML = render(WelcomeEmail({name: params.name}));
      }
    } else if (name === "custom") {
      const customParams = params as CustomEmailParams["params"];

      // Make sure the HTML is properly stringified
      const htmlContent =
        typeof customParams.html === "string"
          ? customParams.html
          : String(customParams.html || "");

      // Try with async render first, fall back to sync render if needed
      try {
        renderedHTML = await renderAsync(
          CustomEmail({
            html: htmlContent,
            title: customParams.title,
          }),
        );
      } catch (err) {
        renderedHTML = render(
          CustomEmail({
            html: htmlContent,
            title: customParams.title,
          }),
        );
      }
    } else {
      throw new Error(`Unknown email template: ${name}`);
    }

    // Make sure we have a string
    if (typeof renderedHTML !== "string") {
      renderedHTML = String(renderedHTML || "");
    }

    // If rendered HTML is empty, generate a fallback
    if (!renderedHTML || renderedHTML.length === 0) {
      // Generate a simple fallback HTML template
      if (name === "welcome") {
        const userName =
          typeof params.name === "string" ? params.name : "friend";
        renderedHTML = `
          <div style="max-width: 600px; margin: 0 auto; border: 1px solid #efefef; padding: 16px; font-family: sans-serif;">
            <div style="margin-bottom: 32px;">
              <h2>Welcome to Astro Starter</h2>
            </div>
            <div style="margin-bottom: 32px; color: #222;">
              <p style="margin-bottom: 16px">Hi, ${userName},</p>
              <p style="margin-bottom: 16px">Welcome to Astro Starter!</p>
              <p>Thank you for joining us. We're excited to have you on board and look forward to helping you build amazing projects with Astro.</p>
            </div>
            <hr style="border-color: #efefef; margin: 32px 0;" />
            <div style="color: #5f5f5f;">
              <p>© 2025 Astro Starter. All rights reserved.</p>
            </div>
          </div>
        `;
      } else if (name === "custom") {
        const customParams = params as CustomEmailParams["params"];
        const htmlContent =
          typeof customParams.html === "string"
            ? customParams.html
            : String(customParams.html || "");
        const title = customParams.title || "Astro Starter";

        renderedHTML = `
          <div style="max-width: 600px; margin: 0 auto; border: 1px solid #efefef; padding: 16px; font-family: sans-serif;">
            <div style="margin-bottom: 32px;">
              <h2>${title}</h2>
            </div>
            <div style="margin-bottom: 32px; color: #222;">
              ${htmlContent}
            </div>
            <hr style="border-color: #efefef; margin: 32px 0;" />
            <div style="color: #5f5f5f;">
              <p>© 2025 Astro Starter. All rights reserved.</p>
            </div>
          </div>
        `;
      }
    }

    return renderedHTML;
  } catch (error) {
    console.error(`Error rendering email template "${name}":`, error);
    throw error;
  }
}
