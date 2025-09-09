"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Bug, Home, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: React.ErrorInfo | null;
	errorCount: number;
}

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ComponentType<{
		error: Error;
		errorInfo: React.ErrorInfo;
		reset: () => void;
	}>;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
	resetKeys?: Array<string | number>;
	resetOnPropsChange?: boolean;
	isolate?: boolean;
	level?: "page" | "component" | "critical";
}

export class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	private resetTimeoutId: NodeJS.Timeout | null = null;
	private previousResetKeys: Array<string | number> = [];

	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
			errorCount: 0,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return {
			hasError: true,
			error,
		};
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		const { onError } = this.props;

		// Log error to console in development
		if (process.env.NODE_ENV === "development") {
			console.error("ErrorBoundary caught an error:", error, errorInfo);
		}

		// Call custom error handler if provided
		if (onError) {
			onError(error, errorInfo);
		}

		// Update state with error info
		this.setState((prevState) => ({
			errorInfo,
			errorCount: prevState.errorCount + 1,
		}));

		// Log to error reporting service in production
		if (process.env.NODE_ENV === "production") {
			this.logErrorToService(error, errorInfo);
		}

		// Auto-reset after 3 errors to prevent infinite loops
		if (this.state.errorCount >= 3) {
			this.scheduleReset(5000);
		}
	}

	componentDidUpdate(prevProps: ErrorBoundaryProps) {
		const { resetKeys, resetOnPropsChange } = this.props;
		const { hasError } = this.state;

		// Reset on prop changes if enabled
		if (
			hasError &&
			resetOnPropsChange &&
			prevProps.children !== this.props.children
		) {
			this.resetErrorBoundary();
		}

		// Reset when resetKeys change
		if (hasError && resetKeys && this.previousResetKeys !== resetKeys) {
			const hasResetKeyChanged = resetKeys.some(
				(key, index) => key !== this.previousResetKeys[index],
			);

			if (hasResetKeyChanged) {
				this.resetErrorBoundary();
			}
		}

		this.previousResetKeys = resetKeys || [];
	}

	componentWillUnmount() {
		if (this.resetTimeoutId) {
			clearTimeout(this.resetTimeoutId);
		}
	}

	logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
		// In production, this would send to Sentry, LogRocket, etc.
		const errorData = {
			message: error.message,
			stack: error.stack,
			componentStack: errorInfo.componentStack,
			timestamp: new Date().toISOString(),
			url: typeof window !== "undefined" ? window.location.href : "unknown",
			userAgent:
				typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
		};

		// Example: Send to error tracking service
		// fetch('/api/errors', {
		//   method: 'POST',
		//   headers: { 'Content-Type': 'application/json' },
		//   body: JSON.stringify(errorData),
		// });

		console.error("Error logged:", errorData);
	};

	scheduleReset = (delay: number) => {
		if (this.resetTimeoutId) {
			clearTimeout(this.resetTimeoutId);
		}

		this.resetTimeoutId = setTimeout(() => {
			this.resetErrorBoundary();
		}, delay);
	};

	resetErrorBoundary = () => {
		if (this.resetTimeoutId) {
			clearTimeout(this.resetTimeoutId);
			this.resetTimeoutId = null;
		}

		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
			errorCount: 0,
		});
	};

	render() {
		const { hasError, error, errorInfo } = this.state;
		const { fallback: Fallback, children, level = "component" } = this.props;

		if (hasError && error) {
			// Use custom fallback if provided
			if (Fallback) {
				return (
					<Fallback
						error={error}
						errorInfo={errorInfo!}
						reset={this.resetErrorBoundary}
					/>
				);
			}

			// Default error UI based on level
			switch (level) {
				case "critical":
					return (
						<CriticalErrorFallback
							error={error}
							reset={this.resetErrorBoundary}
						/>
					);
				case "page":
					return (
						<PageErrorFallback error={error} reset={this.resetErrorBoundary} />
					);
				default:
					return (
						<ComponentErrorFallback
							error={error}
							reset={this.resetErrorBoundary}
						/>
					);
			}
		}

		return children;
	}
}

// Critical Error Fallback - Full page error
function CriticalErrorFallback({
	error,
	reset,
}: { error: Error; reset: () => void }) {
	const router = useRouter();

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-6 w-6 text-destructive" />
						<CardTitle>Critical Error</CardTitle>
					</div>
					<CardDescription>
						The application encountered a critical error and cannot continue.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Alert variant="destructive">
						<AlertTitle>Error Details</AlertTitle>
						<AlertDescription className="mt-2 font-mono text-xs">
							{error.message}
						</AlertDescription>
					</Alert>

					<div className="flex gap-2">
						<Button onClick={reset} variant="default" className="flex-1">
							<RefreshCw className="mr-2 h-4 w-4" />
							Try Again
						</Button>
						<Button
							onClick={() => router.push("/")}
							variant="outline"
							className="flex-1"
						>
							<Home className="mr-2 h-4 w-4" />
							Go Home
						</Button>
					</div>

					{process.env.NODE_ENV === "development" && (
						<details className="mt-4">
							<summary className="cursor-pointer text-muted-foreground text-sm">
								Stack Trace (Development Only)
							</summary>
							<pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
								{error.stack}
							</pre>
						</details>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

// Page Error Fallback - Page-level error
function PageErrorFallback({
	error,
	reset,
}: { error: Error; reset: () => void }) {
	return (
		<div className="container mx-auto p-8">
			<Alert variant="destructive" className="mx-auto max-w-2xl">
				<AlertTriangle className="h-4 w-4" />
				<AlertTitle>Page Error</AlertTitle>
				<AlertDescription className="mt-2">
					<p>
						{error.message || "Something went wrong while loading this page."}
					</p>
					<div className="mt-4 flex gap-2">
						<Button onClick={reset} size="sm" variant="outline">
							<RefreshCw className="mr-2 h-3 w-3" />
							Retry
						</Button>
						<Button
							onClick={() => (window.location.href = "/")}
							size="sm"
							variant="outline"
						>
							<Home className="mr-2 h-3 w-3" />
							Home
						</Button>
					</div>
				</AlertDescription>
			</Alert>
		</div>
	);
}

// Component Error Fallback - Component-level error
function ComponentErrorFallback({
	error,
	reset,
}: { error: Error; reset: () => void }) {
	return (
		<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
			<div className="flex items-start gap-2">
				<AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
				<div className="flex-1">
					<p className="font-medium text-destructive text-sm">
						Component Error
					</p>
					<p className="mt-1 text-muted-foreground text-xs">
						{error.message || "This component failed to load properly."}
					</p>
					<Button
						onClick={reset}
						size="sm"
						variant="ghost"
						className="mt-2 h-7 px-2 text-xs"
					>
						<RefreshCw className="mr-1 h-3 w-3" />
						Retry
					</Button>
				</div>
			</div>
		</div>
	);
}

// Async Error Boundary for handling async errors
export function AsyncErrorBoundary({
	children,
}: { children: React.ReactNode }) {
	return (
		<ErrorBoundary
			level="component"
			onError={(error, errorInfo) => {
				// Log async errors
				console.error("Async error:", error, errorInfo);
			}}
			resetOnPropsChange
		>
			{children}
		</ErrorBoundary>
	);
}

// Hook for using error boundary programmatically
export function useErrorHandler() {
	const [error, setError] = React.useState<Error | null>(null);

	React.useEffect(() => {
		if (error) {
			throw error;
		}
	}, [error]);

	const resetError = React.useCallback(() => {
		setError(null);
	}, []);

	const captureError = React.useCallback((error: Error) => {
		setError(error);
	}, []);

	return { captureError, resetError };
}
