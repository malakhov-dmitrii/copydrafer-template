import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";
import { env } from "@/env";
import { db } from "@/server/db";

// Initialize Resend client
const resend = new Resend(env.RESEND_API_KEY);

/**
 * Better Auth configuration with credentials and magic link authentication.
 * Maps existing database columns to Better Auth's expected structure.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }, _request) => {
        try {
          const { error } = await resend.emails.send({
            from: env.RESEND_FROM_EMAIL,
            to: [email],
            subject: "Sign in to your account",
            html: `
							<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
								<h2>Sign in to your account</h2>
								<p>Click the link below to sign in to your account:</p>
								<a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #2e026d; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">Sign In</a>
								<p>If you didn't request this email, you can safely ignore it.</p>
								<p>This link will expire in 5 minutes.</p>
							</div>
						`,
          });

          if (error) {
            console.error("Failed to send magic link email:", error);
            throw new Error("Failed to send magic link email");
          }
        } catch (error) {
          console.error("Error sending magic link:", error);
          throw error;
        }
      },
      expiresIn: 300, // 5 minutes
      disableSignUp: false, // Allow users to sign up with magic link
    }),
  ],
  baseURL: env.NEXT_PUBLIC_BASE_URL || "http://localhost:3005",
  secret: env.AUTH_SECRET || "development-secret-change-me",
});
