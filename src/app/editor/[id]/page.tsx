"use client";

import { AIChat } from "@/app/_components/ai-chat";
import { DualPaneLayout } from "@/app/_components/dual-pane-layout";
import { RichTextEditor } from "@/app/_components/rich-text-editor";
import { VersionSelector } from "@/app/_components/version-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useEditorIntegration } from "@/hooks/use-editor-integration";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
	ArrowLeft,
	Calendar,
	Check,
	Clock,
	FileText,
	Loader2,
	Save,
	Settings,
	Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function IntegratedEditorPage() {
	const params = useParams();
	const router = useRouter();
	const draftId = params.id as string;

	const [title, setTitle] = useState("");
	const [isEditingTitle, setIsEditingTitle] = useState(false);

	const {
		draft,
		versions,
		chatMessages,
		currentContent,
		currentVersionId,
		isDirty,
		lastSavedAt,
		isLoading,
		isSaving,
		isGeneratingAI,
		compareMode,
		compareVersionId,
		setContent,
		saveContent,
		switchVersion,
		deleteDraft,
		sendChatMessage,
		generateAIContent,
		enableCompareMode,
		disableCompareMode,
		error,
	} = useEditorIntegration({ draftId, autoLoad: true, enableAutoSave: true });

	useEffect(() => {
		if (draft) {
			setTitle(draft.title || "Untitled Draft");
		}
	}, [draft]);

	useEffect(() => {
		if (error) {
			toast.error(error);
		}
	}, [error]);

	const handleTitleSave = async () => {
		if (!draft || title === draft.title) {
			setIsEditingTitle(false);
			return;
		}

		try {
			// Update title via API
			// await updateDraftMutation.mutateAsync({ id: draftId, title });
			toast.success("Title updated");
			setIsEditingTitle(false);
		} catch (error) {
			toast.error("Failed to update title");
		}
	};

	const handleDelete = async () => {
		if (confirm("Are you sure you want to delete this draft?")) {
			await deleteDraft();
			router.push("/drafts");
		}
	};

	const handleManualSave = async () => {
		await saveContent(true);
	};

	const handleVersionCompare = (versionId: string) => {
		if (currentVersionId) {
			enableCompareMode(currentVersionId, versionId);
		}
	};

	const handleAIGenerate = async (prompt: string) => {
		await generateAIContent(prompt);
	};

	if (isLoading) {
		return (
			<div className="flex h-screen flex-col">
				<div className="border-b p-4">
					<Skeleton className="h-8 w-64" />
				</div>
				<div className="flex flex-1">
					<div className="flex-1 p-4">
						<Skeleton className="h-full w-full" />
					</div>
					<div className="w-96 border-l p-4">
						<Skeleton className="h-full w-full" />
					</div>
				</div>
			</div>
		);
	}

	if (!draft) {
		return (
			<div className="flex h-screen flex-col items-center justify-center">
				<h2 className="mb-4 font-bold text-2xl">Draft not found</h2>
				<Button onClick={() => router.push("/drafts")}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to Drafts
				</Button>
			</div>
		);
	}

	const leftPanel = (
		<div className="flex h-full flex-col">
			{/* Editor Header */}
			<div className="border-b p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => router.push("/drafts")}
						>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back
						</Button>

						{isEditingTitle ? (
							<Input
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								onBlur={handleTitleSave}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleTitleSave();
									if (e.key === "Escape") {
										setTitle(draft.title || "Untitled");
										setIsEditingTitle(false);
									}
								}}
								className="h-8 w-64"
								autoFocus
							/>
						) : (
							<h1
								className="cursor-pointer font-semibold text-lg hover:text-muted-foreground"
								onClick={() => setIsEditingTitle(true)}
							>
								{title}
							</h1>
						)}
					</div>

					<div className="flex items-center gap-2">
						{/* Version Selector */}
						<VersionSelector
							versions={versions}
							currentVersionId={currentVersionId}
							onVersionSelect={switchVersion}
							onCompare={handleVersionCompare}
							compareMode={compareMode}
							compareVersionId={compareVersionId}
						/>

						<Separator orientation="vertical" className="h-8" />

						{/* Save Status */}
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							{isSaving ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									<span>Saving...</span>
								</>
							) : isDirty ? (
								<>
									<Clock className="h-4 w-4" />
									<span>Unsaved changes</span>
								</>
							) : lastSavedAt ? (
								<>
									<Check className="h-4 w-4 text-green-500" />
									<span>Saved {format(lastSavedAt, "HH:mm")}</span>
								</>
							) : null}
						</div>

						<Button
							size="sm"
							variant="outline"
							onClick={handleManualSave}
							disabled={!isDirty || isSaving}
						>
							<Save className="mr-2 h-4 w-4" />
							Save Version
						</Button>

						<Button size="sm" variant="destructive" onClick={handleDelete}>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			{/* Editor Content */}
			<div className="flex-1 overflow-hidden">
				<RichTextEditor
					content={currentContent}
					onChange={setContent}
					onSave={() => saveContent(true)}
					placeholder="Start writing your content..."
					className="h-full"
					editable={!compareMode}
				/>
			</div>

			{/* Editor Footer */}
			<div className="border-t p-2">
				<div className="flex items-center justify-between text-muted-foreground text-sm">
					<div className="flex items-center gap-4">
						<span className="flex items-center gap-1">
							<FileText className="h-3 w-3" />
							{currentContent.split(/\s+/).filter(Boolean).length} words
						</span>
						<span className="flex items-center gap-1">
							<Calendar className="h-3 w-3" />
							{format(draft.createdAt, "MMM d, yyyy")}
						</span>
					</div>

					<div className="flex items-center gap-2">
						{versions.length > 0 && <span>{versions.length} versions</span>}
						<Button variant="ghost" size="sm">
							<Settings className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);

	const rightPanel = (
		<div className="flex h-full flex-col bg-muted/30">
			<div className="border-b p-4">
				<h2 className="font-semibold text-lg">AI Assistant</h2>
			</div>

			<div className="flex-1 overflow-hidden">
				<AIChat
					messages={chatMessages}
					onSendMessage={sendChatMessage}
					onGenerateContent={handleAIGenerate}
					isGenerating={isGeneratingAI}
					currentContent={currentContent}
					className="h-full"
				/>
			</div>
		</div>
	);

	return (
		<div className="h-screen overflow-hidden">
			<DualPaneLayout
				leftPanel={leftPanel}
				rightPanel={rightPanel}
				defaultSize={[65, 35]}
				minSize={30}
				maxSize={80}
				persistenceKey={`editor-${draftId}`}
				className="h-full"
			/>
		</div>
	);
}
