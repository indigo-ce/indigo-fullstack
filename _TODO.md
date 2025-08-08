# TODO

## New Project Checklist

- [ ] Copy `.dev.vars.example` to `.dev.vars` and add secrets like `BETTER_AUTH_SECRET` and `RESEND_API_KEY` for local development.
- [ ] Create a KV namespace for sessions using `pnpm wrangler kv namespace create "SESSION"` and add the binding to `wrangler.jsonc`.
- [ ] Update `wrangler.jsonc` with your project name, D1 database details, and variables like `BETTER_AUTH_BASE_URL` and `SEND_EMAIL_FROM`.
- [ ] Update project name in `package.json`
- [ ] Update database schema.
- [ ] Create a D1 database in Cloudflare and add its `binding`, `database_name`, and `database_id` to `wrangler.jsonc`.
- [ ] Run `pnpm db:init:local` to initialize the local database.
- [ ] Run `pnpm db:init:prod` to initialize the production database.
- [ ] Regenerate migrations using `pnpm db:generate`.
- [ ] Set `BETTER_AUTH_SECRET` secret using `pnpm wrangler secret put BETTER_AUTH_SECRET` for production.
- [ ] Set `RESEND_API_KEY` secret using `pnpm wrangler secret put RESEND_API_KEY` for production.
- [ ] Require email verification on sign up.
- [ ] Remove the pre-existing `TODO.md` and rename `_TODO.md` to `TODO.md`.
