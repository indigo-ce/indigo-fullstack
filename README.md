# Astro Starter Kit with Better Auth and Drizzle ORM

This starter kit integrates Astro with Better Auth for authentication and Drizzle ORM for database operations. It includes a complete authentication system with sign-up, sign-in, and user profile functionality.

## 🚀 Features

- **User Authentication**: Complete authentication flow with Better Auth
- **Database Integration**: SQLite database with Drizzle ORM
- **Server-side Rendering**: Full SSR support with Astro
- **Type Safety**: Built with TypeScript for better developer experience

## 📁 Project Structure

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── Welcome.astro
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   ├── auth-client.ts
│   │   └── auth.ts
│   ├── pages/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...all].ts
│   │   ├── signin/
│   │   │   └── index.astro
│   │   ├── signup/
│   │   │   └── index.astro
│   │   └── index.astro
│   └── middleware.ts
├── .env.example
├── astro.config.mjs
├── drizzle.config.ts
├── env.d.ts
└── package.json
```

## 🛠️ Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/astro-starter.git
   cd astro-starter
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Start the development server**:
   ```bash
   pnpm dev
   ```

## 🧞 Commands

| Command                  | Action                                           |
| :----------------------- | :----------------------------------------------- |
| `pnpm install`           | Installs dependencies                            |
| `pnpm dev`               | Starts local dev server with DB setup            |
| `pnpm build`             | Build your production site with DB setup         |
| `pnpm preview`           | Preview your build locally                       |
| `pnpm db-setup`          | Generate and push Drizzle migrations             |

## 🔐 Authentication Flow

1. **Sign Up**: Users can create an account with name, email, and password
2. **Sign In**: Users can log in with their email and password
3. **Protected Routes**: The home page is protected and requires authentication
4. **Sign Out**: Users can log out from their account

## 🗄️ Database

The application uses SQLite with Drizzle ORM. The database schema includes:

- Users
- Sessions
- Accounts
- Verification tokens

## 📚 Learn More

- [Astro Documentation](https://docs.astro.build)
- [Better Auth Documentation](https://github.com/zenstackhq/better-auth)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
