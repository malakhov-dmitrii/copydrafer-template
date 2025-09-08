"use client";

import { signOut } from "@/lib/auth-client";
import { LogOut } from "lucide-react";

export function AuthButton({
	variant = "default",
}: { variant?: "default" | "compact" }) {
	if (variant === "compact") {
		return (
			<button
				onClick={async () => {
					await signOut();
					window.location.href = "/";
				}}
				className="p-2 text-muted-foreground transition-colors hover:text-foreground"
				title="Sign out"
			>
				<LogOut className="h-4 w-4" />
			</button>
		);
	}

	return (
		<button
			onClick={async () => {
				await signOut();
				window.location.href = "/";
			}}
			className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
		>
			Sign out
		</button>
	);
}
