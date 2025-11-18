"use client";

import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-client";

type AuthMode = "signin" | "signup" | "magiclink";

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (mode === "magiclink") {
        // Send magic link
        const { error } = await signIn.magicLink({
          email,
          callbackURL: "/dashboard",
        });

        if (error) {
          setMessage({
            type: "error",
            text: error.message || "Failed to send magic link",
          });
        } else {
          setMessage({
            type: "success",
            text: "Check your email for the magic link!",
          });
          setEmail("");
        }
      } else if (mode === "signin") {
        // Sign in with email and password
        const { error } = await signIn.email({
          email,
          password,
        });

        if (error) {
          setMessage({
            type: "error",
            text: error.message || "Invalid email or password",
          });
        } else {
          // Successful sign in - the page will reload/redirect
          window.location.href = "/";
        }
      } else {
        // Sign up with email and password
        const { error } = await signUp.email({
          email,
          password,
          name,
        });

        if (error) {
          setMessage({
            type: "error",
            text: error.message || "Failed to create account",
          });
        } else {
          // Successful sign up - the page will reload/redirect
          window.location.href = "/";
        }
      }
    } catch (_error) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-lg bg-white/10 p-8 backdrop-blur-sm">
        {/* Mode Selector */}
        <div className="mb-6 flex rounded-lg bg-white/5 p-1">
          <button
            className={`flex-1 rounded-md px-4 py-2 font-medium text-sm transition-colors ${
              mode === "signin"
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white"
            }`}
            onClick={() => setMode("signin")}
            type="button"
          >
            Sign In
          </button>
          <button
            className={`flex-1 rounded-md px-4 py-2 font-medium text-sm transition-colors ${
              mode === "signup"
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white"
            }`}
            onClick={() => setMode("signup")}
            type="button"
          >
            Sign Up
          </button>
          <button
            className={`flex-1 rounded-md px-4 py-2 font-medium text-sm transition-colors ${
              mode === "magiclink"
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white"
            }`}
            onClick={() => setMode("magiclink")}
            type="button"
          >
            Magic Link
          </button>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div>
              <label
                className="mb-1 block font-medium text-sm text-white/90"
                htmlFor="name"
              >
                Name
              </label>
              <input
                className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                id="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required={mode === "signup"}
                type="text"
                value={name}
              />
            </div>
          )}

          <div>
            <label
              className="mb-1 block font-medium text-sm text-white/90"
              htmlFor="email"
            >
              Email
            </label>
            <input
              className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </div>

          {mode !== "magiclink" && (
            <div>
              <label
                className="mb-1 block font-medium text-sm text-white/90"
                htmlFor="password"
              >
                Password
              </label>
              <input
                className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                id="password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                type="password"
                value={password}
              />
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div
              className={`rounded-md p-3 text-sm ${
                message.type === "success"
                  ? "border border-green-500/30 bg-green-500/20 text-green-100"
                  : "border border-red-500/30 bg-red-500/20 text-red-100"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Submit Button */}
          <button
            className="w-full rounded-md bg-purple-600 px-4 py-3 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    fill="currentColor"
                  />
                </svg>
                Processing...
              </span>
            ) : mode === "magiclink" ? (
              "Send Magic Link"
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Helper Text */}
        <p className="mt-4 text-center text-sm text-white/60">
          {mode === "magiclink" ? (
            "We'll send you a link to sign in instantly"
          ) : mode === "signin" ? (
            <>
              Don't have an account?{" "}
              <button
                className="text-purple-400 hover:text-purple-300"
                onClick={() => setMode("signup")}
                type="button"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                className="text-purple-400 hover:text-purple-300"
                onClick={() => setMode("signin")}
                type="button"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
