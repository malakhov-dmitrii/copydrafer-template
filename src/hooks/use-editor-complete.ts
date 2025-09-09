"use client";

import { useDraftStore } from "@/stores/draft-store";
import { useEditorIntegration } from "@/stores/editor-integration-store";
import { useEditorStore } from "@/stores/editor-store";
import { useVersionStore } from "@/stores/version-store";
import { api } from "@/trpc/react";
import debounce from "lodash/debounce";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

interface UseEditorCompleteOptions {
	draftId?: string;
	autoSave?: boolean;
	autoSaveDelay?: number;
	enableVersioning?: boolean;
	enableAI?: boolean;
	onError?: (error: Error) => void;
	onSave?: () => void;
	onConflict?: (conflict: any) => void;
}

export function useEditorComplete(options: UseEditorCompleteOptions = {}) {
	const {
		draftId,
		autoSave = true,
		autoSaveDelay = 2000,
		enableVersioning = true,
		enableAI = true,
		onError,
		onSave,
		onConflict,
	} = options;

	const router = useRouter();
	const editorStore = useEditorStore();
	const draftStore = useDraftStore();
	const versionStore = useVersionStore();
	const integration = useEditorIntegration();

	// Local state
	const [isInitialized, setIsInitialized] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const saveTimeoutRef = useRef<NodeJS.Timeout>();

	// tRPC mutations
	const createDraftMutation = api.draft.create.useMutation({
		onSuccess: (data) => {
			toast.success("Draft created successfully");
			router.push(`/drafts/${data.id}`);
		},
		onError: (error) => {
			toast.error("Failed to create draft");
			handleError(error);
		},
	});

	const updateDraftMutation = api.draft.update.useMutation({
		onSuccess: () => {
			editorStore.lastSavedAt = new Date();
			editorStore.isDirty = false;
			onSave?.();
		},
		onError: (error) => {
			handleError(error);
		},
	});

	const deleteDraftMutation = api.draft.delete.useMutation({
		onSuccess: () => {
			toast.success("Draft deleted");
			router.push("/drafts");
		},
		onError: (error) => {
			toast.error("Failed to delete draft");
			handleError(error);
		},
	});

	const createVersionMutation = api.version.create.useMutation({
		onSuccess: (data) => {
			versionStore.addVersion({
				id: data.id,
				name: data.name,
				content: data.content,
				createdAt: new Date(data.createdAt),
				updatedAt: new Date(data.updatedAt),
				draftId: data.draftId,
				aiGenerated: data.aiGenerated || false,
				parentVersionId: data.parentVersionId || undefined,
			});
			toast.success("Version created");
		},
		onError: (error) => {
			toast.error("Failed to create version");
			handleError(error);
		},
	});

	const streamChatMutation = api.aiChat.streamChat.useMutation({
		onSuccess: (data) => {
			// Handle streaming response
			if (data.content) {
				const assistantMessage = {
					id: `msg-${Date.now()}`,
					role: "assistant" as const,
					content: data.content,
					createdAt: new Date(),
				};
				editorStore.chatMessages = [
					...editorStore.chatMessages,
					assistantMessage,
				];
			}
		},
		onError: (error) => {
			editorStore.chatError = error.message;
			handleError(error);
		},
	});

	// tRPC queries
	const { data: draftData, isLoading: isDraftLoading } = api.draft.get.useQuery(
		{ id: draftId! },
		{ enabled: !!draftId },
	);

	const { data: versions, isLoading: isVersionsLoading } =
		api.version.list.useQuery(
			{ draftId: draftId! },
			{ enabled: !!draftId && enableVersioning },
		);

	const { data: chatHistory, isLoading: isChatLoading } =
		api.chat.getHistory.useQuery(
			{ conversationId: draftData?.conversationId! },
			{ enabled: !!draftData?.conversationId && enableAI },
		);

	// Error handler
	const handleError = useCallback(
		(error: any) => {
			console.error("Editor error:", error);
			setError(error);
			onError?.(error);

			// Check for conflict errors
			if (error.message?.includes("conflict") || error.code === "CONFLICT") {
				editorStore.hasConflict = true;
				onConflict?.(error);
			}
		},
		[onError, onConflict, editorStore],
	);

	// Initialize editor
	useEffect(() => {
		if (!draftId || isInitialized) return;

		const initialize = async () => {
			try {
				setIsLoading(true);
				await integration.initialize(draftId);
				setIsInitialized(true);
			} catch (error) {
				handleError(error);
			} finally {
				setIsLoading(false);
			}
		};

		initialize();

		return () => {
			integration.cleanup();
		};
	}, [draftId, isInitialized, integration, handleError]);

	// Load draft data
	useEffect(() => {
		if (!draftData) return;

		draftStore.updateDraft(draftId!, {
			title: draftData.title,
			description: draftData.description || "",
			content: draftData.content,
			status: draftData.status as "draft" | "published" | "archived",
			tags: draftData.tags || [],
			updatedAt: new Date(draftData.updatedAt),
		});

		editorStore.content = draftData.content;
		editorStore.lastSavedContent = draftData.content;
		editorStore.currentDraftId = draftId!;
	}, [draftData, draftId, draftStore, editorStore]);

	// Load versions
	useEffect(() => {
		if (!versions || !draftId) return;

		versionStore.setVersions(
			draftId,
			versions.map((v) => ({
				id: v.id,
				name: v.name,
				content: v.content,
				createdAt: new Date(v.createdAt),
				updatedAt: new Date(v.updatedAt),
				draftId,
				isActive: v.isCurrent,
				aiGenerated: v.aiGenerated || false,
				parentVersionId: v.parentVersionId || undefined,
			})),
		);
	}, [versions, draftId, versionStore]);

	// Load chat history
	useEffect(() => {
		if (!chatHistory) return;

		editorStore.chatMessages = chatHistory.map((msg) => ({
			id: msg.id,
			role: msg.role as "user" | "assistant",
			content: msg.content,
			createdAt: new Date(msg.createdAt),
		}));
	}, [chatHistory, editorStore]);

	// Auto-save functionality
	const debouncedSave = useMemo(
		() =>
			debounce(async (content: string) => {
				if (!draftId || !editorStore.isDirty) return;

				try {
					await updateDraftMutation.mutateAsync({
						id: draftId,
						content,
					});
				} catch (error) {
					handleError(error);
				}
			}, autoSaveDelay),
		[
			draftId,
			autoSaveDelay,
			updateDraftMutation,
			editorStore.isDirty,
			handleError,
		],
	);

	// Watch for content changes
	useEffect(() => {
		if (!autoSave || !draftId) return;

		const unsubscribe = useEditorStore.subscribe(
			(state) => state.content,
			(content) => {
				debouncedSave(content);
			},
		);

		return () => {
			unsubscribe();
			debouncedSave.cancel();
		};
	}, [autoSave, draftId, debouncedSave]);

	// Public API
	const createDraft = useCallback(
		async (title: string, content = "") => {
			const result = await createDraftMutation.mutateAsync({
				title,
				content,
				description: "",
				status: "draft",
			});
			return result.id;
		},
		[createDraftMutation],
	);

	const saveDraft = useCallback(
		async (immediate = false) => {
			if (!draftId) return;

			if (immediate) {
				debouncedSave.cancel();
				await updateDraftMutation.mutateAsync({
					id: draftId,
					content: editorStore.content,
				});
			} else {
				debouncedSave(editorStore.content);
			}
		},
		[draftId, debouncedSave, updateDraftMutation, editorStore.content],
	);

	const deleteDraft = useCallback(async () => {
		if (!draftId) return;
		await deleteDraftMutation.mutateAsync({ id: draftId });
	}, [draftId, deleteDraftMutation]);

	const createVersion = useCallback(
		async (name: string) => {
			if (!draftId) return;

			await createVersionMutation.mutateAsync({
				draftId,
				name,
				content: editorStore.content,
				parentVersionId: editorStore.currentVersionId || undefined,
			});
		},
		[draftId, createVersionMutation, editorStore],
	);

	const switchVersion = useCallback(
		async (versionId: string) => {
			if (!draftId) return;

			const version = versionStore.versions
				.get(draftId)
				?.find((v) => v.id === versionId);
			if (version) {
				editorStore.content = version.content;
				editorStore.currentVersionId = versionId;

				// Mark as current version
				await api.version.setCurrent.mutate({
					draftId,
					versionId,
				});
			}
		},
		[draftId, versionStore, editorStore],
	);

	const sendChatMessage = useCallback(
		async (message: string) => {
			if (!draftId || !enableAI) return;

			// Add user message immediately
			const userMessage = {
				id: `msg-${Date.now()}`,
				role: "user" as const,
				content: message,
				createdAt: new Date(),
			};
			editorStore.chatMessages = [...editorStore.chatMessages, userMessage];
			editorStore.isGenerating = true;

			try {
				await streamChatMutation.mutateAsync({
					message,
					context: editorStore.content,
					draftId,
					options: {
						temperature: 0.7,
						maxTokens: 1000,
						model: "gpt-4",
					},
				});
			} finally {
				editorStore.isGenerating = false;
			}
		},
		[draftId, enableAI, editorStore, streamChatMutation],
	);

	const applySuggestion = useCallback(
		async (content: string, prompt: string) => {
			editorStore.updateContent(content);

			if (enableVersioning) {
				await createVersion(`AI: ${prompt.slice(0, 50)}...`);
			}

			await saveDraft(true);
		},
		[editorStore, enableVersioning, createVersion, saveDraft],
	);

	const resolveConflict = useCallback(
		async (
			resolution: "local" | "remote" | "merge",
			mergedContent?: string,
		) => {
			let finalContent = editorStore.content;

			switch (resolution) {
				case "remote":
					if (draftData) {
						finalContent = draftData.content;
					}
					break;
				case "merge":
					if (mergedContent) {
						finalContent = mergedContent;
					}
					break;
			}

			editorStore.content = finalContent;
			editorStore.hasConflict = false;
			editorStore.conflictData = null;

			await saveDraft(true);
		},
		[editorStore, draftData, saveDraft],
	);

	// Return API
	return {
		// State
		isLoading:
			isLoading || isDraftLoading || isVersionsLoading || isChatLoading,
		isInitialized,
		error,
		isDirty: editorStore.isDirty,
		hasConflict: editorStore.hasConflict,

		// Data
		draft: draftData,
		versions: versions || [],
		chatMessages: editorStore.chatMessages,
		content: editorStore.content,

		// Actions
		createDraft,
		saveDraft,
		deleteDraft,
		createVersion,
		switchVersion,
		sendChatMessage,
		applySuggestion,
		resolveConflict,
		updateContent: editorStore.updateContent,

		// UI State
		isGenerating: editorStore.isGenerating,
		isSaving: updateDraftMutation.isPending,
		saveError: updateDraftMutation.error,
		chatError: editorStore.chatError,

		// Utilities
		wordCount: editorStore.calculateWordCount(),
		readingTime: editorStore.calculateReadingTime(),
		canUndo: editorStore.canUndo(),
		canRedo: editorStore.canRedo(),
		undo: editorStore.undo,
		redo: editorStore.redo,
	};
}
