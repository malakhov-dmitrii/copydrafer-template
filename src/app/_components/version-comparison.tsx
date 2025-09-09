"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
	AlertCircle,
	BarChart3,
	Check,
	CheckCircle2,
	Clock,
	Download,
	FileText,
	GitMerge,
	Loader2,
	X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface Version {
	id: string;
	name: string;
	content: string;
	createdAt: Date;
	updatedAt: Date;
	aiGenerated?: boolean;
}

interface DiffSegment {
	type: "added" | "removed" | "unchanged";
	content: string;
	index: number;
}

interface VersionComparisonProps {
	leftVersion: Version;
	rightVersion: Version;
	showDiff?: boolean;
	showMetadata?: boolean;
	showStats?: boolean;
	readOnly?: boolean;
	granularSelection?: boolean;
	loading?: boolean;
	onAcceptChanges?: (versionId: string) => void;
	onRejectChanges?: (versionId: string) => void;
	onMerge?: (strategy: "left" | "right" | "custom", content?: string) => void;
	onExport?: () => void;
	className?: string;
}

export function VersionComparison({
	leftVersion,
	rightVersion,
	showDiff = true,
	showMetadata = false,
	showStats = false,
	readOnly = false,
	granularSelection = false,
	loading = false,
	onAcceptChanges,
	onRejectChanges,
	onMerge,
	onExport,
	className,
}: VersionComparisonProps) {
	const [viewMode, setViewMode] = useState<"split" | "unified">("split");
	const [showMergeDialog, setShowMergeDialog] = useState(false);
	const [mergeStrategy, setMergeStrategy] = useState<
		"left" | "right" | "custom"
	>("right");
	const [selectedChanges, setSelectedChanges] = useState<Set<number>>(
		new Set(),
	);

	const diffSegments = useMemo((): DiffSegment[] => {
		if (!showDiff) return [];

		const leftWords = leftVersion.content.split(/\s+/);
		const rightWords = rightVersion.content.split(/\s+/);
		const segments: DiffSegment[] = [];

		let i = 0;
		let j = 0;
		let segmentIndex = 0;

		while (i < leftWords.length || j < rightWords.length) {
			if (i >= leftWords.length) {
				segments.push({
					type: "added",
					content: rightWords.slice(j).join(" "),
					index: segmentIndex++,
				});
				break;
			}
			if (j >= rightWords.length) {
				segments.push({
					type: "removed",
					content: leftWords.slice(i).join(" "),
					index: segmentIndex++,
				});
				break;
			}

			if (leftWords[i] === rightWords[j]) {
				const unchangedStart = i;
				while (
					i < leftWords.length &&
					j < rightWords.length &&
					leftWords[i] === rightWords[j]
				) {
					i++;
					j++;
				}
				segments.push({
					type: "unchanged",
					content: leftWords.slice(unchangedStart, i).join(" "),
					index: segmentIndex++,
				});
			} else {
				const removedStart = i;
				while (i < leftWords.length && leftWords[i] !== rightWords[j]) {
					i++;
				}
				segments.push({
					type: "removed",
					content: leftWords.slice(removedStart, i).join(" "),
					index: segmentIndex++,
				});

				const addedStart = j;
				while (j < rightWords.length && rightWords[j] !== leftWords[i]) {
					j++;
				}
				segments.push({
					type: "added",
					content: rightWords.slice(addedStart, j).join(" "),
					index: segmentIndex++,
				});
			}
		}

		return segments;
	}, [leftVersion.content, rightVersion.content, showDiff]);

	const stats = useMemo(() => {
		if (!showStats) return null;

		const leftWords = leftVersion.content.split(/\s+/).length;
		const rightWords = rightVersion.content.split(/\s+/).length;
		const leftChars = leftVersion.content.length;
		const rightChars = rightVersion.content.length;

		return {
			wordDiff: rightWords - leftWords,
			charDiff: rightChars - leftChars,
			leftWords,
			rightWords,
			leftChars,
			rightChars,
		};
	}, [leftVersion.content, rightVersion.content, showStats]);

	const handleAccept = useCallback(() => {
		if (onAcceptChanges) {
			onAcceptChanges(rightVersion.id);
		}
	}, [onAcceptChanges, rightVersion.id]);

	const handleReject = useCallback(() => {
		if (onRejectChanges) {
			onRejectChanges(rightVersion.id);
		}
	}, [onRejectChanges, rightVersion.id]);

	const handleMerge = useCallback(() => {
		if (onMerge) {
			if (mergeStrategy === "custom" && granularSelection) {
				const mergedContent = diffSegments
					.map((segment) => {
						if (segment.type === "unchanged") return segment.content;
						if (
							segment.type === "added" &&
							selectedChanges.has(segment.index)
						) {
							return segment.content;
						}
						if (
							segment.type === "removed" &&
							!selectedChanges.has(segment.index)
						) {
							return segment.content;
						}
						return "";
					})
					.filter(Boolean)
					.join(" ");
				onMerge(mergeStrategy, mergedContent);
			} else {
				onMerge(mergeStrategy);
			}
			setShowMergeDialog(false);
		}
	}, [
		onMerge,
		mergeStrategy,
		granularSelection,
		selectedChanges,
		diffSegments,
	]);

	const toggleChangeSelection = useCallback((index: number) => {
		setSelectedChanges((prev) => {
			const next = new Set(prev);
			if (next.has(index)) {
				next.delete(index);
			} else {
				next.add(index);
			}
			return next;
		});
	}, []);

	if (loading) {
		return (
			<div className={cn("flex items-center justify-center p-8", className)}>
				<Loader2
					className="h-6 w-6 animate-spin"
					aria-label="Loading comparison"
				/>
			</div>
		);
	}

	const renderDiffContent = (content: string, segments: DiffSegment[]) => {
		if (!showDiff || segments.length === 0) {
			return <div className="whitespace-pre-wrap">{content}</div>;
		}

		return (
			<div className="space-y-1">
				{segments.map((segment) => (
					<span
						key={segment.index}
						data-testid={`diff-${segment.type}-${segment.index}`}
						className={cn(
							"inline",
							segment.type === "added" &&
								"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
							segment.type === "removed" &&
								"bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
							segment.type === "unchanged" && "text-foreground",
						)}
					>
						{granularSelection && segment.type !== "unchanged" && (
							<Checkbox
								checked={selectedChanges.has(segment.index)}
								onCheckedChange={() => toggleChangeSelection(segment.index)}
								className="mr-1 inline"
							/>
						)}
						{segment.content}
					</span>
				))}
			</div>
		);
	};

	return (
		<div className={cn("space-y-4", className)}>
			{/* Header Controls */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Label className="text-sm">View Mode:</Label>
					<Tabs
						value={viewMode}
						onValueChange={(v) => setViewMode(v as "split" | "unified")}
					>
						<TabsList className="h-8">
							<TabsTrigger value="split" className="text-xs">
								Split View
							</TabsTrigger>
							<TabsTrigger
								value="unified"
								className="text-xs"
								aria-label="Unified view"
							>
								Unified View
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

				{!readOnly && (
					<div className="flex items-center gap-2">
						{onAcceptChanges && (
							<Button size="sm" variant="default" onClick={handleAccept}>
								<CheckCircle2 className="mr-1 h-3 w-3" />
								Accept Changes
							</Button>
						)}
						{onRejectChanges && (
							<Button size="sm" variant="outline" onClick={handleReject}>
								<X className="mr-1 h-3 w-3" />
								Reject Changes
							</Button>
						)}
						{onMerge && (
							<Button
								size="sm"
								variant="secondary"
								onClick={() => setShowMergeDialog(true)}
							>
								<GitMerge className="mr-1 h-3 w-3" />
								Merge Versions
							</Button>
						)}
						{onExport && (
							<Button
								size="sm"
								variant="ghost"
								onClick={onExport}
								aria-label="Export comparison"
							>
								<Download className="h-4 w-4" />
							</Button>
						)}
					</div>
				)}
			</div>

			{/* Stats Display */}
			{showStats && stats && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-sm">
							<BarChart3 className="h-4 w-4" />
							Content Statistics
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<Label className="text-muted-foreground">Word Count</Label>
								<div className="flex items-center gap-2">
									<span>{stats.leftWords}</span>
									<span className="text-muted-foreground">→</span>
									<span>{stats.rightWords}</span>
									<Badge
										variant={stats.wordDiff > 0 ? "default" : "secondary"}
										className="ml-2"
									>
										{stats.wordDiff > 0 ? "+" : ""}
										{stats.wordDiff}
									</Badge>
								</div>
							</div>
							<div>
								<Label className="text-muted-foreground">Character Count</Label>
								<div className="flex items-center gap-2">
									<span>{stats.leftChars}</span>
									<span className="text-muted-foreground">→</span>
									<span>{stats.rightChars}</span>
									<Badge
										variant={stats.charDiff > 0 ? "default" : "secondary"}
										className="ml-2"
									>
										{stats.charDiff > 0 ? "+" : ""}
										{stats.charDiff}
									</Badge>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Comparison View */}
			{viewMode === "split" ? (
				<div
					className="grid grid-cols-2 gap-4"
					data-testid="version-comparison"
				>
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center justify-between text-sm">
								<span>{leftVersion.name}</span>
								<Badge variant="outline">Current Version</Badge>
							</CardTitle>
							{showMetadata && (
								<div className="flex items-center gap-1 text-muted-foreground text-xs">
									<Clock className="h-3 w-3" />
									Created {format(leftVersion.createdAt, "MMM d, yyyy")}
								</div>
							)}
						</CardHeader>
						<CardContent>
							<ScrollArea className="h-[400px] w-full">
								<div className="pr-4 text-sm">
									{renderDiffContent(leftVersion.content, [])}
								</div>
							</ScrollArea>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center justify-between text-sm">
								<span>{rightVersion.name}</span>
								{rightVersion.aiGenerated ? (
									<Badge>AI Version</Badge>
								) : (
									<Badge variant="outline">Modified</Badge>
								)}
							</CardTitle>
							{showMetadata && (
								<div className="flex items-center gap-1 text-muted-foreground text-xs">
									<Clock className="h-3 w-3" />
									Created {format(rightVersion.createdAt, "MMM d, yyyy")}
								</div>
							)}
						</CardHeader>
						<CardContent>
							<ScrollArea className="h-[400px] w-full">
								<div className="pr-4 text-sm">
									{renderDiffContent(rightVersion.content, [])}
								</div>
							</ScrollArea>
						</CardContent>
					</Card>
				</div>
			) : (
				<Card data-testid="unified-diff">
					<CardHeader>
						<CardTitle className="text-sm">Unified Diff View</CardTitle>
					</CardHeader>
					<CardContent>
						<ScrollArea className="h-[500px] w-full">
							<div className="space-y-2 pr-4 text-sm">
								{renderDiffContent("", diffSegments)}
							</div>
						</ScrollArea>
					</CardContent>
				</Card>
			)}

			{/* Merge Dialog */}
			<Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Merge Versions</DialogTitle>
						<DialogDescription>
							Choose a merge strategy to combine the two versions
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<RadioGroup
							value={mergeStrategy}
							onValueChange={(v) => setMergeStrategy(v as typeof mergeStrategy)}
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="left" id="left" />
								<Label htmlFor="left">Keep {leftVersion.name}</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="right" id="right" />
								<Label htmlFor="right">Keep {rightVersion.name}</Label>
							</div>
							{granularSelection && (
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="custom" id="custom" />
									<Label htmlFor="custom">Custom (Selected Changes)</Label>
								</div>
							)}
						</RadioGroup>
						{mergeStrategy === "custom" && granularSelection && (
							<Alert>
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>
									{selectedChanges.size} changes selected for merge
								</AlertDescription>
							</Alert>
						)}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowMergeDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleMerge}>
							<Check className="mr-1 h-4 w-4" />
							Merge
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
