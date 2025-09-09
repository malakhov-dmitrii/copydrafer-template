import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VersionAIIntegration } from "../version-ai-integration";

const mockAIResponse = {
	id: "ai-1",
	content: "This is an AI-generated improved version of your content.",
	suggestions: [
		"Improved clarity in the introduction",
		"Added more specific examples",
		"Enhanced conclusion with call-to-action",
	],
	confidence: 0.85,
};

const mockCurrentVersion = {
	id: "v1",
	name: "Current Version",
	content: "This is the current content.",
	createdAt: new Date("2024-01-01"),
	updatedAt: new Date("2024-01-01"),
};

describe("VersionAIIntegration", () => {
	const mockOnCreateVersion = vi.fn();
	const mockOnApplySuggestions = vi.fn();
	const mockOnRegenerate = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("displays AI response content", () => {
		render(
			<VersionAIIntegration
				aiResponse={mockAIResponse}
				currentVersion={mockCurrentVersion}
				onCreateVersion={mockOnCreateVersion}
			/>,
		);

		expect(
			screen.getByText(/This is an AI-generated improved version/),
		).toBeInTheDocument();
	});

	it("shows AI suggestions list", () => {
		render(
			<VersionAIIntegration
				aiResponse={mockAIResponse}
				currentVersion={mockCurrentVersion}
				onCreateVersion={mockOnCreateVersion}
			/>,
		);

		expect(screen.getByText(/Improved clarity/)).toBeInTheDocument();
		expect(
			screen.getByText(/Added more specific examples/),
		).toBeInTheDocument();
		expect(screen.getByText(/Enhanced conclusion/)).toBeInTheDocument();
	});

	it("displays confidence score", () => {
		render(
			<VersionAIIntegration
				aiResponse={mockAIResponse}
				currentVersion={mockCurrentVersion}
				onCreateVersion={mockOnCreateVersion}
			/>,
		);

		expect(screen.getByText(/85%/)).toBeInTheDocument();
		expect(screen.getByText(/confidence/i)).toBeInTheDocument();
	});

	it("creates new version from AI response", async () => {
		render(
			<VersionAIIntegration
				aiResponse={mockAIResponse}
				currentVersion={mockCurrentVersion}
				onCreateVersion={mockOnCreateVersion}
			/>,
		);

		const createButton = screen.getByText(/create version from ai/i);
		fireEvent.click(createButton);

		await waitFor(() => {
			expect(mockOnCreateVersion).toHaveBeenCalledWith({
				content: mockAIResponse.content,
				name: expect.stringContaining("AI Generated"),
				aiGenerated: true,
				parentVersionId: mockCurrentVersion.id,
			});
		});
	});

	it("allows selective application of suggestions", async () => {
		render(
			<VersionAIIntegration
				aiResponse={mockAIResponse}
				currentVersion={mockCurrentVersion}
				onApplySuggestions={mockOnApplySuggestions}
			/>,
		);

		const suggestionCheckboxes = screen.getAllByRole("checkbox");
		expect(suggestionCheckboxes).toHaveLength(3);

		fireEvent.click(suggestionCheckboxes[0]);
		fireEvent.click(suggestionCheckboxes[2]);

		const applyButton = screen.getByText(/apply selected/i);
		fireEvent.click(applyButton);

		await waitFor(() => {
			expect(mockOnApplySuggestions).toHaveBeenCalledWith([
				mockAIResponse.suggestions[0],
				mockAIResponse.suggestions[2],
			]);
		});
	});

	it("shows regenerate option", async () => {
		render(
			<VersionAIIntegration
				aiResponse={mockAIResponse}
				currentVersion={mockCurrentVersion}
				onRegenerate={mockOnRegenerate}
			/>,
		);

		const regenerateButton = screen.getByText(/regenerate/i);
		fireEvent.click(regenerateButton);

		await waitFor(() => {
			expect(mockOnRegenerate).toHaveBeenCalled();
		});
	});

	it("displays comparison view between current and AI version", () => {
		render(
			<VersionAIIntegration
				aiResponse={mockAIResponse}
				currentVersion={mockCurrentVersion}
				showComparison
			/>,
		);

		expect(screen.getByTestId("version-comparison")).toBeInTheDocument();
		expect(screen.getByText(/current version/i)).toBeInTheDocument();
		expect(screen.getByText(/ai version/i)).toBeInTheDocument();
	});

	it("allows editing AI response before creating version", async () => {
		render(
			<VersionAIIntegration
				aiResponse={mockAIResponse}
				currentVersion={mockCurrentVersion}
				onCreateVersion={mockOnCreateVersion}
				allowEdit
			/>,
		);

		const editButton = screen.getByText(/edit before creating/i);
		fireEvent.click(editButton);

		await waitFor(() => {
			const editor = screen.getByRole("textbox");
			expect(editor).toBeInTheDocument();
			expect(editor).toHaveValue(mockAIResponse.content);
		});
	});

	it("shows AI reasoning when available", () => {
		const responseWithReasoning = {
			...mockAIResponse,
			reasoning: "Based on SEO best practices and readability analysis",
		};

		render(
			<VersionAIIntegration
				aiResponse={responseWithReasoning}
				currentVersion={mockCurrentVersion}
			/>,
		);

		expect(screen.getByText(/Based on SEO best practices/)).toBeInTheDocument();
	});

	it("handles low confidence warning", () => {
		const lowConfidenceResponse = {
			...mockAIResponse,
			confidence: 0.4,
		};

		render(
			<VersionAIIntegration
				aiResponse={lowConfidenceResponse}
				currentVersion={mockCurrentVersion}
			/>,
		);

		expect(screen.getByText(/low confidence/i)).toBeInTheDocument();
		expect(screen.getByRole("alert")).toBeInTheDocument();
	});

	it("shows loading state during version creation", async () => {
		mockOnCreateVersion.mockImplementation(
			() => new Promise((resolve) => setTimeout(resolve, 1000)),
		);

		render(
			<VersionAIIntegration
				aiResponse={mockAIResponse}
				currentVersion={mockCurrentVersion}
				onCreateVersion={mockOnCreateVersion}
			/>,
		);

		const createButton = screen.getByText(/create version from ai/i);
		fireEvent.click(createButton);

		await waitFor(() => {
			expect(screen.getByLabelText(/creating version/i)).toBeInTheDocument();
		});
	});

	it("displays multiple AI responses in tabs", () => {
		const multipleResponses = [
			mockAIResponse,
			{ ...mockAIResponse, id: "ai-2", content: "Alternative version" },
		];

		render(
			<VersionAIIntegration
				aiResponses={multipleResponses}
				currentVersion={mockCurrentVersion}
				onCreateVersion={mockOnCreateVersion}
			/>,
		);

		expect(screen.getByRole("tablist")).toBeInTheDocument();
		expect(screen.getByText(/option 1/i)).toBeInTheDocument();
		expect(screen.getByText(/option 2/i)).toBeInTheDocument();
	});

	it("allows version naming before creation", async () => {
		render(
			<VersionAIIntegration
				aiResponse={mockAIResponse}
				currentVersion={mockCurrentVersion}
				onCreateVersion={mockOnCreateVersion}
				promptForName
			/>,
		);

		const createButton = screen.getByText(/create version from ai/i);
		fireEvent.click(createButton);

		await waitFor(() => {
			const nameInput = screen.getByLabelText(/version name/i);
			expect(nameInput).toBeInTheDocument();
		});

		const nameInput = screen.getByLabelText(/version name/i);
		fireEvent.change(nameInput, { target: { value: "SEO Optimized Version" } });

		const confirmButton = screen.getByText(/confirm/i);
		fireEvent.click(confirmButton);

		await waitFor(() => {
			expect(mockOnCreateVersion).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "SEO Optimized Version",
				}),
			);
		});
	});
});
