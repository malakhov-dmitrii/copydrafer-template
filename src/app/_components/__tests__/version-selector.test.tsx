import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VersionSelector } from "../version-selector";

const mockVersions = [
	{
		id: "v1",
		name: "Version 1",
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		content: "Content for version 1",
		isActive: true,
	},
	{
		id: "v2",
		name: "Version 2",
		createdAt: new Date("2024-01-02"),
		updatedAt: new Date("2024-01-02"),
		content: "Content for version 2",
		isActive: false,
	},
	{
		id: "v3",
		name: "Version 3 (AI Generated)",
		createdAt: new Date("2024-01-03"),
		updatedAt: new Date("2024-01-03"),
		content: "Content for version 3",
		isActive: false,
		aiGenerated: true,
	},
];

describe("VersionSelector", () => {
	const mockOnVersionChange = vi.fn();
	const mockOnVersionCreate = vi.fn();
	const mockOnVersionDelete = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders current version name", () => {
		render(
			<VersionSelector
				versions={mockVersions}
				currentVersionId="v1"
				onVersionChange={mockOnVersionChange}
			/>,
		);

		expect(screen.getByText("Version 1")).toBeInTheDocument();
	});

	it("displays all versions in dropdown", async () => {
		render(
			<VersionSelector
				versions={mockVersions}
				currentVersionId="v1"
				onVersionChange={mockOnVersionChange}
			/>,
		);

		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);

		await waitFor(() => {
			expect(screen.getByText("Version 1")).toBeInTheDocument();
			expect(screen.getByText("Version 2")).toBeInTheDocument();
			expect(screen.getByText("Version 3 (AI Generated)")).toBeInTheDocument();
		});
	});

	it("shows AI badge for AI-generated versions", async () => {
		render(
			<VersionSelector
				versions={mockVersions}
				currentVersionId="v1"
				onVersionChange={mockOnVersionChange}
			/>,
		);

		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);

		await waitFor(() => {
			const aiVersion = screen.getByText("Version 3 (AI Generated)");
			expect(aiVersion.parentElement?.querySelector(".ai-badge")).toBeTruthy();
		});
	});

	it("calls onVersionChange when selecting a version", async () => {
		render(
			<VersionSelector
				versions={mockVersions}
				currentVersionId="v1"
				onVersionChange={mockOnVersionChange}
			/>,
		);

		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);

		await waitFor(() => {
			const version2 = screen.getByText("Version 2");
			fireEvent.click(version2);
		});

		expect(mockOnVersionChange).toHaveBeenCalledWith("v2");
	});

	it("shows create new version option when enabled", async () => {
		render(
			<VersionSelector
				versions={mockVersions}
				currentVersionId="v1"
				onVersionChange={mockOnVersionChange}
				onVersionCreate={mockOnVersionCreate}
				allowCreate
			/>,
		);

		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);

		await waitFor(() => {
			expect(screen.getByText("Create New Version")).toBeInTheDocument();
		});
	});

	it("calls onVersionCreate when creating new version", async () => {
		render(
			<VersionSelector
				versions={mockVersions}
				currentVersionId="v1"
				onVersionChange={mockOnVersionChange}
				onVersionCreate={mockOnVersionCreate}
				allowCreate
			/>,
		);

		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);

		await waitFor(() => {
			const createButton = screen.getByText("Create New Version");
			fireEvent.click(createButton);
		});

		expect(mockOnVersionCreate).toHaveBeenCalled();
	});

	it("shows version timestamps when showTimestamps is true", async () => {
		render(
			<VersionSelector
				versions={mockVersions}
				currentVersionId="v1"
				onVersionChange={mockOnVersionChange}
				showTimestamps
			/>,
		);

		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);

		await waitFor(() => {
			expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
			expect(screen.getByText(/Jan 2, 2024/)).toBeInTheDocument();
		});
	});

	it("allows version deletion when onVersionDelete is provided", async () => {
		render(
			<VersionSelector
				versions={mockVersions}
				currentVersionId="v1"
				onVersionChange={mockOnVersionChange}
				onVersionDelete={mockOnVersionDelete}
			/>,
		);

		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);

		await waitFor(() => {
			const deleteButtons = screen.getAllByLabelText(/delete version/i);
			expect(deleteButtons).toHaveLength(mockVersions.length);
		});
	});

	it("prevents deletion of active version", async () => {
		render(
			<VersionSelector
				versions={mockVersions}
				currentVersionId="v1"
				onVersionChange={mockOnVersionChange}
				onVersionDelete={mockOnVersionDelete}
			/>,
		);

		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);

		await waitFor(() => {
			const deleteButtons = screen.getAllByLabelText(/delete version/i);
			const activeVersionDeleteButton = deleteButtons[0];
			expect(activeVersionDeleteButton).toBeDisabled();
		});
	});

	it("shows loading state when loading prop is true", () => {
		render(
			<VersionSelector
				versions={mockVersions}
				currentVersionId="v1"
				onVersionChange={mockOnVersionChange}
				loading
			/>,
		);

		expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
	});

	it("handles empty versions array gracefully", () => {
		render(
			<VersionSelector
				versions={[]}
				currentVersionId=""
				onVersionChange={mockOnVersionChange}
			/>,
		);

		expect(screen.getByText(/no versions/i)).toBeInTheDocument();
	});

	it("shows comparison mode when compareMode is enabled", async () => {
		render(
			<VersionSelector
				versions={mockVersions}
				currentVersionId="v1"
				onVersionChange={mockOnVersionChange}
				compareMode
				compareVersionId="v2"
			/>,
		);

		expect(screen.getByText(/comparing/i)).toBeInTheDocument();
		expect(screen.getByText("Version 1")).toBeInTheDocument();
		expect(screen.getByText("Version 2")).toBeInTheDocument();
	});
});