import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { drafts, versions } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

// Input validation schemas
const createVersionSchema = z.object({
	draftId: z.string().uuid(),
	content: z.string(),
});

const compareVersionsSchema = z.object({
	draftId: z.string().uuid(),
	versionIds: z.tuple([z.string().uuid(), z.string().uuid()]),
});

const restoreVersionSchema = z.object({
	draftId: z.string().uuid(),
	versionId: z.string().uuid(),
});

export const versionRouter = createTRPCRouter({
	// Create a new version for a draft
	create: protectedProcedure
		.input(createVersionSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check draft ownership
			const [draft] = await ctx.db
				.select()
				.from(drafts)
				.where(eq(drafts.id, input.draftId));

			if (!draft) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Draft not found",
				});
			}

			if (draft.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"You don't have permission to create versions for this draft",
				});
			}

			// Get the latest version number
			const [latestVersion] = await ctx.db
				.select({ maxVersion: sql<number>`COALESCE(MAX(version_number), 0)` })
				.from(versions)
				.where(eq(versions.draftId, input.draftId));

			const newVersionNumber = (latestVersion?.maxVersion ?? 0) + 1;

			// Create the new version
			const versionResult = await ctx.db
				.insert(versions)
				.values({
					draftId: input.draftId,
					content: input.content,
					versionNumber: newVersionNumber,
					isPublished: false,
					createdBy: userId,
				})
				.returning();

			const newVersion = versionResult[0];
			if (!newVersion) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create version",
				});
			}

			// Update draft's current version
			await ctx.db
				.update(drafts)
				.set({
					currentVersionId: newVersion.id,
					updatedAt: new Date(),
				})
				.where(eq(drafts.id, input.draftId));

			return newVersion;
		}),

	// Get all versions for a draft
	getByDraftId: protectedProcedure
		.input(z.string().uuid())
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check draft ownership
			const [draft] = await ctx.db
				.select()
				.from(drafts)
				.where(eq(drafts.id, input));

			if (!draft) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Draft not found",
				});
			}

			if (draft.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this draft's versions",
				});
			}

			// Get all versions
			const draftVersions = await ctx.db
				.select()
				.from(versions)
				.where(eq(versions.draftId, input))
				.orderBy(desc(versions.versionNumber));

			return {
				versions: draftVersions,
				currentVersionId: draft.currentVersionId,
				totalVersions: draftVersions.length,
			};
		}),

	// Get a specific version
	getById: protectedProcedure
		.input(z.string().uuid())
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Get version with draft info
			const [versionWithDraft] = await ctx.db
				.select({
					version: versions,
					draft: drafts,
				})
				.from(versions)
				.innerJoin(drafts, eq(versions.draftId, drafts.id))
				.where(eq(versions.id, input));

			if (!versionWithDraft) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Version not found",
				});
			}

			if (versionWithDraft.draft.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this version",
				});
			}

			return versionWithDraft.version;
		}),

	// Compare two versions
	compare: protectedProcedure
		.input(compareVersionsSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check draft ownership
			const [draft] = await ctx.db
				.select()
				.from(drafts)
				.where(eq(drafts.id, input.draftId));

			if (!draft) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Draft not found",
				});
			}

			if (draft.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this draft",
				});
			}

			// Get both versions
			const requestedVersions = await ctx.db
				.select()
				.from(versions)
				.where(
					and(
						eq(versions.draftId, input.draftId),
						sql`${versions.id} IN (${input.versionIds[0]}, ${input.versionIds[1]})`,
					),
				);

			if (requestedVersions.length !== 2) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "One or both versions not found",
				});
			}

			// Sort by version number
			const sortedVersions = requestedVersions.sort(
				(a, b) => a.versionNumber - b.versionNumber,
			);

			return {
				older: sortedVersions[0],
				newer: sortedVersions[1],
				// You could add diff logic here if needed
			};
		}),

	// Restore a previous version (creates a new version with old content)
	restore: protectedProcedure
		.input(restoreVersionSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check draft ownership
			const [draft] = await ctx.db
				.select()
				.from(drafts)
				.where(eq(drafts.id, input.draftId));

			if (!draft) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Draft not found",
				});
			}

			if (draft.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"You don't have permission to restore versions for this draft",
				});
			}

			// Get the version to restore
			const [versionToRestore] = await ctx.db
				.select()
				.from(versions)
				.where(
					and(
						eq(versions.id, input.versionId),
						eq(versions.draftId, input.draftId),
					),
				);

			if (!versionToRestore) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Version not found",
				});
			}

			// Get the latest version number
			const [latestVersion] = await ctx.db
				.select({ maxVersion: sql<number>`MAX(version_number)` })
				.from(versions)
				.where(eq(versions.draftId, input.draftId));

			const newVersionNumber = (latestVersion?.maxVersion ?? 0) + 1;

			// Create a new version with the old content
			const restoredResult = await ctx.db
				.insert(versions)
				.values({
					draftId: input.draftId,
					content: versionToRestore.content,
					versionNumber: newVersionNumber,
					isPublished: false,
					createdBy: userId,
				})
				.returning();

			const restoredVersion = restoredResult[0];
			if (!restoredVersion) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to restore version",
				});
			}

			// Update draft's current version
			await ctx.db
				.update(drafts)
				.set({
					currentVersionId: restoredVersion.id,
					updatedAt: new Date(),
				})
				.where(eq(drafts.id, input.draftId));

			return {
				...restoredVersion,
				restoredFrom: versionToRestore.versionNumber,
			};
		}),

	// Get version history with metadata
	getHistory: protectedProcedure
		.input(z.string().uuid())
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check draft ownership
			const [draft] = await ctx.db
				.select()
				.from(drafts)
				.where(eq(drafts.id, input));

			if (!draft) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Draft not found",
				});
			}

			if (draft.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this draft's history",
				});
			}

			// Get versions with creator info
			const versionHistory = await ctx.db
				.select({
					id: versions.id,
					versionNumber: versions.versionNumber,
					createdAt: versions.createdAt,
					isPublished: versions.isPublished,
					publishedAt: versions.publishedAt,
					contentLength: sql<number>`LENGTH(${versions.content})`,
					isCurrent: sql<boolean>`${versions.id} = ${draft.currentVersionId}`,
				})
				.from(versions)
				.where(eq(versions.draftId, input))
				.orderBy(desc(versions.versionNumber));

			return versionHistory;
		}),
});
