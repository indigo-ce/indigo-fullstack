# TODO

- [x] Replace icon in the navigation header with the correct one.
- [x] Improve design of header and footer.
- [ ] Fix callbackURL since it's only used after email verification
- [ ] auth.api returns data and error, you can check for an error and get success that way

## PR #16: Plunk Migration Follow-ups

### Issues (should fix before merge)

- [x] Remove dead Resend code from `src/lib/email.ts` (unused `sendEmail()`, `sendEmailWithResend()`, `import {Resend}`) and remove `resend` from `package.json`
- [x] Fix Plunk API key pattern in README — says "starts with `re_`" and shows `PLUNK_API_KEY=re_xxxxxxxxxx`, which is the Resend format, not Plunk
- [x] Remove Plunk test domains (`delivered@useplunk.com`, `bounced@useplunk.com`, `complained@useplunk.com`) — Plunk does not have Resend-style test infrastructure. Update README
- [x] Remove `ChangeEmailVerification` template
- [x] Confirm `pnpm build` passes with the `EMAIL_QUEUE` binding (ensure `pnpm cf-types` was run to regenerate Env type)

### Suggestions (nice to have)

- [x] Remove `idempotencyKey` — it's in the type and docs but the worker never checks for it
- [x] Clean up `?verified=true` query param on dashboard after displaying the success banner to avoid persistence on refresh
- [x] Align retry delay cap in `indigo-email-queue-consumer/src/index.ts` — the 300s cap never triggers with 3 retries, consider removing or documenting accurately
