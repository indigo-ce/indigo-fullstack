import { createTestAccount, createTransport, getTestMessageUrl } from "nodemailer";
import type { Transporter } from "nodemailer";
import { Resend } from "resend";
import { render, renderAsync } from "@react-email/render";

// Import React Email templates
import WelcomeEmail from "../emails/WelcomeEmail";
import CustomEmail from "../emails/CustomEmail";

type WelcomeEmailParams = { name: "welcome"; params: { name: string } };
type CustomEmailParams = { name: "custom"; params: { html: string; title?: string } };

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
  console.log("📧 sendEmail called with options:", {
    to: options.to,
    subject: options.subject,
    template: options.template.name,
  });
  
  // Modern approach using Resend API
  if (import.meta.env.PROD && import.meta.env.RESEND_API_KEY) {
    console.log("Using Resend API for email delivery (production mode)");
    return sendEmailWithResend(options);
  }

  // Check if we have a Resend API key in development
  if (import.meta.env.RESEND_API_KEY) {
    console.log("Using Resend API for email delivery (development with API key)");
    return sendEmailWithResend(options);
  }

  // Fallback to using SMTP (useful for development)
  console.log("Using SMTP/Ethereal for email delivery (development fallback)");
  return sendEmailWithSMTP(options);
}

async function sendEmailWithResend(options: SendEmailOptions): Promise<any> {
  console.log("Attempting to send email via Resend:", options);
  const { to, subject, template } = options;
  
  // Render React email template to HTML
  let html: string;
  
  try {
    html = await renderEmailTemplate(template.name, template.params);
    console.log(`Email template rendered, HTML length: ${html.length} bytes`);
  } catch (error) {
    console.error("❌ Error rendering email template for Resend, using emergency fallback:", error);
    
    // Emergency fallback template if all other methods fail
    if (template.name === "welcome") {
      const name = typeof template.params.name === 'string' ? template.params.name : 'friend';
      html = `<html><body><h1>Welcome to Astro Starter</h1><p>Hello ${name},</p><p>Welcome aboard!</p></body></html>`;
    } else {
      html = `<html><body><h1>Astro Starter</h1><p>You have a new message.</p></body></html>`;
    }
  }
  
  // Build the email message
  const from = import.meta.env.SEND_EMAIL_FROM || "Astro Starter <noreply@example.com>";
  console.log(`Using from address: ${from}`);
  
  const resend = new Resend(import.meta.env.RESEND_API_KEY);
  console.log("Resend instance created, attempting to send email...");
  
  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    
    console.log("✅ Message sent successfully with Resend:", data.id);
    return data;
  } catch (error) {
    console.error("❌ Error sending with Resend:", error);
    throw error;
  }
}

async function sendEmailWithSMTP(options: SendEmailOptions): Promise<any> {
  console.log("Attempting to send email via SMTP:", options);
  
  console.log("Getting email transporter...");
  const transporter = await getEmailTransporter();
  console.log("Email transporter created successfully");
  
  return new Promise(async (resolve, reject) => {
    const { to, subject, template } = options;
    
    // Render React email template to HTML
    console.log("Rendering email template for SMTP...");
    let html: string;
    
    try {
      html = await renderEmailTemplate(template.name, template.params);
      console.log(`SMTP: Email template rendered, HTML length: ${html.length} bytes`);
    } catch (error) {
      console.error("❌ Error rendering email template, using emergency fallback:", error);
      
      // Emergency fallback template if all other methods fail
      if (template.name === "welcome") {
        const name = typeof template.params.name === 'string' ? template.params.name : 'friend';
        html = `<html><body><h1>Welcome to Astro Starter</h1><p>Hello ${name},</p><p>Welcome aboard!</p></body></html>`;
      } else {
        html = `<html><body><h1>Astro Starter</h1><p>You have a new message.</p></body></html>`;
      }
    }
    
    // Build the email message
    const from = import.meta.env.SEND_EMAIL_FROM || "Astro Starter <noreply@example.com>";
    console.log(`SMTP: Using from address: ${from}`);
    
    const message = { to, subject, html, from };
    console.log("SMTP: Email message prepared, attempting to send...");
    
    // Send the email
    transporter.sendMail(message, (err, info) => {
      // Log the error if one occurred
      if (err) {
        console.error("❌ SMTP Error:", err);
        reject(err);
        return;
      }
      
      // Log the message ID and preview URL if available.
      console.log("✅ SMTP: Message sent successfully:", info.messageId);
      const testUrl = getTestMessageUrl(info);
      if (testUrl) console.log("🔍 SMTP: Preview URL (you can see the email here):", testUrl);
      resolve(info);
    });
  });
}

async function getEmailTransporter(): Promise<Transporter> {
  return new Promise((resolve, reject) => {
    // Use SMTP configuration if available
    if (import.meta.env.SMTP_HOST && import.meta.env.SMTP_USER && import.meta.env.SMTP_PASS) {
      console.log("Using configured SMTP server for email delivery");
      const host = import.meta.env.SMTP_HOST;
      const port = parseInt(import.meta.env.SMTP_PORT || "587");
      const secure = import.meta.env.SMTP_SECURE === "true";
      
      console.log(`SMTP Config - Host: ${host}, Port: ${port}, Secure: ${secure}`);
      
      const transporter = createTransport({
        host,
        port,
        secure,
        auth: {
          user: import.meta.env.SMTP_USER,
          pass: import.meta.env.SMTP_PASS,
        },
      });
      
      console.log("SMTP transporter created with configured credentials");
      resolve(transporter);
      return;
    }

    console.log("No SMTP configuration found, creating Ethereal test account...");
    
    // Create a test email account using ethereal.email when in development
    createTestAccount((err, account) => {
      if (err) {
        console.error("❌ Failed to create Ethereal testing account", err);
        reject(err);
        return;
      }
      
      const { user, pass, smtp } = account;
      const { host, port, secure } = smtp;
      
      console.log(`Ethereal test account created - Email: ${user}`);
      console.log(`Ethereal SMTP - Host: ${host}, Port: ${port}, Secure: ${secure}`);
      
      const transporter = createTransport({ host, port, secure, auth: { user, pass } });
      console.log("Ethereal email transporter created successfully");
      
      resolve(transporter);
    });
  });
}

async function renderEmailTemplate(name: TemplateParams["name"], params: TemplateParams["params"]): Promise<string> {
  try {
    console.log(`Rendering email template: ${name}`, params);
    
    // Render the appropriate React component to HTML
    let renderedHTML: string;
    
    if (name === "welcome") {
      console.log("Rendering welcome email template");
      // Try with async render first, fall back to sync render if needed
      try {
        renderedHTML = await renderAsync(WelcomeEmail({ name: params.name }));
      } catch (err) {
        console.warn("Async rendering failed, trying sync rendering:", err);
        renderedHTML = render(WelcomeEmail({ name: params.name }));
      }
      console.log("Welcome email render type:", typeof renderedHTML);
      console.log("Welcome email rendered successfully");
    } else if (name === "custom") {
      console.log("Rendering custom email template");
      const customParams = params as CustomEmailParams["params"];
      
      // Make sure the HTML is properly stringified
      const htmlContent = typeof customParams.html === 'string' 
        ? customParams.html 
        : String(customParams.html || '');
      
      console.log("HTML content type:", typeof htmlContent);
      console.log("HTML content sample:", htmlContent.substring(0, 50));
      
      // Try with async render first, fall back to sync render if needed
      try {
        renderedHTML = await renderAsync(CustomEmail({ 
          html: htmlContent,
          title: customParams.title 
        }));
      } catch (err) {
        console.warn("Async rendering failed, trying sync rendering:", err);
        renderedHTML = render(CustomEmail({ 
          html: htmlContent,
          title: customParams.title 
        }));
      }
      console.log("Custom email render type:", typeof renderedHTML);
      console.log("Custom email rendered successfully");
    } else {
      throw new Error(`Unknown email template: ${name}`);
    }
    
    // Make sure we have a string
    if (typeof renderedHTML !== 'string') {
      console.warn("⚠️ Rendered HTML is not a string, converting...");
      renderedHTML = String(renderedHTML || '');
    }
    
    // Log a sample of the rendered HTML
    if (renderedHTML && renderedHTML.length > 0) {
      console.log(`Rendered HTML (first 100 chars): ${renderedHTML.substring(0, Math.min(100, renderedHTML.length))}...`);
      console.log(`Total HTML length: ${renderedHTML.length} characters`);
    } else {
      console.warn("⚠️ Rendered HTML is empty! Falling back to simple HTML template");
      
      // Generate a simple fallback HTML template
      if (name === "welcome") {
        const userName = typeof params.name === 'string' ? params.name : 'friend';
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
        const htmlContent = typeof customParams.html === 'string' ? customParams.html : String(customParams.html || '');
        const title = customParams.title || 'Astro Starter';
        
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
      
      console.log("Fallback HTML generated, length:", renderedHTML.length);
    }
    
    return renderedHTML;
  } catch (error) {
    console.error(`Error rendering email template "${name}":`, error);
    throw error;
  }
}