"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
	AlertTriangle,
	Archive,
	Calendar,
	Check,
	Clock,
	Edit2,
	FileText,
	Hash,
	Loader2,
	Plus,
	Save,
	Send,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AIChat } from "./ai-chat";
import { DualPaneLayout } from "./dual-pane-layout";
import { RichTextEditor } from "./rich-text-editor";
import { VersionSelector } from "./version-selector";

export interface Draft {
	id: string;
	title: string;
	description?: string;
	content: string;
	status: "draft" | "published" | "archived";
	tags: string[];
	createdAt: Date;
	updatedAt: Date;
	wordCount: number;
	versionCount: number;
}

interface DraftEditorProps {
	draft: Draft;
	onSave: (draft: Partial<Draft>) => Promise<void> | void;
	onPublish?: (draftId: string) => Promise<void> | void;
	onDelete?: (draftId: string) => void;
	onTagAdd?: (tag: string) => void;
	onTagRemove?: (tag: string) => void;
	onStatusChange?: (status: Draft["status"]) => void;
	showMetadata?: boolean;
	showWordCount?: boolean;
	showCharCount?: boolean;
	showVersionSelector?: boolean;
	showAIAssistant?: boolean;
	showUnsavedWarning?: boolean;
	autoSave?: boolean;
	autoSaveDelay?: number;
	validateOnSave?: boolean;
	readOnly?: boolean;
	className?: string;
}

export function DraftEditor({
	draft,
	onSave,
	onPublish,
	onDelete,
	onTagAdd,
	onTagRemove,
	onStatusChange,
	showMetadata = true,
	showWordCount = true,
	showCharCount = false,
	showVersionSelector = false,
	showAIAssistant = false,
	showUnsavedWarning = true,
	autoSave = true,
	autoSaveDelay = 2000,
	validateOnSave = false,
	readOnly = false,
	className,
}: DraftEditorProps) {
	const [localDraft, setLocalDraft] = useState<Draft>(draft);
	const [isSaving, setIsSaving] = useState(false);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
	const [showPublishDialog, setShowPublishDialog] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showTagInput, setShowTagInput] = useState(false);
	const [newTag, setNewTag] = useState("");
	const [lastSaved, setLastSaved] = useState<Date | null>(null);

	// Calculate word and character counts
	const stats = useMemo(() => {
		const plainText = localDraft.content.replace(/<[^>]*>/g, "");
		const words = plainText.trim().split(/\s+/).filter(Boolean);
		return {
			wordCount: words.length,
			charCount: plainText.length,
		};
	}, [localDraft.content]);

	// Update local draft when prop changes
	useEffect(() => {
		setLocalDraft(draft);
	}, [draft]);

	// Track unsaved changes
	useEffect(() => {
		const hasChanges = 
			localDraft.title !== draft.title ||
			localDraft.description !== draft.description ||
			localDraft.content !== draft.content ||
			JSON.stringify(localDraft.tags) !== JSON.stringify(draft.tags);
		setHasUnsavedChanges(hasChanges);
	}, [localDraft, draft]);

	// Auto-save functionality
	useEffect(() => {
		if (!autoSave || !hasUnsavedChanges || readOnly) return;

		const timer = setTimeout(() => {
			handleSave();
		}, autoSaveDelay);

		return () => clearTimeout(timer);
	}, [localDraft, autoSave, autoSaveDelay, hasUnsavedChanges, readOnly]);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				e.preventDefault();
				if (!readOnly) {
					handleSave();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [localDraft, readOnly]);

	const validateDraft = useCallback((): boolean => {
		if (!validateOnSave) return true;

		const errors: Record<string, string> = {};

		if (!localDraft.title.trim()) {
			errors.title = "Title is required";
		}

		if (localDraft.title.length > 200) {
			errors.title = "Title must be less than 200 characters";
		}

		if (localDraft.description && localDraft.description.length > 500) {
			errors.description = "Description must be less than 500 characters";
		}

		if (!localDraft.content.trim()) {
			errors.content = "Content is required";
		}

		setValidationErrors(errors);
		return Object.keys(errors).length === 0;
	}, [localDraft, validateOnSave]);

	const handleSave = useCallback(async () => {
		if (!validateDraft()) return;

		setIsSaving(true);
		try {
			await onSave({
				...localDraft,
				wordCount: stats.wordCount,
				updatedAt: new Date(),
			});
			setLastSaved(new Date());
			setHasUnsavedChanges(false);
		} finally {
			setIsSaving(false);
		}
	}, [localDraft, onSave, validateDraft, stats.wordCount]);

	const handlePublish = useCallback(async () => {
		if (onPublish) {
			await onPublish(localDraft.id);
			setShowPublishDialog(false);
			if (onStatusChange) {
				onStatusChange("published");
			}
		}
	}, [localDraft.id, onPublish, onStatusChange]);

	const handleDelete = useCallback(() => {
		if (onDelete) {
			onDelete(localDraft.id);
			setShowDeleteDialog(false);
		}
	}, [localDraft.id, onDelete]);

	const handleAddTag = useCallback(() => {
		const trimmedTag = newTag.trim().toLowerCase();
		if (trimmedTag && !localDraft.tags.includes(trimmedTag)) {
			const updatedTags = [...localDraft.tags, trimmedTag];
			setLocalDraft({ ...localDraft, tags: updatedTags });
			if (onTagAdd) {
				onTagAdd(trimmedTag);
			}
			setNewTag("");
			setShowTagInput(false);
		}
	}, [newTag, localDraft, onTagAdd]);

	const handleRemoveTag = useCallback((tag: string) => {
		const updatedTags = localDraft.tags.filter((t) => t !== tag);
		setLocalDraft({ ...localDraft, tags: updatedTags });
		if (onTagRemove) {
			onTagRemove(tag);
		}
	}, [localDraft, onTagRemove]);

	const handleContentChange = useCallback((content: string) => {
		setLocalDraft({ ...localDraft, content });
	}, [localDraft]);

	const handleAIMessage = useCallback(async (message: string): Promise<string> => {
		// Mock AI response for now
		await new Promise((resolve) => setTimeout(resolve, 1000));
		return `Here's an improved version of your content based on: "${message}"`;
	}, []);

	const editorContent = (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="border-b p-4">
				<div className="space-y-4">
					{/* Title */}
					<div className="space-y-2">
						<Input
							value={localDraft.title}
							onChange={(e) => setLocalDraft({ ...localDraft, title: e.target.value })}
							placeholder="Draft title..."
							className="text-2xl font-bold"
							disabled={readOnly}
							aria-label="Draft title"
						/>
						{validationErrors.title && (
							<p className="text-destructive text-sm">{validationErrors.title}</p>
						)}
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Textarea
							value={localDraft.description || ""}
							onChange={(e) => setLocalDraft({ ...localDraft, description: e.target.value })}
							placeholder="Brief description..."
							className="min-h-[60px] resize-none"
							disabled={readOnly}
							aria-label="Draft description"
						/>
						{validationErrors.description && (
							<p className="text-destructive text-sm">{validationErrors.description}</p>
						)}
					</div>

					{/* Metadata and Actions */}
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="flex flex-wrap items-center gap-2">
							{/* Status */}
							<Select
								value={localDraft.status}
								onValueChange={(value) => {
									setLocalDraft({ ...localDraft, status: value as Draft["status"] });
									if (onStatusChange) {
										onStatusChange(value as Draft["status"]);
									}
								}}
								disabled={readOnly}
							>
								<SelectTrigger className="w-[130px]" aria-label="Status">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="draft">Draft</SelectItem>
									<SelectItem value="published">Published</SelectItem>
									<SelectItem value="archived">Archived</SelectItem>
								</SelectContent>
							</Select>

							{/* Version Selector */}
							{showVersionSelector && (
								<div aria-label="Version selector">
									<VersionSelector
										versions={[]}
										currentVersionId=""
										onVersionChange={() => {}}
										showTimestamps
									/>
								</div>
							)}

							{/* Stats */}
							{(showWordCount || showCharCount) && (
								<div className="flex items-center gap-3 text-muted-foreground text-sm">
									{showWordCount && (
										<span>{stats.wordCount} words</span>
									)}
									{showCharCount && (
										<span>{stats.charCount} characters</span>
									)}
								</div>
							)}
						</div>

						{/* Action Buttons */}
						{!readOnly && (
							<div className="flex items-center gap-2">
								{hasUnsavedChanges && showUnsavedWarning && (
									<Badge variant="secondary" className="text-xs">
										<AlertTriangle className="mr-1 h-3 w-3" />
										Unsaved changes
									</Badge>
								)}
								{lastSaved && (
									<span className="text-muted-foreground text-xs">
										Last saved {format(lastSaved, "HH:mm")}
									</span>
								)}
								<Button
									size="sm"
									variant="outline"
									onClick={handleSave}
									disabled={isSaving || !hasUnsavedChanges}
								>
									{isSaving ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Saving...
										</>
									) : (
										<>
											<Save className="mr-2 h-4 w-4" />
											Save Draft
										</>
									)}
								</Button>
								{onPublish && localDraft.status === "draft" && (
									<Button
										size="sm"
										onClick={() => setShowPublishDialog(true)}
									>
										<Send className="mr-2 h-4 w-4" />
										Publish
									</Button>
								)}
								{onDelete && (
									<Button
										size="sm"
										variant="ghost"
										onClick={() => setShowDeleteDialog(true)}
										aria-label="Delete draft"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								)}
							</div>
						)}
					</div>

					{/* Tags */}
					<div className="flex flex-wrap items-center gap-2">
						<Label className="text-sm">Tags:</Label>
						{localDraft.tags.map((tag) => (
							<Badge key={tag} variant="secondary">
								<Hash className="mr-1 h-3 w-3" />
								{tag}
								{!readOnly && (
									<button
										onClick={() => handleRemoveTag(tag)}
										className="ml-1 hover:text-destructive"
										aria-label="Remove tag"
									>
										<X className="h-3 w-3" />
									</button>
								)}
							</Badge>
						))}
						{!readOnly && !showTagInput && (
							<Button
								size="sm"
								variant="ghost"
								onClick={() => setShowTagInput(true)}
								aria-label="Add tag"
							>
								<Plus className="h-4 w-4" />
							</Button>
						)}
						{showTagInput && (
							<div className="flex items-center gap-2">
								<Input
									value={newTag}
									onChange={(e) => setNewTag(e.target.value)}
									onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
									placeholder="Enter tag"
									className="h-7 w-[120px]"
									autoFocus
								/>
								<Button size="sm" onClick={handleAddTag}>
									<Check className="h-4 w-4" />
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => {
										setShowTagInput(false);
										setNewTag("");
									}}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Metadata */}
			{showMetadata && (
				<div className="border-b px-4 py-2">
					<div className="flex items-center gap-4 text-muted-foreground text-xs">
						<div className="flex items-center gap-1">
							<Calendar className="h-3 w-3" />
							Created {format(localDraft.createdAt, "MMM d, yyyy")}
						</div>
						<div className="flex items-center gap-1">
							<Clock className="h-3 w-3" />
							Updated {format(localDraft.updatedAt, "MMM d, yyyy")}
						</div>
					</div>
				</div>
			)}

			{/* Content Editor */}
			<div className="flex-1 overflow-hidden">
				<RichTextEditor
					content={localDraft.content}
					onChange={handleContentChange}
					onSave={handleSave}
					placeholder="Start writing your content..."
					editable={!readOnly}
					autoSave={false}
				/>
				{validationErrors.content && (
					<p className="px-4 py-2 text-destructive text-sm">{validationErrors.content}</p>
				)}
			</div>
		</div>
	);

	const aiAssistant = showAIAssistant ? (
		<AIChat
			onSendMessage={handleAIMessage}
			placeholder="Ask AI to help improve your content..."
			systemPrompt="You are helping to improve and refine content drafts."
		/>
	) : null;

	return (
		<div className={cn("h-full", className)}>
			{showAIAssistant ? (
				<DualPaneLayout
					leftPanel={editorContent}
					rightPanel={aiAssistant}
					defaultSize={[65, 35]}
					persistenceKey="draft-editor-layout"
				/>
			) : (
				editorContent
			)}

			{/* Publish Dialog */}
			<Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Ready to Publish?</DialogTitle>
						<DialogDescription>
							This will make your draft public. Are you sure you want to publish?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowPublishDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handlePublish}>
							<Send className="mr-2 h-4 w-4" />
							Confirm Publish
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Dialog */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete this draft and all its versions. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground"
							onClick={handleDelete}
						>
							Confirm Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}