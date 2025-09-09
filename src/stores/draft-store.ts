import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface Draft {
	id: string;
	title: string;
	description?: string;
	content: string;
	status: "draft" | "published" | "archived";
	tags: string[];
	createdAt: Date;
	updatedAt: Date;
	wordCount: number;
	versionCount: number;
	projectId?: string;
}

interface DraftState {
	// State
	drafts: Draft[];
	currentDraftId: string | null;
	searchTerm: string;
	statusFilter: "all" | "draft" | "published" | "archived";
	tagFilter: Set<string>;
	sortBy: "updated" | "created" | "title";
	sortOrder: "asc" | "desc";
	isLoading: boolean;
	error: string | null;

	// Actions
	setDrafts: (drafts: Draft[]) => void;
	addDraft: (
		draft: Omit<
			Draft,
			"id" | "createdAt" | "updatedAt" | "wordCount" | "versionCount"
		>,
	) => Draft;
	updateDraft: (draftId: string, updates: Partial<Draft>) => void;
	deleteDraft: (draftId: string) => void;
	duplicateDraft: (draftId: string) => Draft | null;
	selectDraft: (draftId: string | null) => void;
	publishDraft: (draftId: string) => void;
	archiveDraft: (draftId: string) => void;

	// Tag management
	addTagToDraft: (draftId: string, tag: string) => void;
	removeTagFromDraft: (draftId: string, tag: string) => void;
	getAllTags: () => string[];

	// Search and filter
	setSearchTerm: (term: string) => void;
	setStatusFilter: (status: DraftState["statusFilter"]) => void;
	toggleTagFilter: (tag: string) => void;
	clearFilters: () => void;

	// Sorting
	setSortBy: (sortBy: DraftState["sortBy"]) => void;
	setSortOrder: (order: DraftState["sortOrder"]) => void;

	// Utility
	getFilteredDrafts: () => Draft[];
	getDraftById: (draftId: string) => Draft | undefined;
	setLoading: (isLoading: boolean) => void;
	setError: (error: string | null) => void;
}

export const useDraftStore = create<DraftState>()(
	devtools(
		persist(
			(set, get) => ({
				// Initial state
				drafts: [],
				currentDraftId: null,
				searchTerm: "",
				statusFilter: "all",
				tagFilter: new Set(),
				sortBy: "updated",
				sortOrder: "desc",
				isLoading: false,
				error: null,

				// Set all drafts
				setDrafts: (drafts) => set({ drafts }),

				// Add a new draft
				addDraft: (draftData) => {
					const newDraft: Draft = {
						...draftData,
						id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
						createdAt: new Date(),
						updatedAt: new Date(),
						wordCount: draftData.content
							? draftData.content.split(/\s+/).length
							: 0,
						versionCount: 1,
					};
					set((state) => ({
						drafts: [...state.drafts, newDraft],
						currentDraftId: newDraft.id,
					}));
					return newDraft;
				},

				// Update an existing draft
				updateDraft: (draftId, updates) =>
					set((state) => ({
						drafts: state.drafts.map((draft) =>
							draft.id === draftId
								? {
										...draft,
										...updates,
										updatedAt: new Date(),
										wordCount: updates.content
											? updates.content.split(/\s+/).length
											: draft.wordCount,
									}
								: draft,
						),
					})),

				// Delete a draft
				deleteDraft: (draftId) =>
					set((state) => ({
						drafts: state.drafts.filter((draft) => draft.id !== draftId),
						currentDraftId:
							state.currentDraftId === draftId ? null : state.currentDraftId,
					})),

				// Duplicate a draft
				duplicateDraft: (draftId) => {
					const draft = get().drafts.find((d) => d.id === draftId);
					if (!draft) return null;

					const duplicatedDraft: Draft = {
						...draft,
						id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
						title: `${draft.title} (Copy)`,
						createdAt: new Date(),
						updatedAt: new Date(),
						status: "draft",
						versionCount: 1,
					};

					set((state) => ({
						drafts: [...state.drafts, duplicatedDraft],
					}));

					return duplicatedDraft;
				},

				// Select a draft
				selectDraft: (draftId) => set({ currentDraftId: draftId }),

				// Publish a draft
				publishDraft: (draftId) =>
					set((state) => ({
						drafts: state.drafts.map((draft) =>
							draft.id === draftId
								? { ...draft, status: "published", updatedAt: new Date() }
								: draft,
						),
					})),

				// Archive a draft
				archiveDraft: (draftId) =>
					set((state) => ({
						drafts: state.drafts.map((draft) =>
							draft.id === draftId
								? { ...draft, status: "archived", updatedAt: new Date() }
								: draft,
						),
					})),

				// Add tag to draft
				addTagToDraft: (draftId, tag) =>
					set((state) => ({
						drafts: state.drafts.map((draft) =>
							draft.id === draftId && !draft.tags.includes(tag)
								? {
										...draft,
										tags: [...draft.tags, tag],
										updatedAt: new Date(),
									}
								: draft,
						),
					})),

				// Remove tag from draft
				removeTagFromDraft: (draftId, tag) =>
					set((state) => ({
						drafts: state.drafts.map((draft) =>
							draft.id === draftId
								? {
										...draft,
										tags: draft.tags.filter((t) => t !== tag),
										updatedAt: new Date(),
									}
								: draft,
						),
					})),

				// Get all unique tags
				getAllTags: () => {
					const tags = new Set<string>();
					get().drafts.forEach((draft) => {
						draft.tags.forEach((tag) => tags.add(tag));
					});
					return Array.from(tags).sort();
				},

				// Set search term
				setSearchTerm: (term) => set({ searchTerm: term }),

				// Set status filter
				setStatusFilter: (status) => set({ statusFilter: status }),

				// Toggle tag filter
				toggleTagFilter: (tag) =>
					set((state) => {
						const newTagFilter = new Set(state.tagFilter);
						if (newTagFilter.has(tag)) {
							newTagFilter.delete(tag);
						} else {
							newTagFilter.add(tag);
						}
						return { tagFilter: newTagFilter };
					}),

				// Clear all filters
				clearFilters: () =>
					set({
						searchTerm: "",
						statusFilter: "all",
						tagFilter: new Set(),
					}),

				// Set sort by
				setSortBy: (sortBy) => set({ sortBy }),

				// Set sort order
				setSortOrder: (order) => set({ sortOrder: order }),

				// Get filtered and sorted drafts
				getFilteredDrafts: () => {
					const state = get();
					let filtered = [...state.drafts];

					// Apply search filter
					if (state.searchTerm) {
						const term = state.searchTerm.toLowerCase();
						filtered = filtered.filter(
							(draft) =>
								draft.title.toLowerCase().includes(term) ||
								draft.description?.toLowerCase().includes(term) ||
								draft.content.toLowerCase().includes(term) ||
								draft.tags.some((tag) => tag.toLowerCase().includes(term)),
						);
					}

					// Apply status filter
					if (state.statusFilter !== "all") {
						filtered = filtered.filter(
							(draft) => draft.status === state.statusFilter,
						);
					}

					// Apply tag filter
					if (state.tagFilter.size > 0) {
						filtered = filtered.filter((draft) =>
							Array.from(state.tagFilter).some((tag) =>
								draft.tags.includes(tag),
							),
						);
					}

					// Apply sorting
					filtered.sort((a, b) => {
						let comparison = 0;
						switch (state.sortBy) {
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
						return state.sortOrder === "asc" ? comparison : -comparison;
					});

					return filtered;
				},

				// Get draft by ID
				getDraftById: (draftId) =>
					get().drafts.find((draft) => draft.id === draftId),

				// Set loading state
				setLoading: (isLoading) => set({ isLoading }),

				// Set error state
				setError: (error) => set({ error }),
			}),
			{
				name: "draft-store",
				partialize: (state) => ({
					currentDraftId: state.currentDraftId,
					searchTerm: state.searchTerm,
					statusFilter: state.statusFilter,
					tagFilter: state.tagFilter,
					sortBy: state.sortBy,
					sortOrder: state.sortOrder,
				}),
			},
		),
	),
);
