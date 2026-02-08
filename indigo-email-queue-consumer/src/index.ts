import type {EmailQueueMessage} from "@app/lib/email-queue";
import {renderEmailTemplate} from "./render-template";
import {sendEmailWithPlunk} from "./send-email";

export interface Env {
  PLUNK_API_KEY: string;
  SEND_EMAIL_FROM: string;
}

export default {
  async queue(batch: MessageBatch<EmailQueueMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const {to, subject, template, locale, queuedAt} = message.body;

      try {
        console.log(
          `Processing email for ${to} (template: ${template.type}, locale: ${locale}, queued: ${queuedAt})`
        );

        const html = await renderEmailTemplate(template, locale);
        await sendEmailWithPlunk(
          to,
          subject,
          html,
          env.PLUNK_API_KEY,
          env.SEND_EMAIL_FROM
        );

        message.ack();
        console.log(`✅ Email sent successfully to ${to}`);
      } catch (error) {
        console.error(`❌ Failed to process email for ${to}:`, error);
        const retryDelay = 30 * Math.pow(2, message.attempts);
        message.retry({delaySeconds: retryDelay});
      }
    }
  }
};
