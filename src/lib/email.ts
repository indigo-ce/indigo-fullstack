import {Resend} from "resend";
import type {EmailQueueMessage, EmailTemplate} from "./email-queue";
import {EMAIL_SUBJECTS} from "./email-queue";

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
  // Check if we're in test mode (local "test-key" or CI "ci-test-key")
  const isTestMode = env.RESEND_API_KEY?.includes("test-key") ?? false;

  // In test environment, skip actual email sending
  if (isTestMode) {
    console.log("📧 [TEST MODE] Would send email:");
    console.log("  To:", to);
    console.log("  Subject:", subject);

    // Extract links from HTML and decode HTML entities for better readability
    const linkMatches = html.matchAll(/href="([^"]+)"/g);
    const links = Array.from(linkMatches, (m) =>
      m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    );
    if (links.length > 0) {
      console.log("  Links in email:");
      links.forEach((link) => console.log("   ", link));
    }

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

/**
 * Queue an email for asynchronous delivery.
 *
 * In production, emails are queued to a Cloudflare Queue and processed
 * by a separate worker with its own CPU budget.
 *
 * In local development, logs email details to console without sending.
 */
export async function queueEmail(
  to: string,
  template: EmailTemplate,
  env: Env,
  options?: {subject?: string; idempotencyKey?: string; locale?: string}
): Promise<{queued: true}> {
  const locale = options?.locale || "en";

  const isLocalDev =
    env.BETTER_AUTH_BASE_URL?.includes("localhost") ||
    env.BETTER_AUTH_BASE_URL?.includes("127.0.0.1");

  if (isLocalDev) {
    console.log("📧 [LOCAL DEV] Email would be queued:");
    console.log("  To:", to);
    console.log("  Template:", template.type);
    console.log("  Locale:", locale);
    console.log("  Props:", JSON.stringify(template.props, null, 2));
    return {queued: true};
  }

  const message: EmailQueueMessage = {
    to,
    subject: options?.subject ?? EMAIL_SUBJECTS[locale]?.[template.type] ?? EMAIL_SUBJECTS.en[template.type],
    template,
    locale,
    queuedAt: new Date().toISOString(),
    idempotencyKey: options?.idempotencyKey
  };

  await env.EMAIL_QUEUE.send(message);
  console.log(`✅ [QUEUE] Email queued for ${to} (template: ${template.type}, locale: ${locale})`);

  return {queued: true};
}

