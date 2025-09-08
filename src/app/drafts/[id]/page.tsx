"use client";

import { DraftEditor } from "@/app/_components/draft-editor";
import { Button } from "@/components/ui/button";
import { useDraftStore } from "@/stores/draft-store";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DraftEditorPage() {
	const params = useParams();
	const router = useRouter();
	const draftId = params.id as string;

	const {
		getDraftById,
		updateDraft,
		deleteDraft,
		publishDraft,
		addTagToDraft,
		removeTagFromDraft,
		selectDraft,
	} = useDraftStore();

	const draft = getDraftById(draftId);

	useEffect(() => {
		if (draft) {
			selectDraft(draftId);
		}
	}, [draftId, draft, selectDraft]);

	if (!draft) {
		return (
			<div className="flex h-screen flex-col items-center justify-center">
				<h2 className="mb-4 text-2xl font-bold">Draft not found</h2>
				<p className="mb-8 text-muted-foreground">
					The draft you're looking for doesn't exist or has been deleted.
				</p>
				<Button onClick={() => router.push("/drafts")}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to Drafts
				</Button>
			</div>
		);
	}

	const handleSave = async (updates: any) => {
		updateDraft(draftId, updates);
	};

	const handlePublish = async () => {
		publishDraft(draftId);
		// In real app, this would call an API
	};

	const handleDelete = () => {
		deleteDraft(draftId);
		router.push("/drafts");
	};

	return (
		<div className="flex h-screen flex-col">
			{/* Header */}
			<div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container flex h-14 items-center justify-between">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => router.push("/drafts")}
						>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Drafts
						</Button>
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
					draft={draft}
					onSave={handleSave}
					onPublish={handlePublish}
					onDelete={handleDelete}
					onTagAdd={(tag) => addTagToDraft(draftId, tag)}
					onTagRemove={(tag) => removeTagFromDraft(draftId, tag)}
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