# TODO

## New Project Checklist

- [ ] Create a KV namespace for sessions using `pnpm wrangler kv namespace create "SESSION"` and add the binding to `wrangler.jsonc`.
- [ ] Create a D1 database in Cloudflare and add its `binding`, `database_name`, and `database_id` to `wrangler.jsonc`.
- [ ] Run `pnpm db:init:local` to initialize the local database.
- [ ] Run `pnpm db:init:prod` to initialize the production database.
- [ ] Regenerate migrations using `pnpm db:generate`.
- [ ] Apply migrations to local database using `pnpm d1:migrate:local`.
- [ ] Apply migrations to production database using `pnpm d1:migrate:prod`.
- [ ] Ensure all bundled tests pass using `pnpm test`.
- [ ] Deploy the app using `pnpm deploy` before setting production secrets.
- [ ] Set `BETTER_AUTH_SECRET` secret using `pnpm wrangler secret put BETTER_AUTH_SECRET` for production.
- [ ] Set `RESEND_API_KEY` secret using `pnpm wrangler secret put RESEND_API_KEY` for production.
- [ ] (Optional) Turn on require email verification on sign up.
- [ ] Update logo and landing page copy.
