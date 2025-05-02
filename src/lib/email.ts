import {Resend} from "resend";

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<any> {
  // Use Resend if the API key is set
  if (import.meta.env.RESEND_API_KEY) {
    return sendEmailWithResend(to, subject, html);
  } else {
    console.log("Falling back to SMTP due to missing RESEND_API_KEY...");
    // Fallback to SMTP (likely dev only)
    return sendEmailWithSMTP(to, subject, html);
  }
}

async function sendEmailWithResend(
  to: string,
  subject: string,
  html: string
): Promise<any> {
  const from =
    import.meta.env.SEND_EMAIL_FROM || "Astro Starter <noreply@example.com>";
  const resend = new Resend(import.meta.env.RESEND_API_KEY);

  return resend.emails.send({
    from,
    to,
    subject,
    html
  });
}

async function sendEmailWithSMTP(
  to: string,
  subject: string,
  html: string
): Promise<any> {
  // Skip SMTP in production environments
  if (!import.meta.env.PROD) {
    console.log("Skipping email in production without Resend API key");
    return {
      id: "skipped-in-production",
      message: "Email sending skipped in production"
    };
  }

  const {getEmailTransporter, getTestMessageUrl} = await import(
    "./nodemailer-util"
  );
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
