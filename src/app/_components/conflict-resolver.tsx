"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Change, diffLines } from "diff";
import {
	AlertTriangle,
	Check,
	Clock,
	Cloud,
	Edit,
	FileText,
	GitBranch,
	GitMerge,
	User,
	X,
} from "lucide-react";
import React, { useState } from "react";

interface ConflictData {
	localContent: string;
	remoteContent: string;
	baseContent?: string;
	lastModified: Date;
	modifiedBy?: string;
}

interface ConflictResolverProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	conflict: ConflictData;
	onResolve: (
		resolution: "local" | "remote" | "merge",
		mergedContent?: string,
	) => Promise<void>;
	title?: string;
	description?: string;
}

export function ConflictResolver({
	open,
	onOpenChange,
	conflict,
	onResolve,
	title = "Content Conflict Detected",
	description = "Your local changes conflict with the latest version. Choose how to resolve this conflict.",
}: ConflictResolverProps) {
	const [resolution, setResolution] = useState<"local" | "remote" | "merge">(
		"local",
	);
	const [mergedContent, setMergedContent] = useState("");
	const [isResolving, setIsResolving] = useState(false);
	const [showDiff, setShowDiff] = useState(true);

	// Calculate diff
	const diff = React.useMemo(() => {
		return diffLines(conflict.remoteContent, conflict.localContent);
	}, [conflict.localContent, conflict.remoteContent]);

	// Handle resolution
	const handleResolve = async () => {
		setIsResolving(true);
		try {
			if (resolution === "merge" && !mergedContent) {
				// Initialize merged content with both versions
				const defaultMerged = `<<<<<<< LOCAL\n${conflict.localContent}\n=======\n${conflict.remoteContent}\n>>>>>>> REMOTE`;
				setMergedContent(defaultMerged);
				return;
			}

			await onResolve(
				resolution,
				resolution === "merge" ? mergedContent : undefined,
			);
			onOpenChange(false);
		} catch (error) {
			console.error("Failed to resolve conflict:", error);
		} finally {
			setIsResolving(false);
		}
	};

	// Calculate statistics
	const stats = React.useMemo(() => {
		const localWords = conflict.localContent.split(/\s+/).length;
		const remoteWords = conflict.remoteContent.split(/\s+/).length;
		const addedLines = diff.filter((part) => part.added).length;
		const removedLines = diff.filter((part) => part.removed).length;

		return {
			localWords,
			remoteWords,
			addedLines,
			removedLines,
			totalChanges: addedLines + removedLines,
		};
	}, [conflict, diff]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[80vh] max-w-4xl">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-warning" />
						<DialogTitle>{title}</DialogTitle>
					</div>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Conflict Info */}
					<Alert className="border-warning/50 bg-warning/10">
						<AlertTitle className="flex items-center justify-between">
							<span>Conflict Details</span>
							<Badge variant="outline" className="ml-2">
								{stats.totalChanges} changes
							</Badge>
						</AlertTitle>
						<AlertDescription className="mt-2">
							<div className="flex items-center gap-4 text-sm">
								<span className="flex items-center gap-1">
									<Clock className="h-3 w-3" />
									Last modified: {format(conflict.lastModified, "PPp")}
								</span>
								{conflict.modifiedBy && (
									<span className="flex items-center gap-1">
										<User className="h-3 w-3" />
										By: {conflict.modifiedBy}
									</span>
								)}
							</div>
						</AlertDescription>
					</Alert>

					{/* Resolution Options */}
					<RadioGroup
						value={resolution}
						onValueChange={(value: any) => setResolution(value)}
					>
						<div className="space-y-2">
							<div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent">
								<RadioGroupItem value="local" id="local" />
								<Label htmlFor="local" className="flex-1 cursor-pointer">
									<div className="flex items-center gap-2">
										<User className="h-4 w-4" />
										<span className="font-medium">Keep Local Changes</span>
									</div>
									<p className="mt-1 text-muted-foreground text-sm">
										Use your version ({stats.localWords} words)
									</p>
								</Label>
							</div>

							<div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent">
								<RadioGroupItem value="remote" id="remote" />
								<Label htmlFor="remote" className="flex-1 cursor-pointer">
									<div className="flex items-center gap-2">
										<Cloud className="h-4 w-4" />
										<span className="font-medium">Keep Remote Changes</span>
									</div>
									<p className="mt-1 text-muted-foreground text-sm">
										Use the server version ({stats.remoteWords} words)
									</p>
								</Label>
							</div>

							<div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent">
								<RadioGroupItem value="merge" id="merge" />
								<Label htmlFor="merge" className="flex-1 cursor-pointer">
									<div className="flex items-center gap-2">
										<GitMerge className="h-4 w-4" />
										<span className="font-medium">Merge Both Versions</span>
									</div>
									<p className="mt-1 text-muted-foreground text-sm">
										Manually combine both versions
									</p>
								</Label>
							</div>
						</div>
					</RadioGroup>

					{/* Content Preview */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label>Content Preview</Label>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowDiff(!showDiff)}
							>
								{showDiff ? "Hide" : "Show"} Differences
							</Button>
						</div>

						{resolution === "merge" ? (
							<div className="space-y-2">
								<Textarea
									value={mergedContent}
									onChange={(e) => setMergedContent(e.target.value)}
									placeholder="Merge both versions here..."
									className="min-h-[300px] font-mono text-sm"
								/>
								<p className="text-muted-foreground text-xs">
									Tip: Remove the conflict markers and combine the content as
									needed.
								</p>
							</div>
						) : (
							<Tabs defaultValue="side-by-side" className="w-full">
								<TabsList className="grid w-full grid-cols-2">
									<TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
									<TabsTrigger value="unified">Unified Diff</TabsTrigger>
								</TabsList>

								<TabsContent value="side-by-side" className="space-y-2">
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<div className="flex items-center gap-2 font-medium text-sm">
												<User className="h-3 w-3" />
												Local Version
											</div>
											<ScrollArea className="h-[250px] rounded-md border p-3">
												<pre className="whitespace-pre-wrap text-sm">
													{conflict.localContent}
												</pre>
											</ScrollArea>
										</div>

										<div className="space-y-2">
											<div className="flex items-center gap-2 font-medium text-sm">
												<Cloud className="h-3 w-3" />
												Remote Version
											</div>
											<ScrollArea className="h-[250px] rounded-md border p-3">
												<pre className="whitespace-pre-wrap text-sm">
													{conflict.remoteContent}
												</pre>
											</ScrollArea>
										</div>
									</div>
								</TabsContent>

								<TabsContent value="unified" className="space-y-2">
									<ScrollArea className="h-[300px] rounded-md border p-3">
										<div className="space-y-1">
											{showDiff &&
												diff.map((part, index) => (
													<div
														key={index}
														className={cn(
															"px-2 py-1 font-mono text-sm",
															part.added && "bg-green-100 dark:bg-green-900/30",
															part.removed && "bg-red-100 dark:bg-red-900/30",
														)}
													>
														<span className="mr-2">
															{part.added ? "+" : part.removed ? "-" : " "}
														</span>
														{part.value}
													</div>
												))}
											{!showDiff && (
												<pre className="whitespace-pre-wrap text-sm">
													{resolution === "local"
														? conflict.localContent
														: conflict.remoteContent}
												</pre>
											)}
										</div>
									</ScrollArea>
								</TabsContent>
							</Tabs>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isResolving}
					>
						Cancel
					</Button>
					<Button
						onClick={handleResolve}
						disabled={isResolving || (resolution === "merge" && !mergedContent)}
					>
						{isResolving ? (
							<>
								<span className="mr-2 animate-spin">⏳</span>
								Resolving...
							</>
						) : (
							<>
								<Check className="mr-2 h-4 w-4" />
								Apply{" "}
								{resolution === "local"
									? "Local"
									: resolution === "remote"
										? "Remote"
										: "Merged"}{" "}
								Version
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// Simple inline conflict indicator
export function ConflictIndicator({ onClick }: { onClick: () => void }) {
	return (
		<Button
			variant="destructive"
			size="sm"
			className="animate-pulse"
			onClick={onClick}
		>
			<AlertTriangle className="mr-1 h-3 w-3" />
			Resolve Conflict
		</Button>
	);
}

// Merge helper component
export function MergeHelper({
	local,
	remote,
	onMerge,
}: {
	local: string;
	remote: string;
	onMerge: (merged: string) => void;
}) {
	const [merged, setMerged] = useState("");
	const [mode, setMode] = useState<"manual" | "auto">("auto");

	const autoMerge = () => {
		// Simple auto-merge strategy: combine both with markers
		const mergedContent = `${local}\n\n--- Merged from remote ---\n\n${remote}`;
		setMerged(mergedContent);
		onMerge(mergedContent);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<Button
					variant={mode === "auto" ? "default" : "outline"}
					size="sm"
					onClick={() => {
						setMode("auto");
						autoMerge();
					}}
				>
					Auto Merge
				</Button>
				<Button
					variant={mode === "manual" ? "default" : "outline"}
					size="sm"
					onClick={() => setMode("manual")}
				>
					Manual Merge
				</Button>
			</div>

			{mode === "manual" && (
				<Textarea
					value={merged}
					onChange={(e) => {
						setMerged(e.target.value);
						onMerge(e.target.value);
					}}
					placeholder="Manually merge the content here..."
					className="min-h-[200px]"
				/>
			)}

			{mode === "auto" && merged && (
				<Alert>
					<Check className="h-4 w-4" />
					<AlertTitle>Auto-merged</AlertTitle>
					<AlertDescription>
						Both versions have been combined. You can switch to manual mode to
						edit further.
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
