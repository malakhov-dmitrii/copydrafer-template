import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
	aiConversations,
	draftStatusEnum,
	drafts,
	platformEnum,
	versions,
} from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

// Input validation schemas
const createDraftSchema = z.object({
	title: z.string().min(1).max(255),
	targetPlatform: z.enum(platformEnum.enumValues),
	content: z.string().optional(),
});

const updateDraftSchema = z.object({
	id: z.string().uuid(),
	title: z.string().min(1).max(255).optional(),
	targetPlatform: z.enum(platformEnum.enumValues).optional(),
	status: z.enum(draftStatusEnum.enumValues).optional(),
});

const paginationSchema = z.object({
	limit: z.number().min(1).max(100).default(20),
	offset: z.number().min(0).default(0),
	status: z.enum(draftStatusEnum.enumValues).optional(),
});

export const draftRouter = createTRPCRouter({
	// Create a new draft
	create: protectedProcedure
		.input(createDraftSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Create the draft
			const draftResult = await ctx.db
				.insert(drafts)
				.values({
					userId,
					title: input.title,
					targetPlatform: input.targetPlatform,
					status: "draft",
				})
				.returning();

			const draft = draftResult[0];
			if (!draft) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create draft",
				});
			}

			// Create the first version if content is provided
			if (input.content) {
				const versionResult = await ctx.db
					.insert(versions)
					.values({
						draftId: draft.id,
						content: input.content,
						versionNumber: 1,
						isPublished: false,
						createdBy: userId,
					})
					.returning();

				const version = versionResult[0];
				if (!version) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to create version",
					});
				}

				// Update draft with current version
				await ctx.db
					.update(drafts)
					.set({ currentVersionId: version.id })
					.where(eq(drafts.id, draft.id));

				return { ...draft, currentVersionId: version.id };
			}

			return draft;
		}),

	// Get all drafts for the authenticated user
	getAll: protectedProcedure
		.input(paginationSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { limit, offset, status } = input;

			// Build where clause
			const whereClause = status
				? and(eq(drafts.userId, userId), eq(drafts.status, status))
				: eq(drafts.userId, userId);

			// Get drafts with pagination
			const userDrafts = await ctx.db
				.select({
					draft: drafts,
					currentVersion: versions,
				})
				.from(drafts)
				.leftJoin(versions, eq(drafts.currentVersionId, versions.id))
				.where(whereClause)
				.orderBy(desc(drafts.updatedAt))
				.limit(limit)
				.offset(offset);

			// Get total count
			const [countResult] = await ctx.db
				.select({ count: sql<number>`count(*)` })
				.from(drafts)
				.where(whereClause);

			return {
				drafts: userDrafts.map((row) => ({
					...row.draft,
					currentVersion: row.currentVersion,
				})),
				totalCount: countResult?.count ?? 0,
				hasMore: offset + limit < (countResult?.count ?? 0),
			};
		}),

	// Get a single draft by ID
	getById: protectedProcedure
		.input(z.string().uuid())
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Get draft with versions
			const result = await ctx.db
				.select({
					draft: drafts,
					version: versions,
				})
				.from(drafts)
				.leftJoin(versions, eq(versions.draftId, drafts.id))
				.where(eq(drafts.id, input))
				.orderBy(desc(versions.versionNumber));

			if (!result.length || !result[0]?.draft) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Draft not found",
				});
			}

			const draft = result[0].draft;

			// Check ownership
			if (draft.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this draft",
				});
			}

			// Group versions
			const draftVersions = result
				.filter((r) => r.version)
				.map((r) => r.version!);

			// Get conversation count
			const [conversationCount] = await ctx.db
				.select({ count: sql<number>`count(*)` })
				.from(aiConversations)
				.where(eq(aiConversations.draftId, input));

			return {
				...draft,
				versions: draftVersions,
				conversationCount: conversationCount?.count ?? 0,
			};
		}),

	// Update a draft
	update: protectedProcedure
		.input(updateDraftSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { id, ...updateData } = input;

			// Check ownership
			const [existingDraft] = await ctx.db
				.select()
				.from(drafts)
				.where(eq(drafts.id, id));

			if (!existingDraft) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Draft not found",
				});
			}

			if (existingDraft.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to update this draft",
				});
			}

			// Update the draft
			const [updatedDraft] = await ctx.db
				.update(drafts)
				.set({
					...updateData,
					updatedAt: new Date(),
				})
				.where(eq(drafts.id, id))
				.returning();

			return updatedDraft;
		}),

	// Delete (archive) a draft
	delete: protectedProcedure
		.input(z.string().uuid())
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check ownership
			const [existingDraft] = await ctx.db
				.select()
				.from(drafts)
				.where(eq(drafts.id, input));

			if (!existingDraft) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Draft not found",
				});
			}

			if (existingDraft.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to delete this draft",
				});
			}

			// Soft delete by setting status to archived
			const [archivedDraft] = await ctx.db
				.update(drafts)
				.set({
					status: "archived",
					updatedAt: new Date(),
				})
				.where(eq(drafts.id, input))
				.returning();

			return archivedDraft;
		}),

	// Publish a draft
	publish: protectedProcedure
		.input(z.string().uuid())
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check ownership and get current version
			const [draftWithVersion] = await ctx.db
				.select({
					draft: drafts,
					currentVersion: versions,
				})
				.from(drafts)
				.leftJoin(versions, eq(drafts.currentVersionId, versions.id))
				.where(eq(drafts.id, input));

			if (!draftWithVersion?.draft) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Draft not found",
				});
			}

			if (draftWithVersion.draft.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to publish this draft",
				});
			}

			if (!draftWithVersion.currentVersion) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Cannot publish draft without content",
				});
			}

			// Start a transaction to update both draft and version
			const publishedAt = new Date();

			// Update version to published
			await ctx.db
				.update(versions)
				.set({
					isPublished: true,
					publishedAt,
				})
				.where(eq(versions.id, draftWithVersion.currentVersion.id));

			// Update draft status
			const [publishedDraft] = await ctx.db
				.update(drafts)
				.set({
					status: "published",
					updatedAt: publishedAt,
				})
				.where(eq(drafts.id, input))
				.returning();

			return {
				...publishedDraft,
				publishedVersion: {
					...draftWithVersion.currentVersion,
					isPublished: true,
					publishedAt,
				},
			};
		}),
});
