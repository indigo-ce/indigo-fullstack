import {Resend} from "resend";

interface ResendError {
  message?: string;
  error?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  env: Env
): Promise<any> {
  // Check if we're in test mode by looking for CI-specific test key
  const isTestMode = env.RESEND_API_KEY === "ci-test-key";

  // In test environment, skip actual email sending
  if (isTestMode) {
    console.log(`📧 [TEST MODE] Would send email to: ${to}, subject: ${subject}`);
    return {id: "test-email-id", mock: true};
  }

  if (process.env.NODE_ENV === "production") {
    if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
    if (!env.SEND_EMAIL_FROM) throw new Error("SEND_EMAIL_FROM is not set");
    return sendEmailWithResend(
      to,
      subject,
      html,
      env.RESEND_API_KEY,
      env.SEND_EMAIL_FROM
    );
  } else {
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is required");
    }

    // Use Resend test domain for local development
    const emailTo = "delivered@resend.dev";

    return sendEmailWithResend(
      emailTo,
      subject,
      html,
      env.RESEND_API_KEY,
      env.SEND_EMAIL_FROM
    );
  }
}

async function sendEmailWithResend(
  to: string,
  subject: string,
  html: string,
  resendAPIKey: string,
  sendEmailFrom: string
): Promise<any> {
  const from = sendEmailFrom;
  const resend = new Resend(resendAPIKey);

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html
    });

    // Check if Resend returned an error in the response
    if (result.error) {
      const error = result.error as ResendError;
      console.error("❌ [RESEND] API error:", error.message || error.error);
      throw new Error(`Resend API error: ${error.message || error.error}`);
    }

    return result;
  } catch (error) {
    console.error(
      "❌ [RESEND] Failed to send email:",
      (error as Error).message
    );
    throw error;
  }
}
