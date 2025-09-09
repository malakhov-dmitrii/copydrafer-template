"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Clock, FileText, Loader2, MessageSquare } from "lucide-react";
import React from "react";

interface LoadingStateProps {
	className?: string;
	message?: string;
}

// Full page loading state
export function PageLoader({ message = "Loading..." }: LoadingStateProps) {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
				<p className="mt-4 text-muted-foreground text-sm">{message}</p>
			</div>
		</div>
	);
}

// Draft editor skeleton
export function DraftEditorSkeleton({ className }: LoadingStateProps) {
	return (
		<div className={cn("flex h-full gap-4", className)}>
			{/* Left pane - Editor */}
			<div className="flex-1 space-y-4">
				{/* Toolbar skeleton */}
				<div className="flex items-center gap-2 border-b pb-2">
					<Skeleton className="h-8 w-8" />
					<Skeleton className="h-8 w-8" />
					<Skeleton className="h-8 w-8" />
					<div className="ml-auto flex gap-2">
						<Skeleton className="h-8 w-20" />
						<Skeleton className="h-8 w-20" />
					</div>
				</div>

				{/* Editor content skeleton */}
				<div className="space-y-3">
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-5/6" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-2/3" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-4/5" />
				</div>
			</div>

			{/* Right pane - AI Chat */}
			<div className="w-96 space-y-4">
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32" />
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex gap-2">
							<Skeleton className="h-8 w-8 rounded-full" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-4 w-1/2" />
							</div>
						</div>
						<div className="flex gap-2">
							<Skeleton className="h-8 w-8 rounded-full" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-5/6" />
								<Skeleton className="h-4 w-2/3" />
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

// Draft list skeleton
export function DraftListSkeleton({ className }: LoadingStateProps) {
	return (
		<div className={cn("space-y-4", className)}>
			{[...Array(5)].map((_, i) => (
				<Card key={i}>
					<CardHeader>
						<div className="flex items-start justify-between">
							<div className="space-y-2">
								<Skeleton className="h-5 w-48" />
								<Skeleton className="h-4 w-64" />
							</div>
							<Skeleton className="h-8 w-20" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-4 text-sm">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-24" />
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

// Version selector skeleton
export function VersionSelectorSkeleton({ className }: LoadingStateProps) {
	return (
		<div className={cn("space-y-2", className)}>
			<Skeleton className="h-10 w-full" />
			<div className="space-y-1">
				{[...Array(3)].map((_, i) => (
					<Skeleton key={i} className="h-8 w-full" />
				))}
			</div>
		</div>
	);
}

// Chat message skeleton
export function ChatMessageSkeleton({
	role = "user",
}: { role?: "user" | "assistant" }) {
	return (
		<div
			className={cn(
				"flex gap-3",
				role === "user" ? "justify-end" : "justify-start",
			)}
		>
			{role === "assistant" && <Skeleton className="h-8 w-8 rounded-full" />}
			<div
				className={cn(
					"max-w-[70%] space-y-2",
					role === "user" ? "items-end" : "items-start",
				)}
			>
				<Skeleton className="h-4 w-48" />
				<Skeleton className="h-4 w-36" />
				<Skeleton className="h-4 w-40" />
			</div>
			{role === "user" && <Skeleton className="h-8 w-8 rounded-full" />}
		</div>
	);
}

// Inline loading spinner
export function InlineLoader({ message, className }: LoadingStateProps) {
	return (
		<div className={cn("flex items-center gap-2", className)}>
			<Loader2 className="h-4 w-4 animate-spin" />
			{message && (
				<span className="text-muted-foreground text-sm">{message}</span>
			)}
		</div>
	);
}

// Button loading state
export function ButtonLoader({ className }: LoadingStateProps) {
	return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

// Save indicator
export function SaveIndicator({
	status,
	lastSaved,
}: {
	status: "idle" | "saving" | "saved" | "error";
	lastSaved?: Date;
}) {
	const getMessage = () => {
		switch (status) {
			case "saving":
				return "Saving...";
			case "saved":
				return lastSaved ? `Saved ${formatRelativeTime(lastSaved)}` : "Saved";
			case "error":
				return "Failed to save";
			default:
				return "";
		}
	};

	const getIcon = () => {
		switch (status) {
			case "saving":
				return <Loader2 className="h-3 w-3 animate-spin" />;
			case "saved":
				return <Clock className="h-3 w-3" />;
			case "error":
				return <AlertTriangle className="h-3 w-3 text-destructive" />;
			default:
				return null;
		}
	};

	if (status === "idle") return null;

	return (
		<div className="flex items-center gap-1.5 text-muted-foreground text-xs">
			{getIcon()}
			<span>{getMessage()}</span>
		</div>
	);
}

// AI generation indicator
export function AIGeneratingIndicator({
	message = "AI is thinking...",
}: LoadingStateProps) {
	return (
		<div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
			<div className="flex gap-1">
				<span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
				<span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
				<span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
			</div>
			<span className="text-primary text-sm">{message}</span>
		</div>
	);
}

// Content placeholder
export function ContentPlaceholder({
	icon: Icon = FileText,
	title = "No content yet",
	description,
	action,
}: {
	icon?: React.ElementType;
	title?: string;
	description?: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-center">
			<Icon className="mb-4 h-12 w-12 text-muted-foreground/50" />
			<h3 className="mb-2 font-medium text-lg">{title}</h3>
			{description && (
				<p className="mb-4 text-muted-foreground text-sm">{description}</p>
			)}
			{action}
		</div>
	);
}

// Loading overlay
export function LoadingOverlay({
	visible,
	message,
	fullscreen = false,
}: {
	visible: boolean;
	message?: string;
	fullscreen?: boolean;
}) {
	if (!visible) return null;

	return (
		<div
			className={cn(
				"absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
				fullscreen && "fixed",
			)}
		>
			<div className="text-center">
				<Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
				{message && (
					<p className="mt-2 text-muted-foreground text-sm">{message}</p>
				)}
			</div>
		</div>
	);
}

// Shimmer effect for loading cards
export function ShimmerCard({ className }: LoadingStateProps) {
	return (
		<Card className={cn("relative overflow-hidden", className)}>
			<div className="-translate-x-full absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
			<CardHeader>
				<Skeleton className="h-6 w-2/3" />
				<Skeleton className="mt-2 h-4 w-full" />
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-4/5" />
					<Skeleton className="h-4 w-3/4" />
				</div>
			</CardContent>
		</Card>
	);
}

// Utility function to format relative time
function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (seconds < 60) {
		return "just now";
	} else if (minutes < 60) {
		return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
	} else if (hours < 24) {
		return `${hours} hour${hours > 1 ? "s" : ""} ago`;
	} else {
		return date.toLocaleDateString();
	}
}

// Export a hook for managing loading states
export function useLoadingState(initialState = false) {
	const [isLoading, setIsLoading] = React.useState(initialState);
	const [loadingMessage, setLoadingMessage] = React.useState<string>("");

	const startLoading = React.useCallback((message?: string) => {
		setIsLoading(true);
		if (message) setLoadingMessage(message);
	}, []);

	const stopLoading = React.useCallback(() => {
		setIsLoading(false);
		setLoadingMessage("");
	}, []);

	const withLoading = React.useCallback(
		async <T,>(fn: () => Promise<T>, message?: string): Promise<T> => {
			startLoading(message);
			try {
				return await fn();
			} finally {
				stopLoading();
			}
		},
		[startLoading, stopLoading],
	);

	return {
		isLoading,
		loadingMessage,
		startLoading,
		stopLoading,
		withLoading,
	};
}

// Add missing import
import { AlertTriangle } from "lucide-react";
