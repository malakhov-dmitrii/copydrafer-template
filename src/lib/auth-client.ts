import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client for authentication operations.
 * Provides hooks and methods for client-side authentication.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  plugins: [magicLinkClient()],
});

// Export authentication functions for use in components
export const { signIn, signOut, useSession, signUp, magicLink } = authClient;
