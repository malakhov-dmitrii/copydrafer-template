import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface Version {
	id: string;
	name: string;
	content: string;
	createdAt: Date;
	updatedAt: Date;
	isActive?: boolean;
	aiGenerated?: boolean;
	parentVersionId?: string;
	draftId: string;
}

interface VersionState {
	// State
	versions: Map<string, Version[]>; // Keyed by draftId
	currentVersionId: string | null;
	compareMode: boolean;
	compareVersionId: string | null;
	isLoading: boolean;
	error: string | null;

	// Actions
	setVersions: (draftId: string, versions: Version[]) => void;
	addVersion: (version: Version) => void;
	updateVersion: (versionId: string, updates: Partial<Version>) => void;
	deleteVersion: (versionId: string) => void;
	switchVersion: (versionId: string) => void;
	createVersionFromAI: (
		draftId: string,
		content: string,
		name: string,
		parentVersionId?: string,
	) => Version;
	enableCompareMode: (baseVersionId: string, compareVersionId: string) => void;
	disableCompareMode: () => void;
	setLoading: (isLoading: boolean) => void;
	setError: (error: string | null) => void;
	clearVersions: (draftId?: string) => void;
}

export const useVersionStore = create<VersionState>()(
	devtools(
		persist(
			(set, get) => ({
				// Initial state
				versions: new Map(),
				currentVersionId: null,
				compareMode: false,
				compareVersionId: null,
				isLoading: false,
				error: null,

				// Set all versions for a draft
				setVersions: (draftId, versions) =>
					set((state) => {
						const newVersions = new Map(state.versions);
						newVersions.set(draftId, versions);
						return { versions: newVersions };
					}),

				// Add a new version
				addVersion: (version) =>
					set((state) => {
						const newVersions = new Map(state.versions);
						const draftVersions = newVersions.get(version.draftId) || [];
						newVersions.set(version.draftId, [...draftVersions, version]);
						return { versions: newVersions };
					}),

				// Update an existing version
				updateVersion: (versionId, updates) =>
					set((state) => {
						const newVersions = new Map(state.versions);
						for (const [draftId, draftVersions] of newVersions) {
							const index = draftVersions.findIndex((v) => v.id === versionId);
							if (index !== -1) {
								const updatedVersions = [...draftVersions];
								updatedVersions[index] = {
									...updatedVersions[index],
									...updates,
									updatedAt: new Date(),
								};
								newVersions.set(draftId, updatedVersions);
								break;
							}
						}
						return { versions: newVersions };
					}),

				// Delete a version
				deleteVersion: (versionId) =>
					set((state) => {
						const newVersions = new Map(state.versions);
						for (const [draftId, draftVersions] of newVersions) {
							const filtered = draftVersions.filter((v) => v.id !== versionId);
							if (filtered.length !== draftVersions.length) {
								newVersions.set(draftId, filtered);
								break;
							}
						}
						return {
							versions: newVersions,
							currentVersionId:
								state.currentVersionId === versionId
									? null
									: state.currentVersionId,
							compareVersionId:
								state.compareVersionId === versionId
									? null
									: state.compareVersionId,
						};
					}),

				// Switch to a different version
				switchVersion: (versionId) =>
					set({
						currentVersionId: versionId,
						compareMode: false,
						compareVersionId: null,
					}),

				// Create a new version from AI response
				createVersionFromAI: (draftId, content, name, parentVersionId) => {
					const newVersion: Version = {
						id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
						name,
						content,
						createdAt: new Date(),
						updatedAt: new Date(),
						aiGenerated: true,
						parentVersionId,
						draftId,
					};

					get().addVersion(newVersion);
					return newVersion;
				},

				// Enable comparison mode
				enableCompareMode: (baseVersionId, compareVersionId) =>
					set({
						compareMode: true,
						currentVersionId: baseVersionId,
						compareVersionId,
					}),

				// Disable comparison mode
				disableCompareMode: () =>
					set({
						compareMode: false,
						compareVersionId: null,
					}),

				// Set loading state
				setLoading: (isLoading) => set({ isLoading }),

				// Set error state
				setError: (error) => set({ error }),

				// Clear versions for a draft or all
				clearVersions: (draftId) =>
					set((state) => {
						if (draftId) {
							const newVersions = new Map(state.versions);
							newVersions.delete(draftId);
							return { versions: newVersions };
						}
						return {
							versions: new Map(),
							currentVersionId: null,
							compareVersionId: null,
						};
					}),
			}),
			{
				name: "version-store",
				partialize: (state) => ({
					currentVersionId: state.currentVersionId,
					compareMode: state.compareMode,
					compareVersionId: state.compareVersionId,
				}),
			},
		),
	),
);
