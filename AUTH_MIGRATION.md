# Authentication Migration Guide

## Overview

This project has been migrated from NextAuth.js to Better Auth with the following authentication methods:
- **Email/Password**: Traditional credentials-based authentication
- **Magic Link**: Passwordless authentication via email

## Setup

### Environment Variables

Create a `.env` file with the following variables:

```env
# Authentication secret
AUTH_SECRET="your-secret-here"  # Generate with: openssl rand -base64 32

# Resend API for sending emails
RESEND_API_KEY="re_xxx"  # Get from https://resend.com

# Email sender (optional, defaults to onboarding@resend.dev)
EMAIL_FROM="noreply@yourdomain.com"

# Base URL (optional, defaults to http://localhost:3000)
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

### Database Setup

Run the following commands to set up the database:

```bash
# Generate database migrations
npm run db:generate

# Apply migrations to database
npm run db:push

# View database in browser (optional)
npm run db:studio
```

## Authentication Methods

### 1. Email/Password Authentication

Users can sign up and sign in using their email and password.

- **Sign Up**: Creates a new account with email, password, and optional name
- **Sign In**: Authenticates with email and password

### 2. Magic Link Authentication

Passwordless authentication using email links.

- **How it works**:
  1. User enters their email address
  2. System sends a magic link to their email
  3. User clicks the link to sign in automatically
  4. Link expires after 5 minutes

### 3. Session Management

- Sessions are stored in the database
- Sessions persist across browser restarts
- Sign out clears the session

## Components

### AuthForm Component

The main authentication form (`src/app/_components/auth-form.tsx`) provides:
- Tab-based interface for switching between Sign In, Sign Up, and Magic Link
- Form validation and error handling
- Loading states and user feedback

### AuthButton Component

Simple sign-out button (`src/app/_components/auth-button.tsx`) for authenticated users.

## API Routes

- `/api/auth/[...all]` - Handles all authentication requests

## Database Schema

The authentication system uses the following tables:
- `users` - User accounts with email, password (hashed), and profile info
- `sessions` - Active user sessions
- `accounts` - OAuth provider accounts (for future expansion)
- `verification_tokens` - Magic link and email verification tokens

## Security Notes

- Passwords are automatically hashed using Better Auth's secure hashing
- Magic links expire after 5 minutes
- Sessions are secure and HTTP-only
- CSRF protection is built-in

## Customization

### Email Templates

To customize the magic link email, edit the `sendMagicLink` function in `src/server/auth/config.ts`.

### Authentication Flow

To modify the authentication flow or add new providers, update:
- Server config: `src/server/auth/config.ts`
- Client config: `src/lib/auth-client.ts`

## Troubleshooting

### Common Issues

1. **Magic link not sending**: Check your Resend API key and email configuration
2. **Database errors**: Ensure migrations are up to date with `npm run db:push`
3. **Session not persisting**: Check that cookies are enabled and BASE_URL is correct

## Migration from NextAuth

Key changes from the NextAuth implementation:
- Route changed from `/api/auth/[...nextauth]` to `/api/auth/[...all]`
- Session retrieval uses `auth.api.getSession()` instead of `auth()`
- Client-side hooks from Better Auth instead of NextAuth
- Discord provider replaced with email/password and magic link
