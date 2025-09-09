import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DraftEditor } from "../draft-editor";

const mockDraft = {
	id: "d1",
	title: "Sample Draft",
	description: "A test draft for unit testing",
	content: "This is the initial content of the draft.",
	status: "draft" as const,
	tags: ["test", "sample"],
	createdAt: new Date("2024-01-01"),
	updatedAt: new Date("2024-01-02"),
	wordCount: 8,
	versionCount: 1,
};

describe("DraftEditor", () => {
	const mockOnSave = vi.fn();
	const mockOnPublish = vi.fn();
	const mockOnDelete = vi.fn();
	const mockOnTagAdd = vi.fn();
	const mockOnTagRemove = vi.fn();
	const mockOnStatusChange = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders draft title and content", () => {
		render(<DraftEditor draft={mockDraft} onSave={mockOnSave} />);

		expect(screen.getByDisplayValue("Sample Draft")).toBeInTheDocument();
		expect(
			screen.getByText("This is the initial content of the draft."),
		).toBeInTheDocument();
	});

	it("allows editing draft title", async () => {
		render(<DraftEditor draft={mockDraft} onSave={mockOnSave} />);

		const titleInput = screen.getByDisplayValue("Sample Draft");
		fireEvent.change(titleInput, { target: { value: "Updated Title" } });

		await waitFor(() => {
			expect(titleInput).toHaveValue("Updated Title");
		});
	});

	it("allows editing draft description", async () => {
		render(<DraftEditor draft={mockDraft} onSave={mockOnSave} />);

		const descriptionInput = screen.getByDisplayValue(
			"A test draft for unit testing",
		);
		fireEvent.change(descriptionInput, {
			target: { value: "Updated description" },
		});

		await waitFor(() => {
			expect(descriptionInput).toHaveValue("Updated description");
		});
	});

	it("displays draft metadata", () => {
		render(<DraftEditor draft={mockDraft} onSave={mockOnSave} showMetadata />);

		expect(screen.getByText(/created.*jan 1, 2024/i)).toBeInTheDocument();
		expect(screen.getByText(/updated.*jan 2, 2024/i)).toBeInTheDocument();
		expect(screen.getByText(/8 words/i)).toBeInTheDocument();
	});

	it("shows draft status badge", () => {
		render(<DraftEditor draft={mockDraft} onSave={mockOnSave} />);

		expect(screen.getByText("draft")).toBeInTheDocument();
	});

	it("displays and manages tags", async () => {
		render(
			<DraftEditor
				draft={mockDraft}
				onSave={mockOnSave}
				onTagAdd={mockOnTagAdd}
				onTagRemove={mockOnTagRemove}
			/>,
		);

		expect(screen.getByText("test")).toBeInTheDocument();
		expect(screen.getByText("sample")).toBeInTheDocument();

		// Add new tag
		const addTagButton = screen.getByLabelText(/add tag/i);
		fireEvent.click(addTagButton);

		const tagInput = screen.getByPlaceholderText(/enter tag/i);
		fireEvent.change(tagInput, { target: { value: "new-tag" } });
		fireEvent.keyPress(tagInput, { key: "Enter", code: 13 });

		await waitFor(() => {
			expect(mockOnTagAdd).toHaveBeenCalledWith("new-tag");
		});

		// Remove tag
		const removeButtons = screen.getAllByLabelText(/remove tag/i);
		fireEvent.click(removeButtons[0]);

		await waitFor(() => {
			expect(mockOnTagRemove).toHaveBeenCalledWith("test");
		});
	});

	it("autosaves content changes", async () => {
		vi.useFakeTimers();

		render(
			<DraftEditor
				draft={mockDraft}
				onSave={mockOnSave}
				autoSave
				autoSaveDelay={2000}
			/>,
		);

		const contentEditor = screen.getByRole("textbox", {
			name: /content editor/i,
		});
		fireEvent.change(contentEditor, { target: { value: "Updated content" } });

		vi.advanceTimersByTime(2000);

		await waitFor(() => {
			expect(mockOnSave).toHaveBeenCalledWith(
				expect.objectContaining({
					content: "Updated content",
				}),
			);
		});

		vi.useRealTimers();
	});

	it("shows save indicator during save", async () => {
		mockOnSave.mockImplementation(
			() => new Promise((resolve) => setTimeout(resolve, 1000)),
		);

		render(<DraftEditor draft={mockDraft} onSave={mockOnSave} />);

		const saveButton = screen.getByText(/save draft/i);
		fireEvent.click(saveButton);

		await waitFor(() => {
			expect(screen.getByText(/saving/i)).toBeInTheDocument();
		});
	});

	it("handles keyboard shortcut for save (Cmd+S)", async () => {
		render(<DraftEditor draft={mockDraft} onSave={mockOnSave} />);

		fireEvent.keyDown(document, { key: "s", metaKey: true });

		await waitFor(() => {
			expect(mockOnSave).toHaveBeenCalled();
		});
	});

	it("shows publish button for draft status", () => {
		render(
			<DraftEditor
				draft={mockDraft}
				onSave={mockOnSave}
				onPublish={mockOnPublish}
			/>,
		);

		expect(screen.getByText(/publish/i)).toBeInTheDocument();
	});

	it("shows confirmation before publishing", async () => {
		render(
			<DraftEditor
				draft={mockDraft}
				onSave={mockOnSave}
				onPublish={mockOnPublish}
			/>,
		);

		const publishButton = screen.getByText(/publish/i);
		fireEvent.click(publishButton);

		await waitFor(() => {
			expect(screen.getByText(/ready to publish/i)).toBeInTheDocument();
			expect(screen.getByText(/make this draft public/i)).toBeInTheDocument();
		});

		const confirmButton = screen.getByText(/confirm publish/i);
		fireEvent.click(confirmButton);

		await waitFor(() => {
			expect(mockOnPublish).toHaveBeenCalled();
		});
	});

	it("allows status change", async () => {
		render(
			<DraftEditor
				draft={mockDraft}
				onSave={mockOnSave}
				onStatusChange={mockOnStatusChange}
			/>,
		);

		const statusSelect = screen.getByLabelText(/status/i);
		fireEvent.change(statusSelect, { target: { value: "archived" } });

		await waitFor(() => {
			expect(mockOnStatusChange).toHaveBeenCalledWith("archived");
		});
	});

	it("shows delete button with confirmation", async () => {
		render(
			<DraftEditor
				draft={mockDraft}
				onSave={mockOnSave}
				onDelete={mockOnDelete}
			/>,
		);

		const deleteButton = screen.getByLabelText(/delete draft/i);
		fireEvent.click(deleteButton);

		await waitFor(() => {
			expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
			expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
		});

		const confirmDelete = screen.getByText(/confirm delete/i);
		fireEvent.click(confirmDelete);

		await waitFor(() => {
			expect(mockOnDelete).toHaveBeenCalledWith(mockDraft.id);
		});
	});

	it("displays word count live update", async () => {
		render(<DraftEditor draft={mockDraft} onSave={mockOnSave} showWordCount />);

		expect(screen.getByText(/8 words/i)).toBeInTheDocument();

		const contentEditor = screen.getByRole("textbox", {
			name: /content editor/i,
		});
		fireEvent.change(contentEditor, {
			target: {
				value: "This is a much longer piece of content with more words",
			},
		});

		await waitFor(() => {
			expect(screen.getByText(/11 words/i)).toBeInTheDocument();
		});
	});

	it("shows character count when enabled", () => {
		render(<DraftEditor draft={mockDraft} onSave={mockOnSave} showCharCount />);

		expect(screen.getByText(/41 characters/i)).toBeInTheDocument();
	});

	it("validates required fields before save", async () => {
		const draftWithoutTitle = { ...mockDraft, title: "" };

		render(
			<DraftEditor
				draft={draftWithoutTitle}
				onSave={mockOnSave}
				validateOnSave
			/>,
		);

		const saveButton = screen.getByText(/save draft/i);
		fireEvent.click(saveButton);

		await waitFor(() => {
			expect(screen.getByText(/title is required/i)).toBeInTheDocument();
			expect(mockOnSave).not.toHaveBeenCalled();
		});
	});

	it("shows unsaved changes warning", async () => {
		render(
			<DraftEditor draft={mockDraft} onSave={mockOnSave} showUnsavedWarning />,
		);

		const titleInput = screen.getByDisplayValue("Sample Draft");
		fireEvent.change(titleInput, { target: { value: "Modified Title" } });

		await waitFor(() => {
			expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
		});
	});

	it("integrates with version selector", () => {
		render(
			<DraftEditor draft={mockDraft} onSave={mockOnSave} showVersionSelector />,
		);

		expect(screen.getByLabelText(/version selector/i)).toBeInTheDocument();
	});

	it("shows AI assistant panel when enabled", () => {
		render(
			<DraftEditor draft={mockDraft} onSave={mockOnSave} showAIAssistant />,
		);

		expect(screen.getByText(/ai assistant/i)).toBeInTheDocument();
	});

	it("handles read-only mode", () => {
		render(<DraftEditor draft={mockDraft} onSave={mockOnSave} readOnly />);

		const titleInput = screen.getByDisplayValue("Sample Draft");
		expect(titleInput).toBeDisabled();

		const contentEditor = screen.getByRole("textbox", {
			name: /content editor/i,
		});
		expect(contentEditor).toHaveAttribute("contentEditable", "false");

		expect(screen.queryByText(/save draft/i)).not.toBeInTheDocument();
	});
});
