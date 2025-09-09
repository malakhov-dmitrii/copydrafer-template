"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
	AlertTriangle,
	Brain,
	Check,
	CheckCircle2,
	Edit,
	Lightbulb,
	Loader2,
	RefreshCw,
	Sparkles,
	TrendingUp,
} from "lucide-react";
import { useCallback, useState } from "react";
import { VersionComparison } from "./version-comparison";

export interface AIResponse {
	id: string;
	content: string;
	suggestions?: string[];
	confidence?: number;
	reasoning?: string;
}

interface Version {
	id: string;
	name: string;
	content: string;
	createdAt: Date;
	updatedAt: Date;
	aiGenerated?: boolean;
	parentVersionId?: string;
}

interface VersionAIIntegrationProps {
	aiResponse?: AIResponse;
	aiResponses?: AIResponse[];
	currentVersion: Version;
	onCreateVersion: (version: {
		content: string;
		name: string;
		aiGenerated: boolean;
		parentVersionId: string;
	}) => Promise<void> | void;
	onApplySuggestions?: (suggestions: string[]) => void;
	onRegenerate?: () => void;
	showComparison?: boolean;
	allowEdit?: boolean;
	promptForName?: boolean;
	className?: string;
}

export function VersionAIIntegration({
	aiResponse,
	aiResponses,
	currentVersion,
	onCreateVersion,
	onApplySuggestions,
	onRegenerate,
	showComparison = false,
	allowEdit = false,
	promptForName = false,
	className,
}: VersionAIIntegrationProps) {
	const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(
		new Set(),
	);
	const [isCreating, setIsCreating] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editedContent, setEditedContent] = useState("");
	const [showNameDialog, setShowNameDialog] = useState(false);
	const [versionName, setVersionName] = useState("");
	const [selectedTab, setSelectedTab] = useState("0");

	const responses = aiResponses || (aiResponse ? [aiResponse] : []);
	const activeResponse =
		responses[Number.parseInt(selectedTab)] || responses[0];

	const handleCreateVersion = useCallback(async () => {
		if (!activeResponse) return;

		const finalContent = isEditing ? editedContent : activeResponse.content;
		const finalName =
			versionName || `AI Generated - ${new Date().toLocaleString()}`;

		if (promptForName && !versionName) {
			setShowNameDialog(true);
			return;
		}

		setIsCreating(true);
		try {
			await onCreateVersion({
				content: finalContent,
				name: finalName,
				aiGenerated: true,
				parentVersionId: currentVersion.id,
			});
			setIsEditing(false);
			setEditedContent("");
			setVersionName("");
		} finally {
			setIsCreating(false);
		}
	}, [
		activeResponse,
		isEditing,
		editedContent,
		versionName,
		promptForName,
		onCreateVersion,
		currentVersion.id,
	]);

	const handleApplySuggestions = useCallback(() => {
		if (onApplySuggestions && selectedSuggestions.size > 0) {
			onApplySuggestions(Array.from(selectedSuggestions));
			setSelectedSuggestions(new Set());
		}
	}, [onApplySuggestions, selectedSuggestions]);

	const toggleSuggestion = useCallback((suggestion: string) => {
		setSelectedSuggestions((prev) => {
			const next = new Set(prev);
			if (next.has(suggestion)) {
				next.delete(suggestion);
			} else {
				next.add(suggestion);
			}
			return next;
		});
	}, []);

	const startEditing = useCallback(() => {
		if (activeResponse) {
			setEditedContent(activeResponse.content);
			setIsEditing(true);
		}
	}, [activeResponse]);

	const confirmVersionName = useCallback(async () => {
		setShowNameDialog(false);
		await handleCreateVersion();
	}, [handleCreateVersion]);

	if (!activeResponse) {
		return (
			<Card className={cn("border-dashed", className)}>
				<CardContent className="flex flex-col items-center justify-center py-8">
					<Brain className="mb-4 h-12 w-12 text-muted-foreground/50" />
					<p className="text-center text-muted-foreground">
						No AI response available. Generate content with AI to create
						versions.
					</p>
				</CardContent>
			</Card>
		);
	}

	const isLowConfidence =
		activeResponse.confidence && activeResponse.confidence < 0.5;

	return (
		<div className={cn("space-y-4", className)}>
			{/* Multiple Responses Tabs */}
			{responses.length > 1 && (
				<Tabs value={selectedTab} onValueChange={setSelectedTab}>
					<TabsList
						className="grid w-full"
						style={{ gridTemplateColumns: `repeat(${responses.length}, 1fr)` }}
					>
						{responses.map((_, index) => (
							<TabsTrigger key={index} value={index.toString()}>
								Option {index + 1}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
			)}

			{/* Confidence and Warning */}
			{activeResponse.confidence && (
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label className="text-sm">AI Confidence</Label>
						<span className="font-medium text-sm">
							{Math.round(activeResponse.confidence * 100)}%
						</span>
					</div>
					<Progress value={activeResponse.confidence * 100} className="h-2" />
					{isLowConfidence && (
						<Alert variant="destructive" role="alert">
							<AlertTriangle className="h-4 w-4" />
							<AlertTitle>Low Confidence</AlertTitle>
							<AlertDescription>
								The AI has low confidence in this response. Consider reviewing
								carefully or regenerating.
							</AlertDescription>
						</Alert>
					)}
				</div>
			)}

			{/* AI Reasoning */}
			{activeResponse.reasoning && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<Brain className="h-4 w-4" />
							AI Reasoning
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">
							{activeResponse.reasoning}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Content Display/Edit */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Sparkles className="h-5 w-5 text-primary" />
							AI Generated Content
						</div>
						<div className="flex items-center gap-2">
							{allowEdit && !isEditing && (
								<Button size="sm" variant="outline" onClick={startEditing}>
									<Edit className="mr-1 h-3 w-3" />
									Edit Before Creating
								</Button>
							)}
							{onRegenerate && (
								<Button size="sm" variant="outline" onClick={onRegenerate}>
									<RefreshCw className="mr-1 h-3 w-3" />
									Regenerate
								</Button>
							)}
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent>
					{isEditing ? (
						<Textarea
							value={editedContent}
							onChange={(e) => setEditedContent(e.target.value)}
							className="min-h-[200px]"
							placeholder="Edit the AI-generated content..."
						/>
					) : (
						<ScrollArea className="h-[200px] w-full">
							<div className="whitespace-pre-wrap pr-4 text-sm">
								{activeResponse.content}
							</div>
						</ScrollArea>
					)}
					{isEditing && (
						<div className="mt-4 flex justify-end gap-2">
							<Button
								size="sm"
								variant="outline"
								onClick={() => {
									setIsEditing(false);
									setEditedContent("");
								}}
							>
								Cancel
							</Button>
							<Button size="sm" onClick={handleCreateVersion}>
								<Check className="mr-1 h-3 w-3" />
								Save & Create Version
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Suggestions */}
			{activeResponse.suggestions && activeResponse.suggestions.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<Lightbulb className="h-4 w-4" />
							AI Suggestions
						</CardTitle>
						<CardDescription>
							Select suggestions to apply or review them individually
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{activeResponse.suggestions.map((suggestion, index) => (
								<div key={index} className="flex items-start gap-2">
									<Checkbox
										id={`suggestion-${index}`}
										checked={selectedSuggestions.has(suggestion)}
										onCheckedChange={() => toggleSuggestion(suggestion)}
									/>
									<Label
										htmlFor={`suggestion-${index}`}
										className="flex-1 cursor-pointer font-normal text-sm"
									>
										<div className="flex items-start gap-2">
											<TrendingUp className="mt-0.5 h-3 w-3 text-primary" />
											{suggestion}
										</div>
									</Label>
								</div>
							))}
						</div>
						{onApplySuggestions && selectedSuggestions.size > 0 && (
							<Button
								size="sm"
								className="mt-4"
								onClick={handleApplySuggestions}
							>
								<CheckCircle2 className="mr-1 h-3 w-3" />
								Apply Selected ({selectedSuggestions.size})
							</Button>
						)}
					</CardContent>
				</Card>
			)}

			{/* Comparison View */}
			{showComparison && (
				<div data-testid="version-comparison">
					<VersionComparison
						leftVersion={currentVersion}
						rightVersion={{
							id: `ai-preview-${activeResponse.id}`,
							name: "AI Version",
							content: isEditing ? editedContent : activeResponse.content,
							createdAt: new Date(),
							updatedAt: new Date(),
							aiGenerated: true,
						}}
						showDiff
						readOnly
					/>
				</div>
			)}

			{/* Action Buttons */}
			<div className="flex justify-end gap-2">
				{!isEditing && (
					<Button onClick={handleCreateVersion} disabled={isCreating}>
						{isCreating ? (
							<>
								<Loader2
									className="mr-2 h-4 w-4 animate-spin"
									aria-label="Creating version"
								/>
								Creating Version...
							</>
						) : (
							<>
								<Sparkles className="mr-2 h-4 w-4" />
								Create Version from AI
							</>
						)}
					</Button>
				)}
			</div>

			{/* Version Naming Dialog */}
			<Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Name Your Version</DialogTitle>
						<DialogDescription>
							Give this AI-generated version a descriptive name
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="version-name">Version Name</Label>
							<Input
								id="version-name"
								value={versionName}
								onChange={(e) => setVersionName(e.target.value)}
								placeholder="e.g., SEO Optimized Version"
							/>
						</div>
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<Badge variant="secondary">AI Generated</Badge>
							<span>This version will be marked as AI-generated</span>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowNameDialog(false)}>
							Cancel
						</Button>
						<Button onClick={confirmVersionName} disabled={!versionName.trim()}>
							<Check className="mr-1 h-4 w-4" />
							Confirm
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
