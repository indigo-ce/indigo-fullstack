import type {EmailQueueMessage, EmailTemplate} from "./email-queue";
import {EMAIL_SUBJECTS} from "./email-queue";

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
  options?: {subject?: string; locale?: string}
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
    queuedAt: new Date().toISOString()
  };

  await env.EMAIL_QUEUE.send(message);
  console.log(`✅ [QUEUE] Email queued for ${to} (template: ${template.type}, locale: ${locale})`);

  return {queued: true};
}
