"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
	Archive,
	Calendar,
	Clock,
	Copy,
	Edit,
	FileText,
	Filter,
	Grid3x3,
	List,
	Loader2,
	MoreVertical,
	Plus,
	Search,
	SortAsc,
	Tag,
	Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export interface Draft {
	id: string;
	title: string;
	description?: string;
	content?: string;
	createdAt: Date;
	updatedAt: Date;
	status: "draft" | "published" | "archived";
	tags?: string[];
	wordCount?: number;
	versionCount?: number;
}

interface DraftListProps {
	drafts: Draft[];
	onDraftSelect: (draftId: string) => void;
	onDraftCreate?: (draft: Partial<Draft>) => void;
	onDraftEdit?: (draftId: string) => void;
	onDraftDelete?: (draftId: string) => void;
	onDraftDuplicate?: (draftId: string) => void;
	showSearch?: boolean;
	showFilters?: boolean;
	showSort?: boolean;
	showViewToggle?: boolean;
	loading?: boolean;
	itemsPerPage?: number;
	className?: string;
}

export function DraftList({
	drafts,
	onDraftSelect,
	onDraftCreate,
	onDraftEdit,
	onDraftDelete,
	onDraftDuplicate,
	showSearch = true,
	showFilters = true,
	showSort = true,
	showViewToggle = true,
	loading = false,
	itemsPerPage = 12,
	className,
}: DraftListProps) {
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
	const [sortBy, setSortBy] = useState<"updated" | "created" | "title">(
		"updated",
	);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [currentPage, setCurrentPage] = useState(1);
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
	const [newDraft, setNewDraft] = useState<Partial<Draft>>({
		title: "",
		description: "",
		status: "draft",
		tags: [],
	});

	// Extract all unique tags
	const allTags = useMemo(() => {
		const tags = new Set<string>();
		drafts.forEach((draft) => {
			draft.tags?.forEach((tag) => tags.add(tag));
		});
		return Array.from(tags);
	}, [drafts]);

	// Filter and sort drafts
	const filteredDrafts = useMemo(() => {
		let filtered = [...drafts];

		// Search filter
		if (searchTerm) {
			filtered = filtered.filter(
				(draft) =>
					draft.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
					draft.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					draft.tags?.some((tag) =>
						tag.toLowerCase().includes(searchTerm.toLowerCase()),
					),
			);
		}

		// Status filter
		if (statusFilter !== "all") {
			filtered = filtered.filter((draft) => draft.status === statusFilter);
		}

		// Tag filter
		if (selectedTags.size > 0) {
			filtered = filtered.filter((draft) =>
				draft.tags?.some((tag) => selectedTags.has(tag)),
			);
		}

		// Sort
		filtered.sort((a, b) => {
			let comparison = 0;
			switch (sortBy) {
				case "updated":
					comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
					break;
				case "created":
					comparison = a.createdAt.getTime() - b.createdAt.getTime();
					break;
				case "title":
					comparison = a.title.localeCompare(b.title);
					break;
			}
			return sortOrder === "asc" ? comparison : -comparison;
		});

		return filtered;
	}, [drafts, searchTerm, statusFilter, selectedTags, sortBy, sortOrder]);

	// Pagination
	const paginatedDrafts = useMemo(() => {
		const start = (currentPage - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		return filteredDrafts.slice(start, end);
	}, [filteredDrafts, currentPage, itemsPerPage]);

	const totalPages = Math.ceil(filteredDrafts.length / itemsPerPage);

	const handleTagToggle = useCallback((tag: string) => {
		setSelectedTags((prev) => {
			const next = new Set(prev);
			if (next.has(tag)) {
				next.delete(tag);
			} else {
				next.add(tag);
			}
			return next;
		});
	}, []);

	const handleCreateDraft = useCallback(() => {
		if (onDraftCreate && newDraft.title) {
			onDraftCreate({
				...newDraft,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			setShowCreateDialog(false);
			setNewDraft({ title: "", description: "", status: "draft", tags: [] });
		}
	}, [onDraftCreate, newDraft]);

	const handleDeleteDraft = useCallback(
		(draftId: string) => {
			if (onDraftDelete) {
				onDraftDelete(draftId);
				setShowDeleteDialog(null);
			}
		},
		[onDraftDelete],
	);

	const getStatusColor = (status: Draft["status"]) => {
		switch (status) {
			case "draft":
				return "secondary";
			case "published":
				return "default";
			case "archived":
				return "outline";
			default:
				return "secondary";
		}
	};

	if (loading) {
		return (
			<div className={cn("flex items-center justify-center p-8", className)}>
				<Loader2 className="h-6 w-6 animate-spin" aria-label="Loading drafts" />
			</div>
		);
	}

	if (drafts.length === 0 && !showCreateDialog) {
		return (
			<div
				className={cn(
					"flex flex-col items-center justify-center p-8",
					className,
				)}
			>
				<FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
				<h3 className="mb-2 font-semibold text-lg">No drafts found</h3>
				<p className="mb-4 text-center text-muted-foreground">
					Create your first draft to get started with content creation
				</p>
				{onDraftCreate && (
					<Button onClick={() => setShowCreateDialog(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Create Your First Draft
					</Button>
				)}
			</div>
		);
	}

	return (
		<div className={cn("space-y-4", className)}>
			{/* Header Controls */}
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<h2 className="font-bold text-2xl">Drafts</h2>
					{onDraftCreate && (
						<Button onClick={() => setShowCreateDialog(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Create New Draft
						</Button>
					)}
				</div>

				{/* Search and Filters */}
				<div className="flex flex-wrap items-center gap-2">
					{showSearch && (
						<div className="relative min-w-[200px] flex-1">
							<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search drafts..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-9"
							/>
						</div>
					)}

					{showFilters && (
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger
								className="w-[150px]"
								aria-label="Filter by status"
							>
								<Filter className="mr-2 h-4 w-4" />
								<SelectValue placeholder="All Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="draft">Draft</SelectItem>
								<SelectItem value="published">Published</SelectItem>
								<SelectItem value="archived">Archived</SelectItem>
							</SelectContent>
						</Select>
					)}

					{showSort && (
						<Select
							value={`${sortBy}-${sortOrder}`}
							onValueChange={(value) => {
								const [newSortBy, newSortOrder] = value.split("-");
								setSortBy(newSortBy as typeof sortBy);
								setSortOrder(newSortOrder as typeof sortOrder);
							}}
						>
							<SelectTrigger className="w-[180px]" aria-label="Sort by">
								<SortAsc className="mr-2 h-4 w-4" />
								<SelectValue placeholder="Sort by" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="updated-desc">Recently Updated</SelectItem>
								<SelectItem value="updated-asc">Oldest Updated</SelectItem>
								<SelectItem value="created-desc">Recently Created</SelectItem>
								<SelectItem value="created-asc">Oldest Created</SelectItem>
								<SelectItem value="title-asc">Title (A-Z)</SelectItem>
								<SelectItem value="title-desc">Title (Z-A)</SelectItem>
							</SelectContent>
						</Select>
					)}

					{showViewToggle && (
						<div className="ml-auto flex items-center gap-1">
							<Button
								size="icon"
								variant={viewMode === "grid" ? "default" : "ghost"}
								onClick={() => setViewMode("grid")}
								aria-label="Grid view"
							>
								<Grid3x3 className="h-4 w-4" />
							</Button>
							<Button
								size="icon"
								variant={viewMode === "list" ? "default" : "ghost"}
								onClick={() => setViewMode("list")}
								aria-label="List view"
							>
								<List className="h-4 w-4" />
							</Button>
						</div>
					)}
				</div>

				{/* Tag Filters */}
				{showFilters && allTags.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{allTags.map((tag) => (
							<Badge
								key={tag}
								variant={selectedTags.has(tag) ? "default" : "outline"}
								className="cursor-pointer"
								onClick={() => handleTagToggle(tag)}
							>
								<Tag className="mr-1 h-3 w-3" />
								{tag}
							</Badge>
						))}
					</div>
				)}
			</div>

			{/* Drafts Display */}
			{viewMode === "grid" ? (
				<div
					className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
					data-testid="draft-grid-view"
				>
					{paginatedDrafts.map((draft) => (
						<Card
							key={draft.id}
							className="cursor-pointer transition-shadow hover:shadow-md"
							onClick={() => onDraftSelect(draft.id)}
						>
							<CardHeader className="pb-3">
								<div className="flex items-start justify-between">
									<CardTitle
										className="line-clamp-2 text-base"
										data-testid="draft-title"
									>
										{draft.title}
									</CardTitle>
									<DropdownMenu>
										<DropdownMenuTrigger
											asChild
											onClick={(e) => e.stopPropagation()}
										>
											<Button
												size="icon"
												variant="ghost"
												className="h-8 w-8"
												aria-label="More options"
											>
												<MoreVertical className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											{onDraftEdit && (
												<DropdownMenuItem
													onClick={(e) => {
														e.stopPropagation();
														onDraftEdit(draft.id);
													}}
												>
													<Edit className="mr-2 h-4 w-4" />
													Edit
												</DropdownMenuItem>
											)}
											{onDraftDuplicate && (
												<DropdownMenuItem
													onClick={(e) => {
														e.stopPropagation();
														onDraftDuplicate(draft.id);
													}}
												>
													<Copy className="mr-2 h-4 w-4" />
													Duplicate
												</DropdownMenuItem>
											)}
											{(onDraftEdit || onDraftDuplicate) && onDraftDelete && (
												<DropdownMenuSeparator />
											)}
											{onDraftDelete && (
												<DropdownMenuItem
													className="text-destructive"
													onClick={(e) => {
														e.stopPropagation();
														setShowDeleteDialog(draft.id);
													}}
												>
													<Trash2 className="mr-2 h-4 w-4" />
													Delete
												</DropdownMenuItem>
											)}
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
								{draft.description && (
									<CardDescription className="line-clamp-2 text-sm">
										{draft.description}
									</CardDescription>
								)}
							</CardHeader>
							<CardContent className="pb-3">
								<div className="flex flex-wrap gap-1">
									{draft.tags?.map((tag) => (
										<Badge key={tag} variant="secondary" className="text-xs">
											{tag}
										</Badge>
									))}
								</div>
							</CardContent>
							<CardFooter className="flex flex-col items-start gap-2 text-muted-foreground text-xs">
								<div className="flex w-full items-center justify-between">
									<Badge variant={getStatusColor(draft.status)}>
										{draft.status}
									</Badge>
									<div className="flex items-center gap-1">
										<Clock className="h-3 w-3" />
										{format(draft.updatedAt, "MMM d, yyyy")}
									</div>
								</div>
								{(draft.wordCount !== undefined ||
									draft.versionCount !== undefined) && (
									<div className="flex w-full items-center justify-between">
										{draft.wordCount !== undefined && (
											<span>{draft.wordCount.toLocaleString()} words</span>
										)}
										{draft.versionCount !== undefined && (
											<span>{draft.versionCount} versions</span>
										)}
									</div>
								)}
							</CardFooter>
						</Card>
					))}
				</div>
			) : (
				<div className="space-y-2" data-testid="draft-list-view">
					{paginatedDrafts.map((draft) => (
						<Card
							key={draft.id}
							className="cursor-pointer transition-shadow hover:shadow-md"
							onClick={() => onDraftSelect(draft.id)}
						>
							<CardContent className="flex items-center justify-between p-4">
								<div className="flex-1 space-y-1">
									<div className="flex items-center gap-2">
										<h3 className="font-medium" data-testid="draft-title">
											{draft.title}
										</h3>
										<Badge variant={getStatusColor(draft.status)}>
											{draft.status}
										</Badge>
									</div>
									{draft.description && (
										<p className="text-muted-foreground text-sm">
											{draft.description}
										</p>
									)}
									<div className="flex items-center gap-4 text-muted-foreground text-xs">
										<div className="flex items-center gap-1">
											<Calendar className="h-3 w-3" />
											Created {format(draft.createdAt, "MMM d, yyyy")}
										</div>
										<div className="flex items-center gap-1">
											<Clock className="h-3 w-3" />
											Updated {format(draft.updatedAt, "MMM d, yyyy")}
										</div>
										{draft.wordCount !== undefined && (
											<span>{draft.wordCount.toLocaleString()} words</span>
										)}
										{draft.versionCount !== undefined && (
											<span>{draft.versionCount} versions</span>
										)}
									</div>
								</div>
								<DropdownMenu>
									<DropdownMenuTrigger
										asChild
										onClick={(e) => e.stopPropagation()}
									>
										<Button
											size="icon"
											variant="ghost"
											aria-label="More options"
										>
											<MoreVertical className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										{onDraftEdit && (
											<DropdownMenuItem
												onClick={(e) => {
													e.stopPropagation();
													onDraftEdit(draft.id);
												}}
											>
												<Edit className="mr-2 h-4 w-4" />
												Edit
											</DropdownMenuItem>
										)}
										{onDraftDuplicate && (
											<DropdownMenuItem
												onClick={(e) => {
													e.stopPropagation();
													onDraftDuplicate(draft.id);
												}}
											>
												<Copy className="mr-2 h-4 w-4" />
												Duplicate
											</DropdownMenuItem>
										)}
										{(onDraftEdit || onDraftDuplicate) && onDraftDelete && (
											<DropdownMenuSeparator />
										)}
										{onDraftDelete && (
											<DropdownMenuItem
												className="text-destructive"
												onClick={(e) => {
													e.stopPropagation();
													setShowDeleteDialog(draft.id);
												}}
											>
												<Trash2 className="mr-2 h-4 w-4" />
												Delete
											</DropdownMenuItem>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-center gap-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
						disabled={currentPage === 1}
						aria-label="Previous page"
					>
						Previous
					</Button>
					<span className="text-muted-foreground text-sm">
						Page {currentPage} of {totalPages}
					</span>
					<Button
						size="sm"
						variant="outline"
						onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
						disabled={currentPage === totalPages}
						aria-label="Next page"
					>
						Next
					</Button>
				</div>
			)}

			{/* Create Draft Dialog */}
			<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New Draft</DialogTitle>
						<DialogDescription>
							Start a new content draft with a title and optional description
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="draft-title">Draft Title</Label>
							<Input
								id="draft-title"
								value={newDraft.title || ""}
								onChange={(e) =>
									setNewDraft({ ...newDraft, title: e.target.value })
								}
								placeholder="Enter draft title..."
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="draft-description">Description</Label>
							<Textarea
								id="draft-description"
								value={newDraft.description || ""}
								onChange={(e) =>
									setNewDraft({ ...newDraft, description: e.target.value })
								}
								placeholder="Optional description..."
								className="min-h-[80px]"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowCreateDialog(false)}
						>
							Cancel
						</Button>
						<Button onClick={handleCreateDraft} disabled={!newDraft.title}>
							Create Draft
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={!!showDeleteDialog}
				onOpenChange={() => setShowDeleteDialog(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete the
							draft and all its versions.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground"
							onClick={() =>
								showDeleteDialog && handleDeleteDraft(showDeleteDialog)
							}
						>
							Confirm Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
