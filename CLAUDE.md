# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application built with the T3 Stack, featuring Better Auth for authentication, Drizzle ORM for database operations, tRPC for type-safe API routes, and Tailwind CSS v4 for styling. This project serves as a boilerplate/template that can be used as a foundation for multiple projects.

## Quick Start

1. **Clone and install dependencies**:
   ```bash
   npm install  # or bun install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and fill in required values (DATABASE_URL, RESEND_API_KEY, AUTH_SECRET for production)
   ```

3. **Start local database** (optional, if using Docker):
   ```bash
   ./start-database.sh
   ```

4. **Push database schema**:
   ```bash
   npm run db:push
   ```

5. **Start development server**:
   ```bash
   npm run dev
   # Access at http://localhost:3005 (note: port 3005, not 3000)
   ```

## Package Manager Support

This project supports both **npm** and **Bun**:
- **npm**: Uses `package-lock.json`
- **Bun**: Uses `bun.lockb` (present in repo)

Choose one and stick with it for your project to avoid lock file conflicts.

## Key Commands

### Development
```bash
npm run dev        # Start development server with Turbo
npm run preview    # Build and start production preview
npm run build      # Build for production
npm run start      # Start production server
```

### Code Quality
```bash
npm run check          # Run Biome linter/formatter check
npm run check:write    # Run Biome with auto-fix (safe fixes only)
npm run check:unsafe   # Run Biome with auto-fix (including unsafe fixes)
npm run typecheck      # Run TypeScript type checking
```

### Database Operations
```bash
./start-database.sh    # Start local PostgreSQL via Docker (optional)
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Apply migrations to database
npm run db:push        # Push schema changes directly to database
npm run db:studio      # Open Drizzle Studio for database management
```

### Testing Individual Components
To test authentication flows or specific features, start the dev server and navigate to:
- Main app: http://localhost:3005
- Database studio: Run `npm run db:studio` and open http://localhost:4983

## Architecture Overview

### Route Structure

The app uses Next.js 15 App Router with route groups for logical separation:

- **`(marketing)/`**: Public marketing pages (landing page, about, etc.)
- **`(auth)/`**: Authentication flows
  - `/sign-in`: Email/password and magic link sign-in
  - `/sign-up`: User registration
- **`(dashboard)/`**: Protected application area requiring authentication
- **`onboarding/`**: User onboarding flow

Protected routes are defined in `src/middleware.ts`. The middleware:
- Checks session status via Better Auth
- Redirects unauthenticated users to `/sign-in` with callback URL
- Redirects authenticated users away from auth pages to `/dashboard`

### Authentication System
The app uses Better Auth (replaced NextAuth) with two authentication methods:
- **Email/Password**: Traditional credentials-based auth
- **Magic Links**: Passwordless email authentication with 5-minute expiry

Key files:
- `src/server/auth/config.ts`: Better Auth configuration with Resend email integration
- `src/lib/auth-client.ts`: Client-side auth utilities
- `src/app/_components/auth-form.tsx`: Main authentication UI component
- `src/app/api/auth/[...all]/route.ts`: Auth API route handler

### Database Architecture
Uses PostgreSQL with Drizzle ORM. Schema includes:
- **users**: User accounts with email verification
- **sessions**: Active user sessions with IP/user agent tracking
- **accounts**: OAuth provider accounts (for future expansion)
- **verification**: Magic link and email verification tokens
- **posts**: Example content table with user relationships

Key files:
- `src/server/db/schema.ts`: Complete database schema
- `src/server/db/index.ts`: Database connection
- `drizzle.config.ts`: Drizzle configuration

### API Layer (tRPC)
Type-safe API using tRPC with React Query integration:
- **Public procedures**: Accessible without authentication
- **Protected procedures**: Require authenticated session
- Includes timing middleware for development debugging

Key files:
- `src/server/api/trpc.ts`: tRPC context and procedure definitions
- `src/server/api/root.ts`: Root router combining all API routes
- `src/server/api/routers/`: Individual API routers
- `src/trpc/`: Client-side tRPC setup

### Environment Configuration
Uses @t3-oss/env-nextjs for type-safe environment variables with Zod validation.

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `AUTH_SECRET`: Authentication secret (required in production)
- `RESEND_API_KEY`: Resend API key for email sending
- `RESEND_FROM_EMAIL`: Sender email address (defaults to noreply@mlh.one)
- `NEXT_PUBLIC_BASE_URL`: Base URL for the application (optional)

### Code Style and Quality
- **Formatter/Linter**: Biome for code formatting and linting (configured via Ultracite preset in `.claude/CLAUDE.md`)
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **Import Organization**: Automatic import sorting via Biome
- **CSS**: Tailwind CSS v4 with PostCSS

### UI Component System

The project uses **shadcn/ui** components built on **Radix UI** primitives:

- **48+ pre-built components** in `src/components/ui/`
- Configured via `components.json` (New York style variant)
- Built on Radix UI for accessibility and unstyled primitives
- Styled with Tailwind CSS v4 with custom design tokens
- Icons via Lucide React

**Common utility:**
- `cn()` from `@/lib/utils.ts`: Merges Tailwind classes with conflict resolution using `clsx` and `tailwind-merge`

**Adding new shadcn components:**
```bash
npx shadcn@latest add [component-name]
```

**Component organization:**
- `src/components/ui/`: shadcn/ui components
- `src/components/dashboard/`: Dashboard-specific components
- `src/components/editor/`: Editor components
- `src/components/onboarding/`: Onboarding flow components
- `src/app/_components/`: Shared app-level components

## Development Workflow

### Adding New Features
1. Create database schema changes in `src/server/db/schema.ts`
2. Generate and apply migrations: `npm run db:generate && npm run db:push`
3. Add tRPC router in `src/server/api/routers/`
4. Import router in `src/server/api/root.ts`
5. Use the router in React components via tRPC hooks

### Authentication Integration
- Server-side: Use `auth.api.getSession()` in tRPC procedures
- Client-side: Use hooks from `src/lib/auth-client.ts`
- Protected routes: Wrap procedures with `protectedProcedure`

### Client-Side Authentication Usage

Import auth utilities from `@/lib/auth-client` for client-side authentication:

```typescript
import { signIn, signOut, signUp, useSession, magicLink } from "@/lib/auth-client";

// In a component
export function MyComponent() {
  const { data: session } = useSession();

  // Sign in with email/password
  await signIn.email({
    email,
    password,
    callbackURL: "/dashboard"
  });

  // Sign up new user
  await signUp.email({
    email,
    password,
    name
  });

  // Send magic link
  await signIn.magicLink({
    email,
    callbackURL: "/dashboard"
  });

  // Sign out
  await signOut();
}
```

### Database Queries
Always use Drizzle ORM through the `db` instance from `src/server/db/index.ts`. The schema uses a prefix pattern (`copydrafer_*` for tables) to support multi-project databases.

### Database Schema Conventions

The project uses a **dual naming approach** for database tables:

1. **Auth tables** (managed by Better Auth):
   - Standard names: `user`, `session`, `account`, `verification`
   - Use `snake_case` for column names (e.g., `email_verified`, `user_agent`, `created_at`)
   - **⚠️ IMPORTANT**: Do NOT rename or modify these table structures without careful consideration
   - These tables are required by Better Auth and follow its conventions

2. **Application tables**:
   - Use `copydrafer_` prefix (or rename based on your project needs)
   - Example: The `posts` table is defined as `"post"` but stored with prefix
   - Configured in `drizzle.config.ts` via `tablesFilter: ["copydrafer_*"]`
   - When creating new tables, follow the prefix pattern for application data

**Best practices:**
- Keep auth-related tables unchanged to ensure Better Auth compatibility
- Use the project prefix for all custom application tables
- When forking this template, consider renaming the prefix to match your project name
- Maintain `snake_case` for consistency with the auth schema

## Important Notes

- **React 19**: This project uses React 19 with modern patterns (function components, hooks, Server/Client component separation)
- **Sessions**: Stored in the database (not JWT-based) for better security and session management
- **Magic Links**: Sent via Resend with custom HTML templates and 5-minute expiry
- **Development Delay**: Includes artificial delay (100-400ms) for tRPC calls in development to simulate network latency
- **Database Prefixes**: All application tables use the `copydrafer_` prefix; auth tables use standard names
- **Tailwind Sorting**: Biome automatically sorts Tailwind classes when using utility functions like `clsx`, `cva`, or `cn`
- **Code Standards**: Follow Ultracite code standards documented in `.claude/CLAUDE.md` for consistent formatting and best practices
- **Template Usage**: This is a boilerplate project - when forking, consider renaming the `copydrafer_` prefix to match your project name