import {Resend} from "resend";

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<any> {
  if (process.env.RESEND_API_KEY) {
    return sendEmailWithResend(to, subject, html);
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set");
    } else {
      console.log("📤 Sending email with SMTP...");
      return sendEmailWithSMTP(to, subject, html);
    }
  }
}

async function sendEmailWithResend(
  to: string,
  subject: string,
  html: string
): Promise<any> {
  const from =
    process.env.SEND_EMAIL_FROM || "Astro Starter <noreply@example.com>";
  const resend = new Resend(process.env.RESEND_API_KEY);

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
  const {getEmailTransporter, getTestMessageUrl} = await import(
    "./nodemailer-util"
  );
  const transporter = await getEmailTransporter();
  const from =
    process.env.SEND_EMAIL_FROM || "Astro Starter <noreply@example.com>";
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
