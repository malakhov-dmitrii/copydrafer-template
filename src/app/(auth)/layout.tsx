import { auth } from "@/server/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	// Redirect to dashboard if already authenticated
	if (session?.user) {
		redirect("/dashboard");
	}

	return (
		<div className="flex min-h-screen flex-col bg-background">
			{/* Simple Header */}
			<header className="p-6">
				<Link href="/" className="inline-flex items-center space-x-2">
					<div className="h-8 w-8 rounded-lg bg-primary"></div>
					<span className="font-bold text-foreground text-xl">Copydrafer</span>
				</Link>
			</header>

			{/* Main Content */}
			<main className="flex flex-1 items-center justify-center px-4 py-12">
				<div className="w-full max-w-md">{children}</div>
			</main>

			{/* Simple Footer */}
			<footer className="p-6 text-center">
				<p className="text-muted-foreground text-sm">
					© 2024 Copydrafer. All rights reserved.
				</p>
			</footer>
		</div>
	);
}
