import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VersionComparison } from "../version-comparison";

const mockVersions = {
	left: {
		id: "v1",
		name: "Version 1",
		content: "This is the original content for version 1.",
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
	},
	right: {
		id: "v2",
		name: "Version 2",
		content: "This is the modified content for version 2 with changes.",
		createdAt: new Date("2024-01-02"),
		updatedAt: new Date("2024-01-02"),
	},
};

describe("VersionComparison", () => {
	const mockOnAcceptChanges = vi.fn();
	const mockOnRejectChanges = vi.fn();
	const mockOnMerge = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders both versions side by side", () => {
		render(
			<VersionComparison
				leftVersion={mockVersions.left}
				rightVersion={mockVersions.right}
			/>,
		);

		expect(screen.getByText("Version 1")).toBeInTheDocument();
		expect(screen.getByText("Version 2")).toBeInTheDocument();
	});

	it("displays content for both versions", () => {
		render(
			<VersionComparison
				leftVersion={mockVersions.left}
				rightVersion={mockVersions.right}
			/>,
		);

		expect(
			screen.getByText(/This is the original content for version 1/),
		).toBeInTheDocument();
		expect(
			screen.getByText(/This is the modified content for version 2/),
		).toBeInTheDocument();
	});

	it("highlights differences when showDiff is true", () => {
		render(
			<VersionComparison
				leftVersion={mockVersions.left}
				rightVersion={mockVersions.right}
				showDiff
			/>,
		);

		const diffElements = screen.getAllByTestId(/diff-/);
		expect(diffElements.length).toBeGreaterThan(0);
	});

	it("shows accept/reject buttons when handlers are provided", () => {
		render(
			<VersionComparison
				leftVersion={mockVersions.left}
				rightVersion={mockVersions.right}
				onAcceptChanges={mockOnAcceptChanges}
				onRejectChanges={mockOnRejectChanges}
			/>,
		);

		expect(screen.getByText(/accept changes/i)).toBeInTheDocument();
		expect(screen.getByText(/reject changes/i)).toBeInTheDocument();
	});

	it("calls onAcceptChanges when accept button is clicked", async () => {
		render(
			<VersionComparison
				leftVersion={mockVersions.left}
				rightVersion={mockVersions.right}
				onAcceptChanges={mockOnAcceptChanges}
			/>,
		);

		const acceptButton = screen.getByText(/accept changes/i);
		fireEvent.click(acceptButton);

		await waitFor(() => {
			expect(mockOnAcceptChanges).toHaveBeenCalledWith(mockVersions.right.id);
		});
	});

	it("calls onRejectChanges when reject button is clicked", async () => {
		render(
			<VersionComparison
				leftVersion={mockVersions.left}
				rightVersion={mockVersions.right}
				onRejectChanges={mockOnRejectChanges}
			/>,
		);

		const rejectButton = screen.getByText(/reject changes/i);
		fireEvent.click(rejectButton);

		await waitFor(() => {
			expect(mockOnRejectChanges).toHaveBeenCalledWith(mockVersions.right.id);
		});
	});

	it("shows merge option when onMerge is provided", () => {
		render(
			<VersionComparison
				leftVersion={mockVersions.left}
				rightVersion={mockVersions.right}
				onMerge={mockOnMerge}
			/>,
		);

		expect(screen.getByText(/merge versions/i)).toBeInTheDocument();
	});

	it("opens merge dialog when merge button is clicked", async () => {
		render(
			<VersionComparison
				leftVersion={mockVersions.left}
				rightVersion={mockVersions.right}
				onMerge={mockOnMerge}
			/>,
		);

		const mergeButton = screen.getByText(/merge versions/i);
		fireEvent.click(mergeButton);

		await waitFor(() => {
			expect(screen.getByText(/merge strategy/i)).toBeInTheDocument();
		});
	});

	it("switches to unified diff view", async () => {
		render(
			<VersionComparison
				leftVersion={mockVersions.left}
				rightVersion={mockVersions.right}
				showDiff
			/>,
		);

		const viewToggle = screen.getByLabelText(/unified view/i);
		fireEvent.click(viewToggle);

		await waitFor(() => {
			expect(screen.getByTestId("unified-diff")).toBeInTheDocument();
		});
	});

	it("shows version metadata when showMetadata is true", () => {
		render(
			<VersionComparison
				leftVersion={mockVersions.left}
				rightVersion={mockVersions.right}
				showMetadata
			/>,
		);

		expect(screen.getByText(/created.*jan 1, 2024/i)).toBeInTheDocument();
		expect(screen.getByText(/created.*jan 2, 2024/i)).toBeInTheDocument();
	});

	it("handles read-only mode correctly", () => {
		render(
			<VersionComparison
				leftVersion={mockVersions.left}
				rightVersion={mockVersions.right}
				readOnly
				onAcceptChanges={mockOnAcceptChanges}
			/>,
		);

		expect(screen.queryByText(/accept changes/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/reject changes/i)).not.toBeInTheDocument();
	});

	it("shows word count differences", () => {
		render(
			<VersionComparison
				leftVersion={mockVersions.left}
				rightVersion={mockVersions.right}
				showStats
			/>,
		);

		expect(screen.getByText(/word count/i)).toBeInTheDocument();
		expect(screen.getByText(/character count/i)).toBeInTheDocument();
	});

	it("allows selecting specific changes in granular mode", async () => {
		render(
			<VersionComparison
				leftVersion={mockVersions.left}
				rightVersion={mockVersions.right}
				granularSelection
				showDiff
			/>,
		);

		const changeCheckboxes = screen.getAllByRole("checkbox");
		expect(changeCheckboxes.length).toBeGreaterThan(0);

		fireEvent.click(changeCheckboxes[0]);
		
		await waitFor(() => {
			expect(changeCheckboxes[0]).toBeChecked();
		});
	});

	it("exports comparison as markdown", async () => {
		const mockExport = vi.fn();
		render(
			<VersionComparison
				leftVersion={mockVersions.left}
				rightVersion={mockVersions.right}
				onExport={mockExport}
			/>,
		);

		const exportButton = screen.getByLabelText(/export comparison/i);
		fireEvent.click(exportButton);

		await waitFor(() => {
			expect(mockExport).toHaveBeenCalled();
		});
	});

	it("handles loading state appropriately", () => {
		render(
			<VersionComparison
				leftVersion={mockVersions.left}
				rightVersion={mockVersions.right}
				loading
			/>,
		);

		expect(screen.getByLabelText(/loading comparison/i)).toBeInTheDocument();
	});
});