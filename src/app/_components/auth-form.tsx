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
	const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
					setMessage({ type: "error", text: error.message || "Failed to send magic link" });
				} else {
					setMessage({ type: "success", text: "Check your email for the magic link!" });
					setEmail("");
				}
			} else if (mode === "signin") {
				// Sign in with email and password
				const { error } = await signIn.email({
					email,
					password,
				});

				if (error) {
					setMessage({ type: "error", text: error.message || "Invalid email or password" });
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
					setMessage({ type: "error", text: error.message || "Failed to create account" });
				} else {
					// Successful sign up - the page will reload/redirect
					window.location.href = "/";
				}
			}
		} catch (error) {
			setMessage({ type: "error", text: "An unexpected error occurred" });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="w-full max-w-md mx-auto">
			<div className="bg-white/10 backdrop-blur-sm rounded-lg p-8">
				{/* Mode Selector */}
				<div className="flex rounded-lg bg-white/5 p-1 mb-6">
					<button
						type="button"
						onClick={() => setMode("signin")}
						className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
							mode === "signin"
								? "bg-white/20 text-white"
								: "text-white/70 hover:text-white"
						}`}
					>
						Sign In
					</button>
					<button
						type="button"
						onClick={() => setMode("signup")}
						className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
							mode === "signup"
								? "bg-white/20 text-white"
								: "text-white/70 hover:text-white"
						}`}
					>
						Sign Up
					</button>
					<button
						type="button"
						onClick={() => setMode("magiclink")}
						className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
							mode === "magiclink"
								? "bg-white/20 text-white"
								: "text-white/70 hover:text-white"
						}`}
					>
						Magic Link
					</button>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					{mode === "signup" && (
						<div>
							<label htmlFor="name" className="block text-sm font-medium text-white/90 mb-1">
								Name
							</label>
							<input
								id="name"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required={mode === "signup"}
								className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
								placeholder="John Doe"
							/>
						</div>
					)}

					<div>
						<label htmlFor="email" className="block text-sm font-medium text-white/90 mb-1">
							Email
						</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
							placeholder="you@example.com"
						/>
					</div>

					{mode !== "magiclink" && (
						<div>
							<label htmlFor="password" className="block text-sm font-medium text-white/90 mb-1">
								Password
							</label>
							<input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
								placeholder="••••••••"
							/>
						</div>
					)}

					{/* Message Display */}
					{message && (
						<div
							className={`p-3 rounded-md text-sm ${
								message.type === "success"
									? "bg-green-500/20 text-green-100 border border-green-500/30"
									: "bg-red-500/20 text-red-100 border border-red-500/30"
							}`}
						>
							{message.text}
						</div>
					)}

					{/* Submit Button */}
					<button
						type="submit"
						disabled={isLoading}
						className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
					>
						{isLoading ? (
							<span className="flex items-center justify-center">
								<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
								type="button"
								onClick={() => setMode("signup")}
								className="text-purple-400 hover:text-purple-300"
							>
								Sign up
							</button>
						</>
					) : (
						<>
							Already have an account?{" "}
							<button
								type="button"
								onClick={() => setMode("signin")}
								className="text-purple-400 hover:text-purple-300"
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
