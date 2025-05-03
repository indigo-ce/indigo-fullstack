import {
  createTestAccount,
  createTransport,
  getTestMessageUrl,
  type Transporter
} from "nodemailer";

export async function getEmailTransporter(): Promise<Transporter> {
  return new Promise((resolve, reject) => {
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ) {
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || "587");
      const secure = process.env.SMTP_SECURE === "true";

      const transporter = createTransport({
        host,
        port,
        secure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      resolve(transporter);
      return;
    }

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
        auth: {user, pass}
      });
      resolve(transporter);
    });
  });
}

export {getTestMessageUrl};
