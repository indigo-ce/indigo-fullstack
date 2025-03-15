# Astro Starter Kit with Better Auth and Drizzle ORM

This starter kit integrates Astro with Better Auth for authentication and Drizzle ORM for database operations. It includes a complete authentication system with sign-up, sign-in, and user profile functionality.

## 🚀 Features

- **User Authentication**: Complete authentication flow with Better Auth
- **Database Integration**: SQLite database with Drizzle ORM
- **Server-side Rendering**: Full SSR support with Astro
- **Type Safety**: Built with TypeScript for better developer experience

## 🛠️ Getting Started

1. **Clone the repository**:

```bash
git clone https://github.com/yourusername/astro-starter.git
cd astro-starter
```

1. **Install dependencies**:

```bash
pnpm install
```

1. **Set up environment variables**:

```bash
cp .env.example .env
```

1. **Start the development server**:

```bash
pnpm dev
```

## 🧞 Commands

| Command         | Action                                   |
| :-------------- | :--------------------------------------- |
| `pnpm install`  | Installs dependencies                    |
| `pnpm dev`      | Starts local dev server with DB setup    |
| `pnpm build`    | Build your production site with DB setup |
| `pnpm preview`  | Preview your build locally               |
| `pnpm db-setup` | Generate and push Drizzle migrations     |

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
- Todos (user tasks)

## 📊 Database Queries

Here's an example of how to fetch a user's todos from the database using Drizzle ORM:

```typescript
import {eq} from "drizzle-orm";
import {db} from "@/db";
import {todo, user} from "@/db/schema";

// Fetch all todos for a user
const todos = await db
  .select()
  .from(todo)
  .where(eq(todo.userId, currentUserId));

// Create a new todo
const newTodo = await db
  .insert(todo)
  .values({
    title: "Build an Astro app",
    completed: false,
    userId: currentUserId,
  })
  .returning();

// Update todo status
await db.update(todo).set({completed: true}).where(eq(todo.id, todoId));

// Delete a todo
await db.delete(todo).where(eq(todo.id, todoId));

// Join example: Fetch todos with user info
const todosWithUser = await db
  .select({
    id: todo.id,
    title: todo.title,
    userName: user.name,
  })
  .from(todo)
  .leftJoin(user, eq(todo.userId, user.id))
  .where(eq(todo.userId, currentUserId));
```

## 📚 Learn More

- [Astro Documentation](https://docs.astro.build)
- [Better Auth Documentation](https://github.com/zenstackhq/better-auth)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
