# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands

- `pnpm dev` - Start development server (includes Astro type checking and Cloudflare Workers emulation)
- `pnpm build` - Build production (includes Cloudflare types generation and Astro build)
- `pnpm preview` - Preview production build locally with Wrangler
- `astro check` - Run TypeScript and Astro diagnostics

### Database Operations

- `pnpm db:generate` - Generate Drizzle migrations from schema changes
- `pnpm db:migrate:local` - Apply migrations to local D1 database
- `pnpm db:migrate:prod` - Apply migrations to production D1 database
- `pnpm db:studio:local` - Open Drizzle Studio for local database inspection
- `pnpm db:init:local` - Initialize local D1 database
- `pnpm db:init:prod` - Create production D1 database

### Email Development

- `pnpm preview-email` - Start React Email preview server for template development

### Authentication Schema

- `pnpm better-auth:schema` - Generate Better Auth schema using config

## Architecture Overview

### Multi-Framework Hybrid Architecture

This is an Astro application with React components for interactivity and email templates. The architecture follows a hybrid approach:

- **Frontend**: Astro pages with server-side rendering + React islands for client-side interactivity
- **API Layer**: Hono-based REST API mounted at `/api/v1/*` with modular route organization
- **Database**: Drizzle ORM with Cloudflare D1 (serverless SQLite)
- **Authentication**: Better Auth with JWT tokens and refresh token plugin
- **Email**: React Email templates with Plunk API exclusively
- **Deployment**: Cloudflare Workers with static assets

## Better Auth Integration

### Important Rules

- **ALWAYS use `auth.api.*` methods** for all Better Auth interactions (both client-side and server-side)
- **NEVER use `fetch()`** to call Better Auth endpoints
- **NEVER use `auth.handler()`** - use the API methods instead
- Use `asResponse: true` when you need to access response headers or cookies
- For verification/redirect endpoints, check both `response.ok` and `response.status === 302`

### Examples

```typescript
// ✅ CORRECT - Use auth.api methods
const auth = createAuth(env);

// Without response headers (simple success/error checking)
const {status} = await auth.api.sendVerificationEmail({
  body: {
    email,
    callbackURL: "/discover"
  }
});

// With response headers (to access cookies)
const response = await auth.api.signUpEmail({
  body: {email, password, name},
  asResponse: true
});
if (response.ok) {
  const cookies = response.headers.getSetCookie();
  // Forward cookies...
}

// Handle redirects (e.g., email verification)
const response = await auth.api.verifyEmail({
  query: {token, callbackURL},
  asResponse: true
});
if (response.ok || response.status === 302) {
  // Verification successful
}

// ❌ WRONG - Don't use fetch
const response = await fetch(`${baseURL}/api/auth/...`);

// ❌ WRONG - Don't use handler
const response = await auth.handler(request);
```

### Request Flow Architecture

#### Web Pages (Astro SSR)

1. Astro middleware handles authentication state and i18n routing
2. Pages render server-side with user context available via `locals.user`
3. React components hydrate for interactive features
4. Language detection/routing handled by middleware with cookie preference

#### API Requests (Hono)

1. All API requests route through `/api/[...path].ts`
2. Hono app with v1 namespace: `/api/v1/*`
3. Middleware chain: D1 → Auth → Env → Response Time
4. JWT-based authentication for API endpoints
5. Routes organized by domain: `/auth`, `/account`

**IMPORTANT**: Hono API endpoints are designed for external/mobile clients only and require JWT authentication. **Do NOT use these endpoints within Astro views or components.** For server-side data access in views, use direct database queries via Drizzle ORM or server-side actions instead.

### Database Schema Architecture

The database follows Better Auth's expected schema with extensions:

- `user` - Core user data with email verification status
- `session` - Better Auth sessions for web authentication
- `account` - OAuth accounts and password data
- `verification` - Email verification tokens
- `jwks` - JSON Web Key Sets for JWT signing

### Authentication Architecture

Dual authentication system:

- **Web Authentication**: Session-based via Better Auth (cookies)
- **API Authentication**: JWT + Refresh token system for mobile/API clients
- **Middleware Integration**: Both systems share user context through Astro locals

#### Mobile Authentication API

Mobile apps use the Hono API (`/api/v1/auth/*`) instead of calling Better Auth endpoints directly. This provides API stability and protection from upstream changes.

**Architecture Decision:**

- ✅ Mobile → `/api/v1/auth/*` (Hono) → `auth.api.*` (Better Auth internally)
- ❌ Mobile → `/api/auth/*` (Better Auth directly) - Not allowed

**Available Endpoints:**

1. **POST `/api/v1/auth/sign-up`** - Register new user + send verification email

   ```json
   {
     "email": "user@example.com",
     "password": "password123",
     "name": "John Doe",
     "callbackURL": "/dashboard" // optional
   }
   ```

2. **GET `/api/v1/auth/sign-in`** - Exchange credentials for JWT tokens
   - Headers: `Authorization: Basic <base64(email:password)>`
   - Returns: `{accessToken, refreshToken}`

3. **POST `/api/v1/auth/send-verification-email`** - Resend verification email

   ```json
   {
     "email": "user@example.com",
     "callbackURL": "/dashboard" // optional
   }
   ```

4. **POST `/api/v1/auth/forget-password`** - Send password reset email

   ```json
   {
     "email": "user@example.com",
     "redirectTo": "/reset-password" // optional
   }
   ```

5. **POST `/api/v1/auth/reset-password`** - Reset password with token

   ```json
   {
     "newPassword": "newPassword123",
     "token": "token-from-email"
   }
   ```

6. **POST `/api/v1/auth/refresh-access`** - Refresh JWT tokens
7. **POST `/api/v1/auth/revoke-access`** - Revoke JWT tokens

**Locale Handling for Mobile:**

All email-sending endpoints (`sign-up`, `send-verification-email`, `forget-password`) extract locale from the `Accept-Language` header:

```text
Mobile App → Headers: Accept-Language: ja
          → getLanguageFromHeaders() extracts "ja"
          → createAuth(env, "ja")
          → Email sent in Japanese
```

Mobile clients should always send `Accept-Language` header with their device's preferred language to receive localized emails.

**Example (React Native):**

```typescript
import * as Localization from 'expo-localization';

fetch('/api/v1/auth/sign-up', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': Localization.locale // "ja-JP" or "en-US"
  },
  body: JSON.stringify({email, password, name})
});
```

### Internationalization Architecture

Type-safe i18n with locale-aware routing:

- Supported locales: `en` (default), `ja`
- URL structure: `/{locale}/page` (e.g., `/ja/dashboard`)
- Language detection: Cookie preference → Accept-Language header → default
- Translations stored as JSON with TypeScript inference for type safety

### Email System Architecture

React Email templates with Plunk API:

- **Production**: Plunk API with custom domain
- **Development**: Plunk API with resend.dev testing domains
- Template organization in `src/components/email/` with shared BaseLayout
- Preview server available via `pnpm preview-email`

## Key Configuration Files

### Environment Configuration

- **Local secrets**: `.dev.vars` (copy from `.dev.vars.example`)
- **Production secrets**: Set via `pnpm wrangler secret put VARIABLE_NAME`
- **Public vars**: Configured in `wrangler.jsonc` under `vars` section
- **Schema validation**: Defined in `astro.config.mjs` env schema

### Database Configuration

- **Schema**: `src/db/schema.ts` - Drizzle schema definitions
- **Migrations**: Generated in `drizzle/migrations/` via `pnpm db:generate`
- **Connection**: Uses Cloudflare D1 binding `DB` configured in `wrangler.jsonc`
- **Local DB**: Auto-discovered in `.wrangler/` directory by Drizzle Kit

### Authentication Configuration

- **Web Auth**: `src/lib/auth.ts` - Runtime Better Auth instance
- **Schema Gen**: `src/lib/auth-config.ts` - Config for CLI schema generation
- **Plugins**: Custom refresh access token plugin in `src/plugins/better-auth/`

## Development Patterns

### Adding New API Endpoints

1. Create route file in `src/lib/hono/routes/`
2. Import and mount in `src/pages/api/[...path].ts`
3. Authentication handled automatically by middleware
4. Database available via `c.get("db")`

### Database Schema Changes

1. Update `src/db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Apply with `pnpm db:migrate:local`
4. For production: `pnpm db:migrate:prod`

### Adding New Languages

1. Add locale to `src/i18n/constants.ts` locales array
2. Create translation file in `src/translations/{locale}.json`
3. Import in `constants.ts` translations object
4. Language detection and routing handled automatically

### Email Template Development

1. Create React component in `src/components/email/`
2. Use BaseLayout for consistent styling
3. Test with `pnpm preview-email`
4. Send via `sendEmail()` from `@/actions/email`

### Component Development

- **Astro components**: For page layouts and static content
- **React components**: For interactive UI elements (forms, dropdowns, etc.) and email templates
- **UI Primitives**: Shadcn-style components in `src/components/ui/`

### Error Handling & Display Guidelines

The application uses a unified error display system for consistent user feedback.

**Available Components:**

- **Astro:**
  - `ErrorMessage.astro` - Displays all errors at the top of forms
  - `SuccessMessage.astro` - Success confirmations with icons
- **React:**
  - `ErrorMessage.tsx` - React version for client components

**Error Display Pattern:**

**ALL errors display at the top of forms using ErrorMessage. No inline field errors.**

```astro
<!-- Astro Components -->import ErrorMessage from
"@/components/ErrorMessage.astro"; import SuccessMessage from
"@/components/SuccessMessage.astro";

<form>
  <!-- Show ANY error at top - server, validation, or field errors -->
  <ErrorMessage message={errors.server || errors.email || errors.password} />

  <!-- Form fields without inline errors -->
  <Input type="email" name="email" required />
  <Input type="password" name="password" required />

  <Button type="submit">Submit</Button>
</form>

<!-- Success message -->
<SuccessMessage message={successMessage} />
```

```tsx
// React Components
import {ErrorMessage} from "@/components/ErrorMessage";
import {toast} from "sonner";

<form>
  {/* All errors at top */}
  <ErrorMessage message={errors.server || errors.name || errors.description} />

  {/* Fields */}
  <Input name="name" required />

  {/* Toast for success (transient feedback) */}
  <Button onClick={() => toast.success("Saved!")}>Save</Button>
</form>;
```

**Design Principles:**

- **One error location**: Top of form only, never inline
- **Combine errors**: Use `||` to show first available error
- **Lucide icons**: AlertCircle for errors, CheckCircle for success
- **Design tokens**: `text-destructive`, `bg-destructive/10`, etc.
- **Auto-hide**: Components hide when no message
- **Dark mode**: Built-in via design tokens

**Toast Notifications** - For transient, non-blocking feedback:

- Success confirmations (`toast.success()`)
- Background operations (`toast.info()`)
- Non-critical errors (`toast.error()`)
- Icons auto-configured with Lucide

**Migration Notes:**

- Remove all inline field error displays
- Consolidate errors at top with `errors.field1 || errors.field2`
- Remove `FormError` component usage (deprecated)
- Keep ARIA attributes for accessibility (optional)

### Adding New Components

When tasking with redesigning or creating components, always check whether we
have the component locally first, then if not, use the `git-ingest` and
`deepwiki` tools to pull Shadcn components and Lucide icons from the following
repositories:

- [Shadcn](https://github.com/shadcn-ui/ui)
- [Lucide](https://github.com/lucide-icons/lucide)
- [Shadcn Blocks](https://github.com/shadcnblocks/shadcn-ui-blocks)
- [Shadcn Examples](https://github.com/shadcn-examples/shadcn-examples)
- [React Shadcn Components](https://github.com/shadcnio/react-shadcn-components)

Use BrowserMCP to preview both the old and new designs. If you get connection
errors, ask the developer to ensure the browser extension is installed and is
running against localhost:4321. Use that as base URL for your attempts. You
might need to navigate to the page you're redesigning first to see how it looks
like.

### Button Component Usage Guidelines

**Rule**: Choose the right button approach based on functionality requirements:

- **Static navigation links** → Use `buttonVariants()` with compile-time class generation

  ```astro
  ---
  import {buttonVariants} from "@/components/ui/button";
  const buttonClasses = buttonVariants({variant: "outline", size: "sm"});
  ---

  <a href="/path" class={buttonClasses}>Link Text</a>
  ```

- **Interactive functionality** → Keep React Button components with `client:load`

  ```astro
  <!-- Form submissions, click handlers, state management -->
  <Button type="submit" onClick={handler} client:load>Submit</Button>
  ```

**Examples of compile-time candidates**: `<Button asChild>` wrapping simple `<a>` tags
**Examples of React components**: Form buttons, click handlers, state management, disabled states

## Important Constraints

### Cloudflare Workers Limitations

- No Node.js built-ins in production runtime
- React 19 requires `react-dom/server.edge` in production (configured in Astro config)

### Better Auth Configuration

- `src/lib/auth-config.ts` used only for schema generation (no D1 access)
- Runtime auth instances created per-request in `src/lib/auth.ts`
- JWKS stored in database, not filesystem

### Database Development

- Local D1 database auto-created on first `pnpm dev`
- Schema changes require explicit migration generation and application
- Drizzle Studio connects to local `.wrangler/` database file

### Development vs Production

- Email: Plunk API with resend.dev testing (dev) vs Plunk API (prod)
- Database: Local D1 file vs remote Cloudflare D1
- Secrets: `.dev.vars` file vs Wrangler secrets
- Assets: Dev server vs Cloudflare Workers static assets

## Theming

This project uses TailwindCSS for styling.
The shadcn theme is defined in `src/styles.css`.

You can generate a new theme using your favorite tool ([example](https://themecn.dev/))
then copy-paste the variables.

### CSS File Setup for New Projects

The template includes two CSS files in `src/`:

- `styles.css` - Contains Indigo brand colors (seagull, hyacinth, asparagus, earth palettes)
- `_styles.css` - Contains neutral colors that most projects would want to start with

When starting a new project, you should:

1. Delete `src/styles.css` (contains Indigo template branding)
2. Rename `src/_styles.css` to `src/styles.css` (neutral starter colors)

**Automated via Bootstrap Script**: This is handled automatically by the `scripts/bootstrap.js` script when setting up a new project.
