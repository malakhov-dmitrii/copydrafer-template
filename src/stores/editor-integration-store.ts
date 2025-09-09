import type { Draft, Version } from "@/server/db/schema";
import { api } from "@/trpc/react";
import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";

interface EditorState {
	// Current draft context
	currentDraftId: string | null;
	currentVersionId: string | null;
	currentContent: string;

	// Draft data
	draft: Draft | null;
	versions: Version[];
	chatMessages: any[];

	// Editor state
	isEditing: boolean;
	isDirty: boolean;
	lastSavedAt: Date | null;
	autoSaveTimer: NodeJS.Timeout | null;

	// UI state
	isLoadingDraft: boolean;
	isLoadingVersions: boolean;
	isLoadingChat: boolean;
	isSaving: boolean;
	isGeneratingAI: boolean;
	error: string | null;

	// Comparison state
	compareMode: boolean;
	compareVersionId: string | null;

	// Actions
	loadDraft: (draftId: string) => Promise<void>;
	loadVersions: (draftId: string) => Promise<void>;
	loadChatHistory: (draftId: string) => Promise<void>;

	createNewDraft: () => Promise<string>;
	updateDraftMetadata: (title?: string, description?: string) => Promise<void>;
	deleteDraft: (draftId: string) => Promise<void>;

	setContent: (content: string) => void;
	saveContent: (createNewVersion?: boolean) => Promise<void>;
	autoSave: () => void;

	switchVersion: (versionId: string) => Promise<void>;
	createVersionFromAI: (content: string, prompt: string) => Promise<void>;

	enableCompareMode: (baseVersionId: string, compareVersionId: string) => void;
	disableCompareMode: () => void;

	sendChatMessage: (message: string) => Promise<void>;
	generateAIContent: (prompt: string) => Promise<void>;

	resetEditor: () => void;
	setError: (error: string | null) => void;
}

export const useEditorIntegrationStore = create<EditorState>()(
	devtools(
		subscribeWithSelector((set, get) => ({
			// Initial state
			currentDraftId: null,
			currentVersionId: null,
			currentContent: "",

			draft: null,
			versions: [],
			chatMessages: [],

			isEditing: false,
			isDirty: false,
			lastSavedAt: null,
			autoSaveTimer: null,

			isLoadingDraft: false,
			isLoadingVersions: false,
			isLoadingChat: false,
			isSaving: false,
			isGeneratingAI: false,
			error: null,

			compareMode: false,
			compareVersionId: null,

			// Load draft with metadata
			loadDraft: async (draftId: string) => {
				set({ isLoadingDraft: true, error: null });
				try {
					// This would use the tRPC query in a real implementation
					// const draft = await api.draft.get.query({ id: draftId });

					// For now, using mock data
					const mockDraft = {
						id: draftId,
						title: "Sample Draft",
						userId: "user-1",
						targetPlatform: "twitter" as const,
						status: "draft" as const,
						currentVersionId: "v1",
						createdAt: new Date(),
						updatedAt: new Date(),
					};

					set({
						draft: mockDraft as any,
						currentDraftId: draftId,
						isLoadingDraft: false,
					});

					// Load versions and chat history in parallel
					await Promise.all([
						get().loadVersions(draftId),
						get().loadChatHistory(draftId),
					]);
				} catch (error) {
					set({
						error:
							error instanceof Error ? error.message : "Failed to load draft",
						isLoadingDraft: false,
					});
				}
			},

			// Load all versions for a draft
			loadVersions: async (draftId: string) => {
				set({ isLoadingVersions: true });
				try {
					// const versions = await api.version.list.query({ draftId });

					// Mock data
					const mockVersions = [
						{
							id: "v1",
							draftId,
							content: "Initial content",
							versionNumber: 1,
							isPublished: false,
							createdAt: new Date(),
							createdBy: "user-1",
						},
					];

					set({
						versions: mockVersions as any,
						currentVersionId: mockVersions[0]?.id || null,
						currentContent: mockVersions[0]?.content || "",
						isLoadingVersions: false,
					});
				} catch (error) {
					set({
						error:
							error instanceof Error
								? error.message
								: "Failed to load versions",
						isLoadingVersions: false,
					});
				}
			},

			// Load chat history
			loadChatHistory: async (draftId: string) => {
				set({ isLoadingChat: true });
				try {
					// const messages = await api.chat.getHistory.query({ draftId });

					// Mock data
					const mockMessages: any[] = [];

					set({
						chatMessages: mockMessages,
						isLoadingChat: false,
					});
				} catch (error) {
					set({
						error:
							error instanceof Error
								? error.message
								: "Failed to load chat history",
						isLoadingChat: false,
					});
				}
			},

			// Create a new draft
			createNewDraft: async () => {
				set({ isLoadingDraft: true, error: null });
				try {
					// const draft = await api.draft.create.mutate();

					// Mock implementation
					const newDraftId = `draft-${Date.now()}`;

					set({
						currentDraftId: newDraftId,
						draft: {
							id: newDraftId,
							title: "Untitled Draft",
							userId: "user-1",
							targetPlatform: "twitter",
							status: "draft",
							currentVersionId: null,
							createdAt: new Date(),
							updatedAt: new Date(),
						} as any,
						currentContent: "",
						versions: [],
						chatMessages: [],
						isLoadingDraft: false,
					});

					return newDraftId;
				} catch (error) {
					set({
						error:
							error instanceof Error ? error.message : "Failed to create draft",
						isLoadingDraft: false,
					});
					throw error;
				}
			},

			// Update draft metadata
			updateDraftMetadata: async (title?: string, description?: string) => {
				const { currentDraftId, draft } = get();
				if (!currentDraftId || !draft) return;

				set({ isSaving: true });
				try {
					// await api.draft.update.mutate({ id: currentDraftId, title, description });

					set({
						draft: { ...draft, title: title || draft.title },
						isSaving: false,
					});
				} catch (error) {
					set({
						error:
							error instanceof Error ? error.message : "Failed to update draft",
						isSaving: false,
					});
				}
			},

			// Delete draft
			deleteDraft: async (draftId: string) => {
				try {
					// await api.draft.delete.mutate({ id: draftId });

					if (get().currentDraftId === draftId) {
						get().resetEditor();
					}
				} catch (error) {
					set({
						error:
							error instanceof Error ? error.message : "Failed to delete draft",
					});
				}
			},

			// Set content (for typing)
			setContent: (content: string) => {
				set({
					currentContent: content,
					isDirty: true,
					isEditing: true,
				});

				// Clear existing timer
				const { autoSaveTimer } = get();
				if (autoSaveTimer) {
					clearTimeout(autoSaveTimer);
				}

				// Set new auto-save timer (500ms debounce)
				const timer = setTimeout(() => {
					get().autoSave();
				}, 500);

				set({ autoSaveTimer: timer });
			},

			// Save content
			saveContent: async (createNewVersion = false) => {
				const { currentDraftId, currentVersionId, currentContent } = get();
				if (!currentDraftId) return;

				set({ isSaving: true, error: null });
				try {
					if (createNewVersion || !currentVersionId) {
						// Create new version
						// const version = await api.version.create.mutate({
						//   draftId: currentDraftId,
						//   content: currentContent,
						//   source: "user",
						// });

						const newVersion = {
							id: `v-${Date.now()}`,
							draftId: currentDraftId,
							content: currentContent,
							versionNumber: get().versions.length + 1,
							isPublished: false,
							createdAt: new Date(),
							createdBy: "user-1",
						};

						set({
							versions: [...get().versions, newVersion as any],
							currentVersionId: newVersion.id,
							isDirty: false,
							isSaving: false,
							lastSavedAt: new Date(),
						});
					} else {
						// Update existing version (auto-save)
						// await api.autosave.saveContent.mutate({
						//   draftId: currentDraftId,
						//   content: currentContent,
						//   versionId: currentVersionId,
						// });

						set({
							isDirty: false,
							isSaving: false,
							lastSavedAt: new Date(),
						});
					}
				} catch (error) {
					set({
						error:
							error instanceof Error ? error.message : "Failed to save content",
						isSaving: false,
					});
				}
			},

			// Auto-save
			autoSave: () => {
				const { isDirty, currentDraftId } = get();
				if (isDirty && currentDraftId) {
					get().saveContent(false);
				}
			},

			// Switch version
			switchVersion: async (versionId: string) => {
				const version = get().versions.find((v) => v.id === versionId);
				if (!version) return;

				set({
					currentVersionId: versionId,
					currentContent: version.content,
					isDirty: false,
					compareMode: false,
					compareVersionId: null,
				});
			},

			// Create version from AI
			createVersionFromAI: async (content: string, prompt: string) => {
				const { currentDraftId } = get();
				if (!currentDraftId) return;

				set({ isGeneratingAI: true, error: null });
				try {
					// const version = await api.chat.generateContent.mutate({
					//   draftId: currentDraftId,
					//   prompt,
					//   baseVersionId: get().currentVersionId,
					// });

					const newVersion = {
						id: `v-ai-${Date.now()}`,
						draftId: currentDraftId,
						content,
						versionNumber: get().versions.length + 1,
						isPublished: false,
						createdAt: new Date(),
						createdBy: "ai",
					};

					set({
						versions: [...get().versions, newVersion as any],
						currentVersionId: newVersion.id,
						currentContent: content,
						isGeneratingAI: false,
						isDirty: false,
					});
				} catch (error) {
					set({
						error:
							error instanceof Error
								? error.message
								: "Failed to generate AI version",
						isGeneratingAI: false,
					});
				}
			},

			// Enable comparison mode
			enableCompareMode: (baseVersionId: string, compareVersionId: string) => {
				set({
					compareMode: true,
					currentVersionId: baseVersionId,
					compareVersionId,
				});
			},

			// Disable comparison mode
			disableCompareMode: () => {
				set({
					compareMode: false,
					compareVersionId: null,
				});
			},

			// Send chat message
			sendChatMessage: async (message: string) => {
				const { currentDraftId, currentContent } = get();
				if (!currentDraftId) return;

				set({ isGeneratingAI: true, error: null });
				try {
					// const response = await api.chat.sendMessage.mutate({
					//   draftId: currentDraftId,
					//   message,
					//   context: { currentContent },
					// });

					const userMessage = {
						id: `msg-${Date.now()}`,
						role: "user" as const,
						content: message,
						createdAt: new Date(),
					};

					const aiMessage = {
						id: `msg-${Date.now() + 1}`,
						role: "assistant" as const,
						content: "AI response would go here",
						createdAt: new Date(),
					};

					set({
						chatMessages: [...get().chatMessages, userMessage, aiMessage],
						isGeneratingAI: false,
					});
				} catch (error) {
					set({
						error:
							error instanceof Error ? error.message : "Failed to send message",
						isGeneratingAI: false,
					});
				}
			},

			// Generate AI content
			generateAIContent: async (prompt: string) => {
				const { currentDraftId } = get();
				if (!currentDraftId) return;

				set({ isGeneratingAI: true, error: null });
				try {
					// const response = await api.chat.generateContent.mutate({
					//   draftId: currentDraftId,
					//   prompt,
					//   baseVersionId: get().currentVersionId,
					// });

					const generatedContent = `AI generated content based on: ${prompt}`;
					await get().createVersionFromAI(generatedContent, prompt);
				} catch (error) {
					set({
						error:
							error instanceof Error
								? error.message
								: "Failed to generate content",
						isGeneratingAI: false,
					});
				}
			},

			// Reset editor
			resetEditor: () => {
				const { autoSaveTimer } = get();
				if (autoSaveTimer) {
					clearTimeout(autoSaveTimer);
				}

				set({
					currentDraftId: null,
					currentVersionId: null,
					currentContent: "",
					draft: null,
					versions: [],
					chatMessages: [],
					isEditing: false,
					isDirty: false,
					lastSavedAt: null,
					autoSaveTimer: null,
					isLoadingDraft: false,
					isLoadingVersions: false,
					isLoadingChat: false,
					isSaving: false,
					isGeneratingAI: false,
					error: null,
					compareMode: false,
					compareVersionId: null,
				});
			},

			// Set error
			setError: (error: string | null) => {
				set({ error });
			},
		})),
		{
			name: "editor-integration-store",
		},
	),
);

// Subscribe to auto-save on content changes
if (typeof window !== "undefined") {
	useEditorIntegrationStore.subscribe(
		(state) => state.isDirty,
		(isDirty) => {
			if (isDirty) {
				// Auto-save is handled by the setContent action with debouncing
			}
		},
	);
}
