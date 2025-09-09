import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DraftList } from "../draft-list";

const mockDrafts = [
	{
		id: "d1",
		title: "Blog Post: Getting Started with React",
		description: "A comprehensive guide for React beginners",
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-02"),
		status: "draft" as const,
		tags: ["react", "tutorial"],
		wordCount: 1500,
		versionCount: 3,
	},
	{
		id: "d2",
		title: "Product Launch Announcement",
		description: "Press release for new product",
		createdAt: new Date("2024-01-03"),
		updatedAt: new Date("2024-01-04"),
		status: "published" as const,
		tags: ["marketing", "announcement"],
		wordCount: 800,
		versionCount: 5,
	},
	{
		id: "d3",
		title: "Email Campaign: Summer Sale",
		description: "Promotional email for summer discount",
		createdAt: new Date("2024-01-05"),
		updatedAt: new Date("2024-01-06"),
		status: "archived" as const,
		tags: ["email", "promotion"],
		wordCount: 300,
		versionCount: 2,
	},
];

describe("DraftList", () => {
	const mockOnDraftSelect = vi.fn();
	const mockOnDraftCreate = vi.fn();
	const mockOnDraftDelete = vi.fn();
	const mockOnDraftEdit = vi.fn();
	const mockOnDraftDuplicate = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders all drafts", () => {
		render(<DraftList drafts={mockDrafts} onDraftSelect={mockOnDraftSelect} />);

		expect(
			screen.getByText("Blog Post: Getting Started with React"),
		).toBeInTheDocument();
		expect(screen.getByText("Product Launch Announcement")).toBeInTheDocument();
		expect(screen.getByText("Email Campaign: Summer Sale")).toBeInTheDocument();
	});

	it("displays draft metadata correctly", () => {
		render(<DraftList drafts={mockDrafts} onDraftSelect={mockOnDraftSelect} />);

		expect(screen.getByText("1,500 words")).toBeInTheDocument();
		expect(screen.getByText("3 versions")).toBeInTheDocument();
		expect(screen.getByText(/Jan 2, 2024/)).toBeInTheDocument();
	});

	it("shows status badges for drafts", () => {
		render(<DraftList drafts={mockDrafts} onDraftSelect={mockOnDraftSelect} />);

		expect(screen.getByText("draft")).toBeInTheDocument();
		expect(screen.getByText("published")).toBeInTheDocument();
		expect(screen.getByText("archived")).toBeInTheDocument();
	});

	it("calls onDraftSelect when clicking a draft", async () => {
		render(<DraftList drafts={mockDrafts} onDraftSelect={mockOnDraftSelect} />);

		const firstDraft = screen.getByText(
			"Blog Post: Getting Started with React",
		);
		fireEvent.click(firstDraft);

		await waitFor(() => {
			expect(mockOnDraftSelect).toHaveBeenCalledWith("d1");
		});
	});

	it("shows create button when onDraftCreate is provided", () => {
		render(
			<DraftList
				drafts={mockDrafts}
				onDraftSelect={mockOnDraftSelect}
				onDraftCreate={mockOnDraftCreate}
			/>,
		);

		expect(screen.getByText(/create new draft/i)).toBeInTheDocument();
	});

	it("opens create dialog when create button is clicked", async () => {
		render(
			<DraftList
				drafts={mockDrafts}
				onDraftSelect={mockOnDraftSelect}
				onDraftCreate={mockOnDraftCreate}
			/>,
		);

		const createButton = screen.getByText(/create new draft/i);
		fireEvent.click(createButton);

		await waitFor(() => {
			expect(screen.getByLabelText(/draft title/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
		});
	});

	it("filters drafts by search term", async () => {
		render(
			<DraftList
				drafts={mockDrafts}
				onDraftSelect={mockOnDraftSelect}
				showSearch
			/>,
		);

		const searchInput = screen.getByPlaceholderText(/search drafts/i);
		fireEvent.change(searchInput, { target: { value: "React" } });

		await waitFor(() => {
			expect(
				screen.getByText("Blog Post: Getting Started with React"),
			).toBeInTheDocument();
			expect(
				screen.queryByText("Product Launch Announcement"),
			).not.toBeInTheDocument();
			expect(
				screen.queryByText("Email Campaign: Summer Sale"),
			).not.toBeInTheDocument();
		});
	});

	it("filters drafts by status", async () => {
		render(
			<DraftList
				drafts={mockDrafts}
				onDraftSelect={mockOnDraftSelect}
				showFilters
			/>,
		);

		const statusFilter = screen.getByLabelText(/filter by status/i);
		fireEvent.change(statusFilter, { target: { value: "published" } });

		await waitFor(() => {
			expect(
				screen.queryByText("Blog Post: Getting Started with React"),
			).not.toBeInTheDocument();
			expect(
				screen.getByText("Product Launch Announcement"),
			).toBeInTheDocument();
			expect(
				screen.queryByText("Email Campaign: Summer Sale"),
			).not.toBeInTheDocument();
		});
	});

	it("filters drafts by tags", async () => {
		render(
			<DraftList
				drafts={mockDrafts}
				onDraftSelect={mockOnDraftSelect}
				showFilters
			/>,
		);

		const tagFilter = screen.getByText("react");
		fireEvent.click(tagFilter);

		await waitFor(() => {
			expect(
				screen.getByText("Blog Post: Getting Started with React"),
			).toBeInTheDocument();
			expect(
				screen.queryByText("Product Launch Announcement"),
			).not.toBeInTheDocument();
		});
	});

	it("sorts drafts by different criteria", async () => {
		render(
			<DraftList
				drafts={mockDrafts}
				onDraftSelect={mockOnDraftSelect}
				showSort
			/>,
		);

		const sortSelect = screen.getByLabelText(/sort by/i);
		fireEvent.change(sortSelect, { target: { value: "title" } });

		await waitFor(() => {
			const draftTitles = screen.getAllByTestId("draft-title");
			expect(draftTitles[0]).toHaveTextContent("Blog Post");
			expect(draftTitles[1]).toHaveTextContent("Email Campaign");
			expect(draftTitles[2]).toHaveTextContent("Product Launch");
		});
	});

	it("shows draft actions menu", async () => {
		render(
			<DraftList
				drafts={mockDrafts}
				onDraftSelect={mockOnDraftSelect}
				onDraftEdit={mockOnDraftEdit}
				onDraftDelete={mockOnDraftDelete}
				onDraftDuplicate={mockOnDraftDuplicate}
			/>,
		);

		const moreButton = screen.getAllByLabelText(/more options/i)[0];
		fireEvent.click(moreButton);

		await waitFor(() => {
			expect(screen.getByText(/edit/i)).toBeInTheDocument();
			expect(screen.getByText(/duplicate/i)).toBeInTheDocument();
			expect(screen.getByText(/delete/i)).toBeInTheDocument();
		});
	});

	it("calls onDraftEdit when edit is selected", async () => {
		render(
			<DraftList
				drafts={mockDrafts}
				onDraftSelect={mockOnDraftSelect}
				onDraftEdit={mockOnDraftEdit}
			/>,
		);

		const moreButton = screen.getAllByLabelText(/more options/i)[0];
		fireEvent.click(moreButton);

		await waitFor(() => {
			const editButton = screen.getByText(/edit/i);
			fireEvent.click(editButton);
		});

		expect(mockOnDraftEdit).toHaveBeenCalledWith("d1");
	});

	it("shows confirmation dialog before deleting", async () => {
		render(
			<DraftList
				drafts={mockDrafts}
				onDraftSelect={mockOnDraftSelect}
				onDraftDelete={mockOnDraftDelete}
			/>,
		);

		const moreButton = screen.getAllByLabelText(/more options/i)[0];
		fireEvent.click(moreButton);

		await waitFor(() => {
			const deleteButton = screen.getByText(/delete/i);
			fireEvent.click(deleteButton);
		});

		await waitFor(() => {
			expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
			expect(
				screen.getByText(/this action cannot be undone/i),
			).toBeInTheDocument();
		});
	});

	it("displays empty state when no drafts", () => {
		render(
			<DraftList
				drafts={[]}
				onDraftSelect={mockOnDraftSelect}
				onDraftCreate={mockOnDraftCreate}
			/>,
		);

		expect(screen.getByText(/no drafts found/i)).toBeInTheDocument();
		expect(screen.getByText(/create your first draft/i)).toBeInTheDocument();
	});

	it("switches between grid and list view", async () => {
		render(
			<DraftList
				drafts={mockDrafts}
				onDraftSelect={mockOnDraftSelect}
				showViewToggle
			/>,
		);

		const gridViewButton = screen.getByLabelText(/grid view/i);
		const listViewButton = screen.getByLabelText(/list view/i);

		fireEvent.click(listViewButton);

		await waitFor(() => {
			expect(screen.getByTestId("draft-list-view")).toBeInTheDocument();
		});

		fireEvent.click(gridViewButton);

		await waitFor(() => {
			expect(screen.getByTestId("draft-grid-view")).toBeInTheDocument();
		});
	});

	it("shows loading state", () => {
		render(<DraftList drafts={[]} onDraftSelect={mockOnDraftSelect} loading />);

		expect(screen.getByLabelText(/loading drafts/i)).toBeInTheDocument();
	});

	it("handles pagination correctly", async () => {
		const manyDrafts = Array.from({ length: 25 }, (_, i) => ({
			...mockDrafts[0],
			id: `d${i}`,
			title: `Draft ${i}`,
		}));

		render(
			<DraftList
				drafts={manyDrafts}
				onDraftSelect={mockOnDraftSelect}
				itemsPerPage={10}
			/>,
		);

		expect(screen.getByText("Draft 0")).toBeInTheDocument();
		expect(screen.getByText("Draft 9")).toBeInTheDocument();
		expect(screen.queryByText("Draft 10")).not.toBeInTheDocument();

		const nextPageButton = screen.getByLabelText(/next page/i);
		fireEvent.click(nextPageButton);

		await waitFor(() => {
			expect(screen.queryByText("Draft 0")).not.toBeInTheDocument();
			expect(screen.getByText("Draft 10")).toBeInTheDocument();
		});
	});
});
