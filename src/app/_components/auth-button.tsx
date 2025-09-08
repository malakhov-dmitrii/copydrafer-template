"use client";

import { signOut } from "@/lib/auth-client";

export function AuthButton() {
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
