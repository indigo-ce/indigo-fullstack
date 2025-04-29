# Astro Starter Kit

A feature-rich web application starter template built with Astro, Svelte, TailwindCSS, Better Auth, Drizzle ORM.

## Getting Started

```bash
pnpm install
cp .env.example .env
pnpm run dev
```

## 🚀 Tech Stack

- **[Astro](https://astro.build)** - Fast, modern web framework
- **[Svelte](https://svelte.dev)** - UI component library used for component hydration
- **[TailwindCSS](https://tailwindcss.com)** - Utility-first CSS framework v4
  - With Typography plugin for elegant content styling
- **[Shadcn UI](https://next.shadcn-svelte.com)** - UI component library
- **[Better Auth](https://better-auth.com)** - Authentication system
- **[Drizzle ORM](https://orm.drizzle.team)** - TypeScript ORM
- **[Resend](https://resend.com)** - Modern email API for sending emails
- **[Hono](https://hono.dev)** - Lightweight, ultrafast web framework for API endpoints

## 🛠️ Features

- **Server-side Rendering** with Astro's Cloudflare adapter
- **Type Safety** with TypeScript
- **User Authentication** flow with Better Auth
- **Database Integration** with Drizzle ORM and Cloudflare D1
- **Modern UI** with TailwindCSS v4
- **Email Functionality** with Resend API and templating using React Email
- **Development Tools**: Prettier for code formatting
- **API Layer**: Built with Hono for efficient request handling

## 🧞 Commands

| Command                 | Action                                   |
| :---------------------- | :--------------------------------------- |
| `pnpm install`          | Installs dependencies                    |
| `pnpm dev`              | Starts local dev server with DB setup    |
| `pnpm build`            | Build your production site with DB setup |
| `pnpm astro`            | Run Astro CLI commands                   |
| `pnpm db:generate`      | Generate Drizzle migrations              |
| `pnpm d1:migrate:local` | Apply migrations locally                 |
| `pnpm d1:migrate:prod`  | Apply migrations to production           |
| `pnpm d1:studio:local`  | Run Drizzle Studio for local development |
| `pnpm preview-email`    | Start email template preview server      |

## ☑️ New Project Checklist

- [ ] Add a KV session namespace then add binding to `wrangler.jsonc`
- [ ] Update `wrangler.jsonc` with your project details
- [ ] Update project name in `package.json`
- [ ] Get D1 database ID, Account ID, and Token from Cloudflare Dashboard. More info [here](https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit)
- [ ] Add D1 database ID to `wrangler.jsonc` file
- [ ] Set `BETTER_AUTH_SECRET` environment variable using wrangler CLI
- [ ] Set `RESEND_API_KEY` environment variable using wrangler CLI

## 🔐 Authentication

This template uses Better Auth for authentication. And supports these features out of the box:

1. **Sign Up**: Users can create an account with name, email, and password
2. **Sign In**: Users can log in with their email and password
3. **Protected Routes**: The dashboard is protected and requires authentication
4. **Sign Out**: Users can log out from their account
5. **Email Verification**: Users can verify their email address
6. **Password Reset**: Users can reset their password
7. **Account Deletion**: Users can delete their account

> [!IMPORTANT]
> By default, email verification is not required to sign in. You may want to change this behavior in `src/lib/auth.ts`.

### Better Auth

You **must** set the `BETTER_AUTH_SECRET` environment variable in your production environment (e.g., Cloudflare Pages). If this variable is not set, Better Auth will throw an error.

You can generate a secure secret using OpenSSL:

```bash
openssl rand -base64 32
```

Copy the generated string. Then, add it as an environment variable named `BETTER_AUTH_SECRET` using wrangler CLI:

```bash
pnpm wrangler secret put BETTER_AUTH_SECRET
```

### Resend

This template uses Resend for email functionality.
During development, emails are sent via SMTP to Ethereal so that you can test the email functionality without setting up a Resend account.

To set up Resend, you need to create an account and set the `RESEND_API_KEY` environment variable using wrangler CLI:

```bash
pnpm wrangler secret put RESEND_API_KEY
```

### Astro Session

The Astro Sessions API allows you to easily store user data between requests.
This can be used for things like user data and preferences, shopping carts, and
authentication credentials. Unlike cookie storage, there are no size limits on
the data, and it can be restored on different devices.

Before using sessions, you need to create a KV namespace to store the data and
configure a KV binding in your Wrangler config file.

```bash
pnpm wrangler kv namespace create "SESSION" # default name
```

Add the returned ID to `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "SESSION",
    "id": "<KV_NAMESPACE_ID>"
  }
]
```

## 🗄️ Database

This template uses Drizzle ORM with Cloudflare D1 for a modern, type-safe, serverless SQL database.

- The schema is defined using Drizzle's sqliteTable helpers for tables.
- The Drizzle config (drizzle.config.ts) auto-detects local vs. production and sets up credentials for Drizzle Kit.

### Database Schema

The database schema includes:

- Users
- Sessions
- Accounts
- Verification tokens

### Migrations

- Run `pnpm db:generate` to generate migrations from your schema.
- Run `pnpm d1:migrate:local` to apply them locally.
- Run `pnpm d1:migrate:prod` to apply them to production.

To apply migrations to your production database, you'll need to set up a D1 database in Cloudflare and update your wrangler.jsonc file with the appropriate database ID:

```jsonc
"d1_databases": [
  {
    "binding": "DB", // Must be same as preview_database_id
    "database_name": "your-project-name",
    "database_id": "your-d1-database-id",
    "migrations_dir": "./drizzle/migrations",
    "preview_database_id": "DB" // Required for Pages local development
  }
]
```

See the checklist above for more details.

> **Note:** You need to manually apply the migrations to your production database after every schema change.

### Studio

You can use the Drizzle Studio to view and edit your local database data.

```bash
pnpm d1:studio:local
```

## 📊 Database Queries

Here's an example of how to query the database using Drizzle ORM:

```typescript
import {createDrizzle} from "@/db";

const db = createDrizzle(d1); // You can obtain and instance of D1Database from the context using the DB binding.
const userData = await db.select().from(user).where(eq(user.id, userId));

// Create a new user
const newUser = await db
  .insert(user)
  .values({
    name: "John Doe",
    email: "john@example.com"
    // Other user fields
  })
  .returning();

// Join example: Fetch user with their active sessions
const userWithSessions = await db
  .select({
    id: user.id,
    name: user.name,
    sessionId: session.id
  })
  .from(user)
  .leftJoin(session, eq(session.userId, user.id))
  .where(eq(user.id, userId));
```

## 📨 Email Functionality

The application includes built-in email functionality using [Resend](https://resend.com) with fallback to SMTP/Ethereal for development.

### Configuration

Add these environment variables to your `.env` file:

```env
# Resend API configuration (recommended for production)
RESEND_API_KEY=your_resend_api_key
SEND_EMAIL_FROM="Your App Name <noreply@yourdomain.com>"

# Alternative: SMTP configuration
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=username
# SMTP_PASS=password
# SMTP_SECURE=false
```

### Email Templates

Email templates are built with React Email for improved type safety, maintainability, and design consistency. Templates are stored in `src/components/email/`:

- `WelcomeEmail.tsx` - Template for welcome emails
- `CustomEmail.tsx` - Template for custom message emails
- `BaseLayout.tsx` - Reusable email layout component
- `EmailVerification.tsx` - Template for email verification
- `PasswordReset.tsx` - Template for password reset emails
- `ChangeEmailVerification.tsx` - Template for email change verification
- `AccountDeleted.tsx` - Template for account deletion confirmation

### Sending Emails

```typescript
import {sendEmail} from "@/actions/email";

// Send a welcome email
await sendEmail({
  to: "user@example.com",
  subject: "Welcome to Astro Starter!",
  template: {name: "welcome", params: {name: "John"}}
});

// Send a custom email
await sendEmail({
  to: "user@example.com",
  subject: "Important Information",
  template: {name: "custom", params: {html: "<p>Your custom message here</p>"}}
});
```

### Sending Test Emails

Visit `/email-demo` to try the email functionality. In development, emails are sent to Ethereal (a test SMTP service) and you'll see preview links in the console.

### Preview Emails Templates

To preview emails locally, run:

```bash
pnpm preview-email
```

This command starts a local email viewer using the templates from the `src/components/email` directory.

## API

The API is built using Hono and comes with a hybrid JWT and refresh token authentication system, primarily for mobile applications. The API endpoints are organized in the `src/lib/hono/routes` directory.

Key features:

- JWT-based authentication
- Route protection using middlewares
- Structured response handling
- Integration with the Drizzle ORM database

API routes include:

- Authentication routes (`/api/auth/*`)
- User account management
- JWT refresh and token management

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant JWTMiddleware
    participant JWKSCache
    participant AuthPlugin
    participant DB

    Client->>API: POST /api/auth/v1/sign-in (with Basic Auth)
    API->>AuthPlugin: Validate credentials
    AuthPlugin->>DB: Fetch user, verify password
    AuthPlugin->>DB: Create session (refresh token)
    AuthPlugin->>JWKSCache: Get JWKS for JWT signing
    AuthPlugin-->>API: Return access token, refresh token, user info
    API-->>Client: Respond with tokens and user

    Client->>API: POST /api/auth-tokens/refresh (with refresh token)
    API->>AuthPlugin: Verify refresh token
    AuthPlugin->>DB: Lookup session
    AuthPlugin->>JWKSCache: Get JWKS for JWT signing
    AuthPlugin-->>API: Return new access token (and possibly new refresh token)
    API-->>Client: Respond with new tokens

    Client->>API: GET /api/account/v1/profile (with JWT)
    API->>JWTMiddleware: Extract and verify JWT
    JWTMiddleware->>JWKSCache: Get JWKS
    JWTMiddleware-->>API: Attach user to context
    API-->>Client: Respond with user profile

    Client->>API: POST /api/auth-tokens/revoke (with refresh token)
    API->>AuthPlugin: Revoke refresh token
    AuthPlugin->>DB: Delete session
    AuthPlugin-->>API: Respond success
    API-->>Client: Respond with revocation confirmation
```

## Cloudflare Configuration

This template is configured to deploy to Cloudflare Pages with D1 Database and KV storage.

### Local Development

For local development, the template uses Wrangler to emulate Cloudflare's environment. The `platformProxy` option in the Astro config makes this seamless.

### Production Deployment

To deploy to Cloudflare Pages:

1. Create a new Pages project in the Cloudflare dashboard
2. Link it to your GitHub repository
3. Configure the build command: `pnpm build`
4. Configure the build directory: `dist`
5. Add your environment variables
6. Deploy!

## 📚 Learn More

- [Astro Documentation](https://docs.astro.build)
- [Better Auth Documentation](https://github.com/zenstackhq/better-auth)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Svelte Documentation](https://svelte.dev/docs)
- [Resend Documentation](https://resend.com/docs)
- [React Email](https://react.email/docs/introduction)

## Resources

- [Shadcn UI Blocks](https://www.shadcnui-blocks.com/)
