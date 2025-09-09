import { useEditorIntegrationStore } from "@/stores/editor-integration-store";
import { api } from "@/trpc/react";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

interface UseEditorIntegrationOptions {
	draftId?: string;
	autoLoad?: boolean;
	enableAutoSave?: boolean;
}

export function useEditorIntegration({
	draftId,
	autoLoad = true,
	enableAutoSave = true,
}: UseEditorIntegrationOptions = {}) {
	const store = useEditorIntegrationStore();

	// tRPC mutations
	const createDraftMutation = api.draft.create.useMutation();
	const updateDraftMutation = api.draft.update.useMutation();
	const deleteDraftMutation = api.draft.delete.useMutation();

	const createVersionMutation = api.version.create.useMutation();
	const setCurrentVersionMutation = api.version.setCurrent.useMutation();

	const sendMessageMutation = api.chat.sendMessage.useMutation();
	const generateContentMutation = api.chat.generateContent.useMutation();

	const autoSaveMutation = api.autosave.saveContent.useMutation();

	// tRPC queries
	const { data: draftData, isLoading: isDraftLoading } = api.draft.get.useQuery(
		{ id: draftId! },
		{ enabled: !!draftId && autoLoad },
	);

	const { data: versionsData, isLoading: isVersionsLoading } =
		api.version.list.useQuery(
			{ draftId: draftId! },
			{ enabled: !!draftId && autoLoad },
		);

	const { data: chatHistory, isLoading: isChatLoading } =
		api.chat.getHistory.useQuery(
			{ draftId: draftId! },
			{ enabled: !!draftId && autoLoad },
		);

	// Load data when available
	useEffect(() => {
		if (draftData && !isDraftLoading) {
			store.draft = draftData.draft;
			store.currentDraftId = draftData.draft.id;

			if (draftData.currentVersion) {
				store.currentVersionId = draftData.currentVersion.id;
				store.currentContent = draftData.currentVersion.content;
			}
		}
	}, [draftData, isDraftLoading]);

	useEffect(() => {
		if (versionsData && !isVersionsLoading) {
			store.versions = versionsData.versions;
		}
	}, [versionsData, isVersionsLoading]);

	useEffect(() => {
		if (chatHistory && !isChatLoading) {
			store.chatMessages = chatHistory.messages;
		}
	}, [chatHistory, isChatLoading]);

	// Enhanced actions with real API calls
	const createNewDraft = useCallback(async () => {
		try {
			const result = await createDraftMutation.mutateAsync();
			store.currentDraftId = result.id;
			toast.success("New draft created");
			return result.id;
		} catch (error) {
			toast.error("Failed to create draft");
			throw error;
		}
	}, [createDraftMutation, store]);

	const saveContent = useCallback(
		async (createNewVersion = false) => {
			if (!store.currentDraftId) return;

			try {
				if (createNewVersion || !store.currentVersionId) {
					const version = await createVersionMutation.mutateAsync({
						draftId: store.currentDraftId,
						content: store.currentContent,
						source: "user",
					});

					store.currentVersionId = version.version.id;
					store.versions = [...store.versions, version.version];
					toast.success("New version created");
				} else if (enableAutoSave) {
					await autoSaveMutation.mutateAsync({
						draftId: store.currentDraftId,
						content: store.currentContent,
						versionId: store.currentVersionId,
					});
				}

				store.isDirty = false;
				store.lastSavedAt = new Date();
			} catch (error) {
				toast.error("Failed to save content");
				throw error;
			}
		},
		[
			store.currentDraftId,
			store.currentVersionId,
			store.currentContent,
			createVersionMutation,
			autoSaveMutation,
			enableAutoSave,
		],
	);

	const sendChatMessage = useCallback(
		async (message: string) => {
			if (!store.currentDraftId) return;

			try {
				store.isGeneratingAI = true;
				const result = await sendMessageMutation.mutateAsync({
					draftId: store.currentDraftId,
					message,
					context: { currentContent: store.currentContent },
				});

				store.chatMessages = [
					...store.chatMessages,
					result.userMessage,
					result.aiResponse,
				];

				toast.success("AI response received");
			} catch (error) {
				toast.error("Failed to get AI response");
				throw error;
			} finally {
				store.isGeneratingAI = false;
			}
		},
		[store.currentDraftId, store.currentContent, sendMessageMutation],
	);

	const generateAIContent = useCallback(
		async (prompt: string) => {
			if (!store.currentDraftId) return;

			try {
				store.isGeneratingAI = true;
				const result = await generateContentMutation.mutateAsync({
					draftId: store.currentDraftId,
					prompt,
					baseVersionId: store.currentVersionId,
				});

				store.versions = [...store.versions, result.version];
				store.currentVersionId = result.version.id;
				store.currentContent = result.version.content;
				store.chatMessages = [...store.chatMessages, result.chatMessage];

				toast.success("AI content generated");
			} catch (error) {
				toast.error("Failed to generate content");
				throw error;
			} finally {
				store.isGeneratingAI = false;
			}
		},
		[store.currentDraftId, store.currentVersionId, generateContentMutation],
	);

	const switchVersion = useCallback(
		async (versionId: string) => {
			const version = store.versions.find((v) => v.id === versionId);
			if (!version || !store.currentDraftId) return;

			try {
				await setCurrentVersionMutation.mutateAsync({
					draftId: store.currentDraftId,
					versionId,
				});

				store.currentVersionId = versionId;
				store.currentContent = version.content;
				store.isDirty = false;

				toast.success("Switched to version " + version.versionNumber);
			} catch (error) {
				toast.error("Failed to switch version");
				throw error;
			}
		},
		[store.currentDraftId, store.versions, setCurrentVersionMutation],
	);

	const deleteDraft = useCallback(async () => {
		if (!store.currentDraftId) return;

		try {
			await deleteDraftMutation.mutateAsync({ id: store.currentDraftId });
			store.resetEditor();
			toast.success("Draft deleted");
		} catch (error) {
			toast.error("Failed to delete draft");
			throw error;
		}
	}, [store.currentDraftId, deleteDraftMutation]);

	// Auto-save effect
	useEffect(() => {
		if (!enableAutoSave || !store.isDirty) return;

		const timer = setTimeout(() => {
			saveContent(false);
		}, 500);

		return () => clearTimeout(timer);
	}, [store.currentContent, store.isDirty, enableAutoSave, saveContent]);

	return {
		// State
		draft: store.draft,
		versions: store.versions,
		chatMessages: store.chatMessages,
		currentContent: store.currentContent,
		currentVersionId: store.currentVersionId,
		isDirty: store.isDirty,
		lastSavedAt: store.lastSavedAt,

		// Loading states
		isLoading:
			isDraftLoading ||
			isVersionsLoading ||
			isChatLoading ||
			store.isLoadingDraft,
		isSaving: store.isSaving || autoSaveMutation.isPending,
		isGeneratingAI: store.isGeneratingAI,

		// Comparison
		compareMode: store.compareMode,
		compareVersionId: store.compareVersionId,

		// Actions
		createNewDraft,
		saveContent,
		setContent: store.setContent,
		switchVersion,
		deleteDraft,
		sendChatMessage,
		generateAIContent,
		enableCompareMode: store.enableCompareMode,
		disableCompareMode: store.disableCompareMode,

		// Utilities
		resetEditor: store.resetEditor,
		error: store.error,
	};
}
