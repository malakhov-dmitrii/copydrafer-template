import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Define protected routes
	const protectedRoutes = ["/dashboard"];
	const authRoutes = ["/sign-in", "/sign-up"];

	// Check if the current path is protected
	const isProtectedRoute = protectedRoutes.some((route) =>
		pathname.startsWith(route),
	);
	const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

	// Get session
	const { data: session } = await betterFetch<Session>(
		"/api/auth/get-session",
		{
			baseURL: request.nextUrl.origin,
			headers: {
				cookie: request.headers.get("cookie") || "",
			},
		},
	);

	// Redirect logic
	if (isProtectedRoute && !session) {
		// Redirect to sign-in if accessing protected route without session
		const url = new URL("/sign-in", request.url);
		url.searchParams.set("callbackUrl", pathname);
		return NextResponse.redirect(url);
	}

	if (isAuthRoute && session) {
		// Redirect to dashboard if accessing auth routes with active session
		const url = new URL("/dashboard", request.url);
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - api routes
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public files (public folder)
		 */
		"/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)",
	],
};
