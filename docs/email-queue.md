# Email Queue System

## Overview

Indigo Stack uses an asynchronous email queue system powered by Cloudflare Queues to prevent email sending from blocking user requests. This architecture separates email processing into a dedicated worker with its own CPU budget.

## Architecture

### Request Flow

```
┌─────────────────────┐
│   User Request      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Main Application   │
│  queueEmail()       │
└──────────┬──────────┘
           │ (instant)
           ▼
┌─────────────────────┐
│  Cloudflare Queue   │
│  (message buffer)   │
└──────────┬──────────┘
           │ (async)
           ▼
┌─────────────────────┐
│   Email Worker      │
│  - Render template  │
│  - Send via Plunk  │
└─────────────────────┘
```

### Key Benefits

- **Fast Response Times**: Email rendering doesn't block request responses
- **Separate CPU Budget**: Worker has its own CPU allocation
- **Automatic Retries**: Exponential backoff with configurable max retries
- **Dead Letter Queue**: Failed messages are preserved for investigation
- **Batch Processing**: Worker can process multiple emails in a single batch
- **Localization Support**: Templates support multiple languages (en, ja)

## Setup Guide

### 1. Create Cloudflare Queues

Create the primary queue and dead letter queue:

```bash
pnpm queue:create
```

This creates:
- `indigo-email-queue` - Primary message queue
- `indigo-email-queue-dlq` - Dead letter queue for failed messages

### 2. Install Worker Dependencies

```bash
cd indigo-email-queue-consumer
pnpm install
cd ..
```

### 3. Regenerate Types

After adding the queue binding to `wrangler.jsonc`, regenerate types:

```bash
pnpm cf-types
```

This adds the `EMAIL_QUEUE` binding to your `Env` type.

### 4. Configure Worker Secret

Set the Plunk API key for the worker:

```bash
npx wrangler secret put PLUNK_API_KEY --config indigo-email-queue-consumer/wrangler.jsonc
```

### 5. Deploy Worker

Deploy the worker before the main app:

```bash
pnpm email-worker:deploy
```

### 6. Deploy Main App

```bash
pnpm build
# Then your normal deployment process
```

## Usage

### Queueing Emails

Use `queueEmail()` to queue emails for asynchronous processing:

```typescript
import {queueEmail} from "@/lib/email";

// Basic usage
await queueEmail(
  "user@example.com",
  {type: "welcome", props: {name: "John"}},
  env
);

// With locale for translations
await queueEmail(
  "user@example.com",
  {type: "email-verification", props: {name: "John", url: verificationUrl}},
  env,
  {locale: "ja"} // Japanese translations
);

// With custom subject
await queueEmail(
  "user@example.com",
  {type: "custom", props: {html: "<p>Message</p>"}},
  env,
  {subject: "Custom Subject"}
);
```

### Available Templates

All templates support localization (English and Japanese):

```typescript
// Email verification
{type: "email-verification", props: {name: string, url: string}}

// Password reset
{type: "password-reset", props: {name: string, resetLink: string}}

// Account deleted
{type: "account-deleted", props: {name: string}}

// Welcome email
{type: "welcome", props: {name: string}}

// Custom HTML
{type: "custom", props: {html: string, title?: string, preview?: string}}
```

## Configuration

### Main App (`wrangler.jsonc`)

```jsonc
{
  "queues": {
    "producers": [
      {
        "binding": "EMAIL_QUEUE",
        "queue": "indigo-email-queue"
      }
    ]
  },
  "vars": {
    "SEND_EMAIL_FROM": "Indigo Stack <noreply@indigostack.org>"
  }
}
```

### Email Worker (`indigo-email-queue-consumer/wrangler.jsonc`)

```jsonc
{
  "name": "indigo-email-queue-consumer",
  "queues": {
    "consumers": [
      {
        "queue": "indigo-email-queue",
        "max_batch_size": 10,
        "max_batch_timeout": 30,
        "max_retries": 3,
        "dead_letter_queue": "indigo-email-queue-dlq"
      }
    ]
  },
  "vars": {
    "SEND_EMAIL_FROM": "Indigo Stack <noreply@indigostack.org>"
  }
}
```

## Development

### Local Development

In local development, `queueEmail()` automatically logs to console instead of queuing:

```typescript
// In local dev (localhost URLs detected)
await queueEmail(to, template, env);
// Output:
// 📧 [LOCAL DEV] Email would be queued:
//   To: user@example.com
//   Template: welcome
//   Locale: en
//   Props: {"name": "John"}
```

### Testing with Worker

To test the full queue flow locally:

**Terminal 1: Main app**
```bash
pnpm dev
```

**Terminal 2: Email worker**
```bash
pnpm email-worker:dev
```

Emails will be queued and processed by the local worker.

## Monitoring

### View Worker Logs

Stream logs from the deployed worker:

```bash
wrangler tail indigo-email-queue-consumer
```

### Queue Metrics

Monitor queue health in Cloudflare dashboard:

1. Navigate to: **Workers & Pages → Queues → indigo-email-queue**
2. View metrics:
   - Messages in queue
   - Consumer throughput
   - Processing latency
   - Failed messages

### Dead Letter Queue

Check failed messages that exceeded max retries:

```bash
wrangler queues consumer view indigo-email-queue-dlq
```

## Troubleshooting

### Worker Deployment Fails

**Issue**: Worker deployment fails with secret errors

**Solution**: Ensure `PLUNK_API_KEY` secret is set:
```bash
npx wrangler secret put PLUNK_API_KEY --config indigo-email-queue-consumer/wrangler.jsonc
```

### Emails Not Sending

**Issue**: Emails are queued but not delivered

**Check**:
1. Worker is deployed: `wrangler deployments list`
2. Worker logs for errors: `wrangler tail indigo-email-queue-consumer`
3. Queue metrics show messages are being consumed
4. Plunk API key is valid

### CPU Budget Exceeded

**Issue**: Main app hits CPU limits during email-heavy flows

**Solution**: This should not happen with the queue system. If it does:
- Verify `queueEmail()` is used instead of `sendEmail()`
- Check that emails are being queued, not sent synchronously
- Review application code for direct email API calls

### Messages in Dead Letter Queue

**Issue**: Messages accumulating in DLQ

**Check**:
1. Worker logs for error details
2. Plunk API rate limits or errors
3. Template rendering errors
4. Invalid email addresses

**Resolution**:
1. Fix underlying issue (API key, template, etc.)
2. Messages in DLQ can be manually requeued if needed
3. Update worker and redeploy

## Best Practices

### Error Handling

The worker handles errors gracefully:
- Retries with exponential backoff (30s, 60s, 120s)
- Max 3 retries before moving to DLQ
- Preserves message for investigation

### Locale Detection

Automatically pass user's locale preference:

```typescript
// From Better Auth user object
await queueEmail(
  user.email,
  template,
  env,
  {locale: user.locale || "en"}
);
```

### Subject Customization

Override default subjects when needed:

```typescript
await queueEmail(
  user.email,
  template,
  env,
  {subject: "🎉 Special Announcement!"}
);
```

## Migration from Synchronous Email

If migrating from synchronous `sendEmail()`:

1. Replace `sendEmail()` imports with `queueEmail()`
2. Update function signatures (template objects instead of rendered HTML)
3. Remove `await render()` calls (worker handles rendering)
4. Deploy worker before main app
5. Monitor queue metrics after deployment

**Before:**
```typescript
import {sendEmail} from "@/lib/email";
import {render} from "@react-email/render";
import WelcomeEmail from "@/components/email/WelcomeEmail";

await sendEmail(
  to,
  "Welcome!",
  await render(WelcomeEmail({name})),
  env
);
```

**After:**
```typescript
import {queueEmail} from "@/lib/email";

await queueEmail(
  to,
  {type: "welcome", props: {name}},
  env,
  {locale: "en"}
);
```

## Related Documentation

- [Cloudflare Queues Documentation](https://developers.cloudflare.com/queues/)
- [Plunk API Documentation](https://useplunk.com/docs)
- [React Email Documentation](https://react.email/docs)
- [Better Auth Documentation](https://www.better-auth.com/)
