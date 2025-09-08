import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { drafts, versions } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

// Input validation schemas
const autosaveSchema = z.object({
	draftId: z.string().uuid(),
	content: z.string(),
	createNewVersion: z.boolean().default(false),
});

const getAutosaveStatusSchema = z.object({
	draftId: z.string().uuid(),
	currentContent: z.string(),
});

export const autosaveRouter = createTRPCRouter({
	// Autosave draft content
	save: protectedProcedure
		.input(autosaveSchema)
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
					message: "You don't have permission to save this draft",
				});
			}

			// If createNewVersion is true or there's no current version, create a new version
			if (input.createNewVersion || !draft.currentVersionId) {
				// Get the latest version number
				const [latestVersion] = await ctx.db
					.select({ maxVersion: sql<number>`COALESCE(MAX(version_number), 0)` })
					.from(versions)
					.where(eq(versions.draftId, input.draftId));

				const newVersionNumber = (latestVersion?.maxVersion ?? 0) + 1;

				// Create new version
				const result = await ctx.db
					.insert(versions)
					.values({
						draftId: input.draftId,
						content: input.content,
						versionNumber: newVersionNumber,
						isPublished: false,
						createdBy: userId,
					})
					.returning();

				const newVersion = result[0];
				if (!newVersion) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to create new version",
					});
				}

				// Update draft's current version and timestamp
				await ctx.db
					.update(drafts)
					.set({
						currentVersionId: newVersion.id,
						updatedAt: new Date(),
					})
					.where(eq(drafts.id, input.draftId));

				return {
					saved: true,
					versionId: newVersion.id,
					versionNumber: newVersionNumber,
					newVersionCreated: true,
					savedAt: new Date(),
				};
			} else {
				// Update existing version
				if (!draft.currentVersionId) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "No current version to update",
					});
				}

				// Check if user owns the version
				const [currentVersion] = await ctx.db
					.select()
					.from(versions)
					.where(eq(versions.id, draft.currentVersionId));

				if (!currentVersion) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Current version not found",
					});
				}

				// Only update if content has changed
				if (currentVersion.content === input.content) {
					return {
						saved: true,
						versionId: currentVersion.id,
						versionNumber: currentVersion.versionNumber,
						newVersionCreated: false,
						savedAt: new Date(),
						noChanges: true,
					};
				}

				// Update the version content
				await ctx.db
					.update(versions)
					.set({
						content: input.content,
					})
					.where(eq(versions.id, draft.currentVersionId));

				// Update draft's timestamp
				await ctx.db
					.update(drafts)
					.set({
						updatedAt: new Date(),
					})
					.where(eq(drafts.id, input.draftId));

				return {
					saved: true,
					versionId: currentVersion.id,
					versionNumber: currentVersion.versionNumber,
					newVersionCreated: false,
					savedAt: new Date(),
				};
			}
		}),

	// Get autosave status - check if content has changed
	getStatus: protectedProcedure
		.input(getAutosaveStatusSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check draft ownership and get current version
			const [draftWithVersion] = await ctx.db
				.select({
					draft: drafts,
					currentVersion: versions,
				})
				.from(drafts)
				.leftJoin(versions, eq(drafts.currentVersionId, versions.id))
				.where(eq(drafts.id, input.draftId));

			if (!draftWithVersion?.draft) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Draft not found",
				});
			}

			if (draftWithVersion.draft.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this draft",
				});
			}

			const hasChanges = draftWithVersion.currentVersion
				? draftWithVersion.currentVersion.content !== input.currentContent
				: input.currentContent.length > 0;

			const lastSaved =
				draftWithVersion.currentVersion?.createdAt ||
				draftWithVersion.draft.createdAt;

			return {
				hasUnsavedChanges: hasChanges,
				lastSaved,
				currentVersionId: draftWithVersion.draft.currentVersionId,
				currentVersionNumber: draftWithVersion.currentVersion?.versionNumber,
			};
		}),

	// Create a checkpoint (new version) for important saves
	createCheckpoint: protectedProcedure
		.input(
			z.object({
				draftId: z.string().uuid(),
				content: z.string(),
				checkpointName: z.string().optional(),
			}),
		)
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
						"You don't have permission to create checkpoints for this draft",
				});
			}

			// Get the latest version number
			const [latestVersion] = await ctx.db
				.select({ maxVersion: sql<number>`COALESCE(MAX(version_number), 0)` })
				.from(versions)
				.where(eq(versions.draftId, input.draftId));

			const newVersionNumber = (latestVersion?.maxVersion ?? 0) + 1;

			// Create checkpoint version with metadata
			const checkpointResult = await ctx.db
				.insert(versions)
				.values({
					draftId: input.draftId,
					content: input.content,
					versionNumber: newVersionNumber,
					isPublished: false,
					createdBy: userId,
				})
				.returning();

			const checkpoint = checkpointResult[0];
			if (!checkpoint) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create checkpoint",
				});
			}

			// Update draft's current version
			await ctx.db
				.update(drafts)
				.set({
					currentVersionId: checkpoint.id,
					updatedAt: new Date(),
				})
				.where(eq(drafts.id, input.draftId));

			return {
				checkpointId: checkpoint.id,
				versionNumber: newVersionNumber,
				createdAt: checkpoint.createdAt,
				name: input.checkpointName,
			};
		}),

	// Get recent autosave activity
	getRecentActivity: protectedProcedure
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
					message: "You don't have access to this draft",
				});
			}

			// Get recent version activity (last 24 hours)
			const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

			const recentVersions = await ctx.db
				.select({
					id: versions.id,
					versionNumber: versions.versionNumber,
					createdAt: versions.createdAt,
					contentLength: sql<number>`LENGTH(${versions.content})`,
				})
				.from(versions)
				.where(
					and(
						eq(versions.draftId, input),
						sql`${versions.createdAt} >= ${twentyFourHoursAgo}`,
					),
				)
				.orderBy(versions.createdAt);

			return {
				recentVersions,
				totalSavesToday: recentVersions.length,
				lastSaved: draft.updatedAt,
				currentVersionId: draft.currentVersionId,
			};
		}),
});
