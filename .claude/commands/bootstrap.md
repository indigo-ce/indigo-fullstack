Bootstrap the local development environment for Indigo Stack. Run each step in order, stopping if any step fails:

1. Install dependencies: `pnpm install`
2. Copy `.dev.vars.example` to `.dev.vars` only if `.dev.vars` does not already exist. If it exists, skip this step and note that it was skipped.
3. Generate Cloudflare types: `pnpm cf-types`
4. Apply database migrations locally: `pnpm db:migrate:local`

Report the result of each step as you go.
