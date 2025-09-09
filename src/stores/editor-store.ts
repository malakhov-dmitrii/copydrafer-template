import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import type { Draft } from "./draft-store";
import type { Version } from "./version-store";

export interface ChatMessage {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
	createdAt: Date;
	isStreaming?: boolean;
	error?: string;
}

export interface EditorState {
	// Current editing state
	currentDraftId: string | null;
	currentVersionId: string | null;
	content: string;
	isDirty: boolean;
	lastSavedContent: string;
	lastSavedAt: Date | null;

	// Auto-save state
	isAutoSaveEnabled: boolean;
	autoSaveDelay: number;
	autoSaveTimer: NodeJS.Timeout | null;
	isSaving: boolean;
	saveError: string | null;

	// AI Chat state
	chatMessages: ChatMessage[];
	isGenerating: boolean;
	streamingContent: string;
	chatError: string | null;

	// UI state
	leftPaneWidth: number;
	rightPaneWidth: number;
	isLeftPaneCollapsed: boolean;
	isRightPaneCollapsed: boolean;

	// Optimistic update state
	optimisticUpdates: Map<string, any>;
	conflictResolution: "local" | "remote" | "merge";
	hasConflict: boolean;
	conflictData: any | null;

	// Loading and error states
	isLoadingDraft: boolean;
	isLoadingVersion: boolean;
	loadError: string | null;

	// Collaboration state (for future)
	collaborators: string[];
	isLocked: boolean;
	lockedBy: string | null;
}

export interface EditorActions {
	// Draft management
	loadDraft: (draftId: string) => Promise<void>;
	createDraft: (title: string, content?: string) => Promise<string>;
	saveDraft: (immediate?: boolean) => Promise<void>;
	deleteDraft: () => Promise<void>;

	// Version management
	loadVersion: (versionId: string) => Promise<void>;
	createVersion: (name: string) => Promise<void>;
	createVersionFromAI: (content: string, prompt: string) => Promise<void>;
	switchVersion: (versionId: string) => Promise<void>;

	// Content management
	updateContent: (content: string) => void;
	resetContent: () => void;
	importContent: (
		content: string,
		format?: "markdown" | "html" | "text",
	) => void;
	exportContent: (format: "markdown" | "html" | "text") => string;

	// Auto-save management
	enableAutoSave: (delay?: number) => void;
	disableAutoSave: () => void;
	triggerAutoSave: () => void;
	cancelAutoSave: () => void;

	// AI Chat management
	sendChatMessage: (message: string) => Promise<void>;
	clearChat: () => void;
	regenerateLastResponse: () => Promise<void>;
	stopGeneration: () => void;
	applySuggestion: (content: string) => void;

	// UI state management
	setPaneWidth: (pane: "left" | "right", width: number) => void;
	togglePane: (pane: "left" | "right") => void;
	resetLayout: () => void;

	// Conflict resolution
	resolveConflict: (
		resolution: "local" | "remote" | "merge",
		mergedContent?: string,
	) => Promise<void>;
	checkForConflicts: () => Promise<void>;

	// Error handling
	clearErrors: () => void;
	setError: (error: string, type?: "save" | "load" | "chat") => void;

	// Utility
	calculateWordCount: () => number;
	calculateReadingTime: () => number;
	getUnsavedChanges: () => boolean;
	canUndo: () => boolean;
	canRedo: () => boolean;
	undo: () => void;
	redo: () => void;
}

interface EditorStore extends EditorState, EditorActions {}

// History management
interface HistoryEntry {
	content: string;
	timestamp: Date;
}

const MAX_HISTORY_SIZE = 50;
let history: HistoryEntry[] = [];
let historyIndex = -1;

export const useEditorStore = create<EditorStore>()(
	devtools(
		subscribeWithSelector((set, get) => ({
			// Initial state
			currentDraftId: null,
			currentVersionId: null,
			content: "",
			isDirty: false,
			lastSavedContent: "",
			lastSavedAt: null,

			isAutoSaveEnabled: true,
			autoSaveDelay: 2000,
			autoSaveTimer: null,
			isSaving: false,
			saveError: null,

			chatMessages: [],
			isGenerating: false,
			streamingContent: "",
			chatError: null,

			leftPaneWidth: 50,
			rightPaneWidth: 50,
			isLeftPaneCollapsed: false,
			isRightPaneCollapsed: false,

			optimisticUpdates: new Map(),
			conflictResolution: "local",
			hasConflict: false,
			conflictData: null,

			isLoadingDraft: false,
			isLoadingVersion: false,
			loadError: null,

			collaborators: [],
			isLocked: false,
			lockedBy: null,

			// Draft management
			loadDraft: async (draftId: string) => {
				set({ isLoadingDraft: true, loadError: null });
				try {
					// This will be replaced with actual tRPC call
					// const draft = await api.draft.get.query({ id: draftId });
					const draft = { id: draftId, content: "Sample content" }; // Mock for now

					set({
						currentDraftId: draftId,
						content: draft.content,
						lastSavedContent: draft.content,
						isDirty: false,
						isLoadingDraft: false,
					});

					// Add to history
					history = [{ content: draft.content, timestamp: new Date() }];
					historyIndex = 0;
				} catch (error) {
					set({
						isLoadingDraft: false,
						loadError:
							error instanceof Error ? error.message : "Failed to load draft",
					});
				}
			},

			createDraft: async (title: string, content = "") => {
				try {
					// This will be replaced with actual tRPC call
					// const draft = await api.draft.create.mutate({ title, content });
					const draftId = `draft-${Date.now()}`;

					set({
						currentDraftId: draftId,
						content,
						lastSavedContent: content,
						isDirty: false,
					});

					return draftId;
				} catch (error) {
					throw new Error(
						error instanceof Error ? error.message : "Failed to create draft",
					);
				}
			},

			saveDraft: async (immediate = false) => {
				const state = get();
				if (!state.currentDraftId || !state.isDirty) return;

				// Cancel any pending auto-save
				if (state.autoSaveTimer) {
					clearTimeout(state.autoSaveTimer);
					set({ autoSaveTimer: null });
				}

				set({ isSaving: true, saveError: null });

				try {
					// Optimistic update
					const optimisticId = `save-${Date.now()}`;
					set((state) => ({
						optimisticUpdates: new Map(state.optimisticUpdates).set(
							optimisticId,
							{
								content: state.content,
								timestamp: new Date(),
							},
						),
					}));

					// This will be replaced with actual tRPC call
					// await api.draft.update.mutate({
					//   id: state.currentDraftId,
					//   content: state.content,
					// });

					// Simulate network delay
					await new Promise((resolve) => setTimeout(resolve, 500));

					set((state) => {
						const updates = new Map(state.optimisticUpdates);
						updates.delete(optimisticId);
						return {
							lastSavedContent: state.content,
							lastSavedAt: new Date(),
							isDirty: false,
							isSaving: false,
							optimisticUpdates: updates,
						};
					});
				} catch (error) {
					set({
						isSaving: false,
						saveError:
							error instanceof Error ? error.message : "Failed to save draft",
					});

					// Check for conflicts
					await get().checkForConflicts();
				}
			},

			deleteDraft: async () => {
				const state = get();
				if (!state.currentDraftId) return;

				try {
					// This will be replaced with actual tRPC call
					// await api.draft.delete.mutate({ id: state.currentDraftId });

					set({
						currentDraftId: null,
						content: "",
						lastSavedContent: "",
						isDirty: false,
					});
				} catch (error) {
					throw new Error(
						error instanceof Error ? error.message : "Failed to delete draft",
					);
				}
			},

			// Version management
			loadVersion: async (versionId: string) => {
				set({ isLoadingVersion: true, loadError: null });
				try {
					// This will be replaced with actual tRPC call
					// const version = await api.version.get.query({ id: versionId });
					const version = { id: versionId, content: "Version content" }; // Mock

					set({
						currentVersionId: versionId,
						content: version.content,
						isLoadingVersion: false,
					});
				} catch (error) {
					set({
						isLoadingVersion: false,
						loadError:
							error instanceof Error ? error.message : "Failed to load version",
					});
				}
			},

			createVersion: async (name: string) => {
				const state = get();
				if (!state.currentDraftId) return;

				try {
					// This will be replaced with actual tRPC call
					// await api.version.create.mutate({
					//   draftId: state.currentDraftId,
					//   name,
					//   content: state.content,
					// });
				} catch (error) {
					throw new Error(
						error instanceof Error ? error.message : "Failed to create version",
					);
				}
			},

			createVersionFromAI: async (content: string, prompt: string) => {
				const state = get();
				if (!state.currentDraftId) return;

				try {
					// This will be replaced with actual tRPC call
					const name = `AI: ${prompt.slice(0, 50)}...`;
					await get().createVersion(name);
					set({ content });
				} catch (error) {
					throw new Error(
						error instanceof Error
							? error.message
							: "Failed to create AI version",
					);
				}
			},

			switchVersion: async (versionId: string) => {
				await get().loadVersion(versionId);
			},

			// Content management
			updateContent: (content: string) => {
				const state = get();

				// Add to history for undo/redo
				if (history.length === 0 || history[historyIndex].content !== content) {
					// Truncate history if we're not at the end
					history = history.slice(0, historyIndex + 1);
					history.push({ content, timestamp: new Date() });

					// Limit history size
					if (history.length > MAX_HISTORY_SIZE) {
						history = history.slice(-MAX_HISTORY_SIZE);
					}
					historyIndex = history.length - 1;
				}

				set({
					content,
					isDirty: content !== state.lastSavedContent,
				});

				// Trigger auto-save if enabled
				if (state.isAutoSaveEnabled && content !== state.lastSavedContent) {
					get().triggerAutoSave();
				}
			},

			resetContent: () => {
				const state = get();
				set({
					content: state.lastSavedContent,
					isDirty: false,
				});
			},

			importContent: (content: string, format = "text") => {
				// Format conversion would go here
				let processedContent = content;

				if (format === "html") {
					// Convert HTML to markdown or plain text
					processedContent = content.replace(/<[^>]*>/g, "");
				}

				get().updateContent(processedContent);
			},

			exportContent: (format: "markdown" | "html" | "text") => {
				const state = get();
				// Format conversion would go here
				return state.content;
			},

			// Auto-save management
			enableAutoSave: (delay = 2000) => {
				set({ isAutoSaveEnabled: true, autoSaveDelay: delay });
			},

			disableAutoSave: () => {
				const state = get();
				if (state.autoSaveTimer) {
					clearTimeout(state.autoSaveTimer);
				}
				set({ isAutoSaveEnabled: false, autoSaveTimer: null });
			},

			triggerAutoSave: () => {
				const state = get();

				// Clear existing timer
				if (state.autoSaveTimer) {
					clearTimeout(state.autoSaveTimer);
				}

				// Set new timer
				const timer = setTimeout(() => {
					get().saveDraft();
				}, state.autoSaveDelay);

				set({ autoSaveTimer: timer });
			},

			cancelAutoSave: () => {
				const state = get();
				if (state.autoSaveTimer) {
					clearTimeout(state.autoSaveTimer);
					set({ autoSaveTimer: null });
				}
			},

			// AI Chat management
			sendChatMessage: async (message: string) => {
				const state = get();

				// Add user message
				const userMessage: ChatMessage = {
					id: `msg-${Date.now()}`,
					role: "user",
					content: message,
					createdAt: new Date(),
				};

				set((state) => ({
					chatMessages: [...state.chatMessages, userMessage],
					isGenerating: true,
					chatError: null,
				}));

				try {
					// This will be replaced with actual tRPC streaming call
					// const stream = await api.chat.sendMessage.subscribe({
					//   message,
					//   context: state.content,
					// });

					// Mock streaming response
					const assistantMessage: ChatMessage = {
						id: `msg-${Date.now() + 1}`,
						role: "assistant",
						content: "",
						createdAt: new Date(),
						isStreaming: true,
					};

					set((state) => ({
						chatMessages: [...state.chatMessages, assistantMessage],
					}));

					// Simulate streaming
					const fullResponse = "This is a simulated AI response.";
					for (let i = 0; i <= fullResponse.length; i++) {
						await new Promise((resolve) => setTimeout(resolve, 50));

						set((state) => ({
							chatMessages: state.chatMessages.map((msg) =>
								msg.id === assistantMessage.id
									? { ...msg, content: fullResponse.slice(0, i) }
									: msg,
							),
						}));
					}

					set((state) => ({
						chatMessages: state.chatMessages.map((msg) =>
							msg.id === assistantMessage.id
								? { ...msg, isStreaming: false }
								: msg,
						),
						isGenerating: false,
					}));
				} catch (error) {
					set({
						isGenerating: false,
						chatError:
							error instanceof Error ? error.message : "Failed to send message",
					});
				}
			},

			clearChat: () => {
				set({ chatMessages: [], chatError: null });
			},

			regenerateLastResponse: async () => {
				const state = get();
				const lastUserMessage = [...state.chatMessages]
					.reverse()
					.find((msg) => msg.role === "user");

				if (lastUserMessage) {
					// Remove last assistant message
					set((state) => ({
						chatMessages: state.chatMessages.filter(
							(msg, index) =>
								!(
									msg.role === "assistant" &&
									index === state.chatMessages.length - 1
								),
						),
					}));

					// Resend the message
					await get().sendChatMessage(lastUserMessage.content);
				}
			},

			stopGeneration: () => {
				// This would cancel the streaming subscription
				set({ isGenerating: false });
			},

			applySuggestion: (content: string) => {
				get().updateContent(content);
				get().createVersionFromAI(content, "Applied from chat");
			},

			// UI state management
			setPaneWidth: (pane: "left" | "right", width: number) => {
				if (pane === "left") {
					set({ leftPaneWidth: width, rightPaneWidth: 100 - width });
				} else {
					set({ rightPaneWidth: width, leftPaneWidth: 100 - width });
				}
			},

			togglePane: (pane: "left" | "right") => {
				if (pane === "left") {
					set((state) => ({ isLeftPaneCollapsed: !state.isLeftPaneCollapsed }));
				} else {
					set((state) => ({
						isRightPaneCollapsed: !state.isRightPaneCollapsed,
					}));
				}
			},

			resetLayout: () => {
				set({
					leftPaneWidth: 50,
					rightPaneWidth: 50,
					isLeftPaneCollapsed: false,
					isRightPaneCollapsed: false,
				});
			},

			// Conflict resolution
			resolveConflict: async (
				resolution: "local" | "remote" | "merge",
				mergedContent?: string,
			) => {
				const state = get();

				try {
					let finalContent = state.content;

					if (resolution === "remote") {
						// Load remote version
						finalContent = state.conflictData?.remoteContent || state.content;
					} else if (resolution === "merge" && mergedContent) {
						finalContent = mergedContent;
					}

					set({
						content: finalContent,
						hasConflict: false,
						conflictData: null,
					});

					// Save resolved content
					await get().saveDraft(true);
				} catch (error) {
					set({
						saveError:
							error instanceof Error
								? error.message
								: "Failed to resolve conflict",
					});
				}
			},

			checkForConflicts: async () => {
				const state = get();
				if (!state.currentDraftId) return;

				try {
					// This will be replaced with actual tRPC call
					// const remoteDraft = await api.draft.get.query({ id: state.currentDraftId });

					// Mock conflict detection
					const hasConflict = false;

					if (hasConflict) {
						set({
							hasConflict: true,
							conflictData: {
								localContent: state.content,
								remoteContent: "Remote content",
								lastModified: new Date(),
							},
						});
					}
				} catch (error) {
					console.error("Failed to check for conflicts:", error);
				}
			},

			// Error handling
			clearErrors: () => {
				set({ saveError: null, loadError: null, chatError: null });
			},

			setError: (error: string, type = "save") => {
				switch (type) {
					case "save":
						set({ saveError: error });
						break;
					case "load":
						set({ loadError: error });
						break;
					case "chat":
						set({ chatError: error });
						break;
				}
			},

			// Utility
			calculateWordCount: () => {
				const state = get();
				return state.content.trim().split(/\s+/).filter(Boolean).length;
			},

			calculateReadingTime: () => {
				const wordCount = get().calculateWordCount();
				const wordsPerMinute = 200;
				return Math.ceil(wordCount / wordsPerMinute);
			},

			getUnsavedChanges: () => {
				const state = get();
				return state.isDirty;
			},

			canUndo: () => {
				return historyIndex > 0;
			},

			canRedo: () => {
				return historyIndex < history.length - 1;
			},

			undo: () => {
				if (get().canUndo()) {
					historyIndex--;
					set({ content: history[historyIndex].content });
				}
			},

			redo: () => {
				if (get().canRedo()) {
					historyIndex++;
					set({ content: history[historyIndex].content });
				}
			},
		})),
		{
			name: "editor-store",
		},
	),
);

// Auto-save cleanup on unmount
if (typeof window !== "undefined") {
	window.addEventListener("beforeunload", (e) => {
		const state = useEditorStore.getState();
		if (state.isDirty) {
			e.preventDefault();
			e.returnValue =
				"You have unsaved changes. Are you sure you want to leave?";
		}
	});
}
