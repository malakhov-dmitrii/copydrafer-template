# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application built with the T3 Stack, featuring Better Auth for authentication, Drizzle ORM for database operations, tRPC for type-safe API routes, and Tailwind CSS v4 for styling.

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
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Apply migrations to database
npm run db:push        # Push schema changes directly to database
npm run db:studio      # Open Drizzle Studio for database management
```

### Testing Individual Components
To test authentication flows or specific features, start the dev server and navigate to:
- Main app: http://localhost:3000
- Database studio: Run `npm run db:studio` and open http://localhost:4983

## Architecture Overview

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
- **Formatter/Linter**: Biome for code formatting and linting
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **Import Organization**: Automatic import sorting via Biome
- **CSS**: Tailwind CSS v4 with PostCSS

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

### Database Queries
Always use Drizzle ORM through the `db` instance from `src/server/db/index.ts`. The schema uses a prefix pattern (`copydrafer_*` for tables) to support multi-project databases.

## Important Notes

- Sessions are stored in the database (not JWT-based)
- Magic link emails are sent via Resend with custom HTML templates
- The project includes artificial delay in development for tRPC calls to simulate network latency
- All database tables except auth tables use the `copydrafer_` prefix
- Biome is configured to sort Tailwind classes when using utility functions like `clsx`, `cva`, or `cn`