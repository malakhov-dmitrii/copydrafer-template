import { useDraftStore } from "@/stores/draft-store";
import { useEditorIntegration } from "@/stores/editor-integration-store";
import { useEditorStore } from "@/stores/editor-store";
import { useVersionStore } from "@/stores/version-store";
import { TRPCReactProvider } from "@/trpc/react";
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIChat } from "../ai-chat";
import { DraftEditor } from "../draft-editor";
import { DraftList } from "../draft-list";
import { DualPaneLayout } from "../dual-pane-layout";
import { VersionSelector } from "../version-selector";

// Mock tRPC
vi.mock("@/trpc/react", () => ({
	api: {
		draft: {
			get: { query: vi.fn() },
			create: { mutate: vi.fn() },
			update: { mutate: vi.fn() },
			delete: { mutate: vi.fn() },
			list: { query: vi.fn() },
		},
		version: {
			get: { query: vi.fn() },
			create: { mutate: vi.fn() },
			list: { query: vi.fn() },
			setCurrent: { mutate: vi.fn() },
		},
		chat: {
			getHistory: { query: vi.fn() },
			sendMessage: { mutate: vi.fn() },
		},
		aiChat: {
			streamChat: { mutate: vi.fn() },
			generateContent: { mutate: vi.fn() },
		},
		autosave: {
			save: { mutate: vi.fn() },
		},
	},
	TRPCReactProvider: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
}));

// Test data
const mockDraft = {
	id: "draft-1",
	title: "Test Draft",
	description: "Test description",
	content: "Initial content",
	status: "draft" as const,
	tags: ["test"],
	createdAt: new Date("2024-01-01"),
	updatedAt: new Date("2024-01-01"),
	wordCount: 2,
	versionCount: 1,
	userId: "user-1",
	conversationId: "conv-1",
};

const mockVersions = [
	{
		id: "version-1",
		name: "Version 1",
		content: "Version 1 content",
		draftId: "draft-1",
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		isCurrent: true,
		aiGenerated: false,
		parentVersionId: null,
	},
	{
		id: "version-2",
		name: "AI Version",
		content: "AI generated content",
		draftId: "draft-1",
		createdAt: new Date("2024-01-02"),
		updatedAt: new Date("2024-01-02"),
		isCurrent: false,
		aiGenerated: true,
		parentVersionId: "version-1",
	},
];

const mockChatHistory = [
	{
		id: "msg-1",
		role: "user",
		content: "Help me improve this text",
		createdAt: new Date("2024-01-01"),
		conversationId: "conv-1",
	},
	{
		id: "msg-2",
		role: "assistant",
		content: "Here are my suggestions...",
		createdAt: new Date("2024-01-01"),
		conversationId: "conv-1",
	},
];

describe("Editor Integration Tests", () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
		// Reset all stores
		useEditorStore.getState().clearErrors();
		useDraftStore.getState().clearFilters();
		useVersionStore.getState().clearVersions();

		// Setup mock responses
		vi.mocked(api.draft.get.query).mockResolvedValue(mockDraft);
		vi.mocked(api.draft.list.query).mockResolvedValue([mockDraft]);
		vi.mocked(api.version.list.query).mockResolvedValue(mockVersions);
		vi.mocked(api.chat.getHistory.query).mockResolvedValue(mockChatHistory);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Complete User Journey", () => {
		it("should handle the complete workflow: create draft → write content → chat with AI → manage versions", async () => {
			// Step 1: Create a new draft
			const createResult = { ...mockDraft, id: "new-draft" };
			vi.mocked(api.draft.create.mutate).mockResolvedValue(createResult);

			const { container } = render(
				<TRPCReactProvider>
					<DualPaneLayout
						leftPane={<DraftEditor draft={mockDraft} onSave={vi.fn()} />}
						rightPane={<AIChat draftId={mockDraft.id} />}
					/>
				</TRPCReactProvider>,
			);

			// Verify the layout is rendered
			expect(container.querySelector(".resizable-panels")).toBeInTheDocument();

			// Step 2: Write content in the editor
			const editor = screen.getByRole("textbox", { name: /editor/i });
			await user.clear(editor);
			await user.type(editor, "This is my new content for the draft");

			// Verify content update
			await waitFor(() => {
				expect(useEditorStore.getState().content).toBe(
					"This is my new content for the draft",
				);
			});

			// Step 3: Test auto-save functionality
			vi.mocked(api.autosave.save.mutate).mockResolvedValue({ success: true });

			// Wait for debounced auto-save
			await waitFor(
				() => {
					expect(api.autosave.save.mutate).toHaveBeenCalled();
				},
				{ timeout: 3000 },
			);

			// Step 4: Chat with AI
			const chatInput = screen.getByPlaceholderText(/ask ai/i);
			await user.type(chatInput, "Help me improve this text");

			const sendButton = screen.getByRole("button", { name: /send/i });
			await user.click(sendButton);

			// Mock AI response
			vi.mocked(api.aiChat.streamChat.mutate).mockImplementation(async () => {
				// Simulate streaming response
				return {
					content: "Here is an improved version of your text...",
					usage: { totalTokens: 100 },
				};
			});

			// Wait for AI response
			await waitFor(() => {
				expect(screen.getByText(/improved version/i)).toBeInTheDocument();
			});

			// Step 5: Create a version from AI suggestion
			const createVersionButton = screen.getByRole("button", {
				name: /create version/i,
			});
			await user.click(createVersionButton);

			vi.mocked(api.version.create.mutate).mockResolvedValue({
				...mockVersions[1],
				id: "new-version",
			});

			// Verify version creation
			await waitFor(() => {
				expect(api.version.create.mutate).toHaveBeenCalledWith(
					expect.objectContaining({
						draftId: mockDraft.id,
						content: expect.stringContaining("improved version"),
					}),
				);
			});

			// Step 6: Switch between versions
			const versionSelector = screen.getByRole("combobox", {
				name: /version/i,
			});
			await user.click(versionSelector);

			const versionOption = screen.getByRole("option", { name: /version 1/i });
			await user.click(versionOption);

			// Verify version switch
			await waitFor(() => {
				expect(api.version.setCurrent.mutate).toHaveBeenCalledWith({
					draftId: mockDraft.id,
					versionId: "version-1",
				});
			});
		});

		it("should handle error scenarios gracefully", async () => {
			// Mock API failures
			vi.mocked(api.draft.create.mutate).mockRejectedValue(
				new Error("Network error"),
			);

			render(
				<TRPCReactProvider>
					<DraftList />
				</TRPCReactProvider>,
			);

			const createButton = screen.getByRole("button", { name: /new draft/i });
			await user.click(createButton);

			// Should show error message
			await waitFor(() => {
				expect(screen.getByText(/failed to create/i)).toBeInTheDocument();
			});

			// Should have retry option
			const retryButton = screen.getByRole("button", { name: /retry/i });
			expect(retryButton).toBeInTheDocument();
		});

		it("should handle conflict resolution", async () => {
			// Setup conflict scenario
			const localContent = "Local version of content";
			const remoteContent = "Remote version of content";

			useEditorStore.setState({
				content: localContent,
				lastSavedContent: "Original content",
				hasConflict: true,
				conflictData: {
					localContent,
					remoteContent,
					lastModified: new Date(),
				},
			});

			render(
				<TRPCReactProvider>
					<DraftEditor draft={mockDraft} onSave={vi.fn()} />
				</TRPCReactProvider>,
			);

			// Should show conflict dialog
			await waitFor(() => {
				expect(screen.getByText(/conflict detected/i)).toBeInTheDocument();
			});

			// Choose resolution
			const keepLocalButton = screen.getByRole("button", {
				name: /keep local/i,
			});
			await user.click(keepLocalButton);

			// Verify resolution
			await waitFor(() => {
				expect(useEditorStore.getState().hasConflict).toBe(false);
				expect(useEditorStore.getState().content).toBe(localContent);
			});
		});
	});

	describe("Performance Tests", () => {
		it("should handle large documents efficiently", async () => {
			// Create a large document (10,000 words)
			const largeContent = Array(10000).fill("word").join(" ");
			const largeDraft = {
				...mockDraft,
				content: largeContent,
				wordCount: 10000,
			};

			const startTime = performance.now();

			render(
				<TRPCReactProvider>
					<DraftEditor draft={largeDraft} onSave={vi.fn()} />
				</TRPCReactProvider>,
			);

			const endTime = performance.now();
			const renderTime = endTime - startTime;

			// Should render within acceptable time (< 1 second)
			expect(renderTime).toBeLessThan(1000);

			// Should handle typing without lag
			const editor = screen.getByRole("textbox", { name: /editor/i });
			const typeStartTime = performance.now();

			await user.type(editor, "Additional text");

			const typeEndTime = performance.now();
			const typeTime = typeEndTime - typeStartTime;

			// Typing should be responsive (< 500ms for short text)
			expect(typeTime).toBeLessThan(500);
		});

		it("should handle many versions efficiently", async () => {
			// Create many versions (100)
			const manyVersions = Array(100)
				.fill(null)
				.map((_, i) => ({
					...mockVersions[0],
					id: `version-${i}`,
					name: `Version ${i}`,
					createdAt: new Date(`2024-01-${(i % 28) + 1}`),
				}));

			vi.mocked(api.version.list.query).mockResolvedValue(manyVersions);

			render(
				<TRPCReactProvider>
					<VersionSelector
						draftId={mockDraft.id}
						currentVersionId="version-1"
						onVersionChange={vi.fn()}
					/>
				</TRPCReactProvider>,
			);

			// Should load and display versions efficiently
			await waitFor(() => {
				expect(screen.getByText(/100 versions/i)).toBeInTheDocument();
			});

			// Should handle search/filter efficiently
			const searchInput = screen.getByPlaceholderText(/search versions/i);
			await user.type(searchInput, "Version 50");

			await waitFor(() => {
				expect(screen.getByText("Version 50")).toBeInTheDocument();
			});
		});
	});

	describe("Responsive Design Tests", () => {
		it("should adapt to mobile viewport", async () => {
			// Set mobile viewport
			window.innerWidth = 375;
			window.innerHeight = 667;
			window.dispatchEvent(new Event("resize"));

			render(
				<TRPCReactProvider>
					<DualPaneLayout
						leftPane={<DraftEditor draft={mockDraft} onSave={vi.fn()} />}
						rightPane={<AIChat draftId={mockDraft.id} />}
					/>
				</TRPCReactProvider>,
			);

			// Should stack panels vertically on mobile
			const layout = screen.getByTestId("dual-pane-layout");
			expect(layout).toHaveClass("flex-col");

			// Should show mobile-optimized controls
			expect(
				screen.getByRole("button", { name: /toggle chat/i }),
			).toBeInTheDocument();
		});

		it("should handle tablet viewport", async () => {
			// Set tablet viewport
			window.innerWidth = 768;
			window.innerHeight = 1024;
			window.dispatchEvent(new Event("resize"));

			render(
				<TRPCReactProvider>
					<DualPaneLayout
						leftPane={<DraftEditor draft={mockDraft} onSave={vi.fn()} />}
						rightPane={<AIChat draftId={mockDraft.id} />}
					/>
				</TRPCReactProvider>,
			);

			// Should show side-by-side layout with adjustable split
			const resizeHandle = screen.getByTestId("resize-handle");
			expect(resizeHandle).toBeInTheDocument();

			// Should be draggable
			fireEvent.mouseDown(resizeHandle);
			fireEvent.mouseMove(resizeHandle, { clientX: 400 });
			fireEvent.mouseUp(resizeHandle);

			// Verify pane widths adjusted
			const leftPane = screen.getByTestId("left-pane");
			expect(leftPane.style.width).toBe("400px");
		});
	});

	describe("Network Failure Recovery", () => {
		it("should retry failed operations", async () => {
			let attemptCount = 0;
			vi.mocked(api.draft.update.mutate).mockImplementation(async () => {
				attemptCount++;
				if (attemptCount < 3) {
					throw new Error("Network error");
				}
				return { success: true };
			});

			const integration = useEditorIntegration.getState();

			// Attempt save
			await integration.saveDraftWithSync("Updated content");

			// Should retry and eventually succeed
			await waitFor(() => {
				expect(attemptCount).toBe(3);
				expect(integration.syncQueue.length).toBe(0);
			});
		});

		it("should queue operations when offline", async () => {
			// Simulate offline
			vi.mocked(api.draft.update.mutate).mockRejectedValue(
				new Error("Network offline"),
			);

			const integration = useEditorIntegration.getState();

			// Try multiple operations
			await integration.saveDraftWithSync("Update 1").catch(() => {});
			await integration.saveDraftWithSync("Update 2").catch(() => {});
			await integration.saveDraftWithSync("Update 3").catch(() => {});

			// Should queue all operations
			expect(integration.syncQueue.length).toBe(3);

			// Simulate coming back online
			vi.mocked(api.draft.update.mutate).mockResolvedValue({ success: true });

			// Retry queued operations
			await integration.retryFailedOperations();

			// Queue should be cleared
			expect(integration.syncQueue.length).toBe(0);
		});
	});
});

// Import necessary mocks
import { api } from "@/trpc/react";
