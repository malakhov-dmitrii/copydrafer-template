"use client";

import { DraftEditor } from "@/app/_components/draft-editor";
import { DraftList } from "@/app/_components/draft-list";
import { Button } from "@/components/ui/button";
import { useDraftStore } from "@/stores/draft-store";
import { ArrowLeft, FileText, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function DraftsPage() {
	const router = useRouter();
	const [viewMode, setViewMode] = useState<"list" | "editor">("list");

	const {
		drafts,
		currentDraftId,
		isLoading,
		setDrafts,
		addDraft,
		updateDraft,
		deleteDraft,
		duplicateDraft,
		selectDraft,
		publishDraft,
		addTagToDraft,
		removeTagFromDraft,
		getDraftById,
		getFilteredDrafts,
	} = useDraftStore();

	const currentDraft = currentDraftId ? getDraftById(currentDraftId) : null;

	// Load mock data on mount (in real app, this would be from API)
	useEffect(() => {
		if (drafts.length === 0) {
			const mockDrafts = [
				{
					id: "1",
					title: "Getting Started with Next.js 15",
					description:
						"A comprehensive guide to the latest features in Next.js",
					content: "<p>Next.js 15 brings exciting new features...</p>",
					status: "draft" as const,
					tags: ["nextjs", "react", "tutorial"],
					createdAt: new Date("2024-01-01"),
					updatedAt: new Date("2024-01-02"),
					wordCount: 1500,
					versionCount: 3,
				},
				{
					id: "2",
					title: "Building a SaaS with T3 Stack",
					description:
						"From zero to production with TypeScript, tRPC, and Tailwind",
					content: "<p>The T3 Stack is a powerful combination...</p>",
					status: "published" as const,
					tags: ["typescript", "trpc", "tailwind"],
					createdAt: new Date("2024-01-03"),
					updatedAt: new Date("2024-01-04"),
					wordCount: 2300,
					versionCount: 5,
				},
				{
					id: "3",
					title: "AI-Powered Content Creation",
					description: "How AI is revolutionizing content workflows",
					content:
						"<p>Artificial Intelligence is transforming how we create content...</p>",
					status: "draft" as const,
					tags: ["ai", "content", "automation"],
					createdAt: new Date("2024-01-05"),
					updatedAt: new Date("2024-01-06"),
					wordCount: 1200,
					versionCount: 2,
				},
			];
			setDrafts(mockDrafts);
		}
	}, [drafts.length, setDrafts]);

	const handleDraftSelect = useCallback(
		(draftId: string) => {
			selectDraft(draftId);
			setViewMode("editor");
		},
		[selectDraft],
	);

	const handleDraftCreate = useCallback(
		(draftData: any) => {
			const newDraft = addDraft({
				title: draftData.title || "Untitled Draft",
				description: draftData.description || "",
				content: "",
				status: "draft",
				tags: [],
			});
			selectDraft(newDraft.id);
			setViewMode("editor");
		},
		[addDraft, selectDraft],
	);

	const handleDraftSave = useCallback(
		async (updates: any) => {
			if (currentDraftId) {
				updateDraft(currentDraftId, updates);
			}
		},
		[currentDraftId, updateDraft],
	);

	const handleDraftDelete = useCallback(
		(draftId: string) => {
			deleteDraft(draftId);
			if (currentDraftId === draftId) {
				setViewMode("list");
			}
		},
		[currentDraftId, deleteDraft],
	);

	const handleDraftDuplicate = useCallback(
		(draftId: string) => {
			const duplicated = duplicateDraft(draftId);
			if (duplicated) {
				selectDraft(duplicated.id);
				setViewMode("editor");
			}
		},
		[duplicateDraft, selectDraft],
	);

	const handleDraftPublish = useCallback(
		async (draftId: string) => {
			publishDraft(draftId);
			// In real app, this would call an API
		},
		[publishDraft],
	);

	const handleBackToList = useCallback(() => {
		setViewMode("list");
		selectDraft(null);
	}, [selectDraft]);

	if (viewMode === "editor" && currentDraft) {
		return (
			<div className="flex h-screen flex-col">
				{/* Header */}
				<div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
					<div className="container flex h-14 items-center justify-between">
						<div className="flex items-center gap-4">
							<Button variant="ghost" size="sm" onClick={handleBackToList}>
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to Drafts
							</Button>
							<div className="h-6 w-px bg-border" />
							<div className="flex items-center gap-2">
								<FileText className="h-4 w-4 text-muted-foreground" />
								<span className="font-medium text-sm">Editing Draft</span>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => router.push("/")}
						>
							<LayoutDashboard className="mr-2 h-4 w-4" />
							Dashboard
						</Button>
					</div>
				</div>

				{/* Editor */}
				<div className="flex-1 overflow-hidden">
					<DraftEditor
						draft={currentDraft}
						onSave={handleDraftSave}
						onPublish={handleDraftPublish}
						onDelete={handleDraftDelete}
						onTagAdd={(tag) => addTagToDraft(currentDraft.id, tag)}
						onTagRemove={(tag) => removeTagFromDraft(currentDraft.id, tag)}
						showMetadata
						showWordCount
						showVersionSelector
						showAIAssistant
						autoSave
						validateOnSave
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8">
			<DraftList
				drafts={getFilteredDrafts()}
				onDraftSelect={handleDraftSelect}
				onDraftCreate={handleDraftCreate}
				onDraftEdit={handleDraftSelect}
				onDraftDelete={handleDraftDelete}
				onDraftDuplicate={handleDraftDuplicate}
				loading={isLoading}
				showSearch
				showFilters
				showSort
				showViewToggle
			/>
		</div>
	);
}
