import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
	aiConversations,
	chatMessages,
	drafts,
	messageRoleEnum,
} from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

// Input validation schemas
const createConversationSchema = z.object({
	draftId: z.string().uuid(),
	title: z.string().max(255).optional(),
	initialMessage: z.string().optional(),
});

const sendMessageSchema = z.object({
	conversationId: z.string().uuid(),
	content: z.string().min(1),
	role: z.enum(messageRoleEnum.enumValues).default("user"),
});

const getMessagesSchema = z.object({
	conversationId: z.string().uuid(),
	limit: z.number().min(1).max(100).default(50),
	cursor: z.string().uuid().optional(), // for pagination
});

const updateConversationSchema = z.object({
	conversationId: z.string().uuid(),
	title: z.string().max(255),
});

export const chatRouter = createTRPCRouter({
	// Create a new conversation for a draft
	createConversation: protectedProcedure
		.input(createConversationSchema)
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
						"You don't have permission to create conversations for this draft",
				});
			}

			// Create the conversation
			const conversationResult = await ctx.db
				.insert(aiConversations)
				.values({
					draftId: input.draftId,
					userId,
					title: input.title || `Chat about ${draft.title}`,
					lastMessageAt: input.initialMessage ? new Date() : null,
				})
				.returning();

			const conversation = conversationResult[0];
			if (!conversation) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create conversation",
				});
			}

			// Create initial message if provided
			if (input.initialMessage) {
				await ctx.db.insert(chatMessages).values({
					conversationId: conversation.id,
					role: "user",
					content: input.initialMessage,
				});
			}

			return conversation;
		}),

	// Send a message to a conversation
	sendMessage: protectedProcedure
		.input(sendMessageSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check conversation ownership
			const [conversation] = await ctx.db
				.select()
				.from(aiConversations)
				.where(eq(aiConversations.id, input.conversationId));

			if (!conversation) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Conversation not found",
				});
			}

			if (conversation.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this conversation",
				});
			}

			// Create the message
			const [message] = await ctx.db
				.insert(chatMessages)
				.values({
					conversationId: input.conversationId,
					role: input.role,
					content: input.content,
					metadata: input.role === "assistant" ? {} : undefined,
				})
				.returning();

			// Update conversation's last message timestamp
			await ctx.db
				.update(aiConversations)
				.set({
					lastMessageAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(aiConversations.id, input.conversationId));

			return message;
		}),

	// Get messages for a conversation
	getMessages: protectedProcedure
		.input(getMessagesSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check conversation ownership
			const [conversation] = await ctx.db
				.select()
				.from(aiConversations)
				.where(eq(aiConversations.id, input.conversationId));

			if (!conversation) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Conversation not found",
				});
			}

			if (conversation.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this conversation",
				});
			}

			// Build query with optional cursor
			const whereClause = input.cursor
				? and(
						eq(chatMessages.conversationId, input.conversationId),
						sql`${chatMessages.createdAt} < (SELECT created_at FROM ${chatMessages} WHERE id = ${input.cursor})`,
					)
				: eq(chatMessages.conversationId, input.conversationId);

			const messages = await ctx.db
				.select()
				.from(chatMessages)
				.where(whereClause)
				.orderBy(desc(chatMessages.createdAt))
				.limit(input.limit + 1); // Get one extra to check if there's more

			// Check if there are more messages
			const hasMore = messages.length > input.limit;
			const messagesToReturn = hasMore ? messages.slice(0, -1) : messages;

			return {
				messages: messagesToReturn.reverse(), // Return in chronological order
				hasMore,
				nextCursor: hasMore
					? messagesToReturn[messagesToReturn.length - 1]?.id
					: undefined,
			};
		}),

	// Get all conversations for a draft
	getConversationsByDraft: protectedProcedure
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

			// Get conversations with message count
			const conversations = await ctx.db
				.select({
					conversation: aiConversations,
					messageCount: sql<number>`COUNT(${chatMessages.id})`,
				})
				.from(aiConversations)
				.leftJoin(
					chatMessages,
					eq(chatMessages.conversationId, aiConversations.id),
				)
				.where(eq(aiConversations.draftId, input))
				.groupBy(aiConversations.id)
				.orderBy(desc(aiConversations.lastMessageAt));

			return conversations.map(({ conversation, messageCount }) => ({
				...conversation,
				messageCount: Number(messageCount) || 0,
			}));
		}),

	// Get a single conversation
	getConversation: protectedProcedure
		.input(z.string().uuid())
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Get conversation with draft info
			const [conversationWithDraft] = await ctx.db
				.select({
					conversation: aiConversations,
					draft: drafts,
				})
				.from(aiConversations)
				.innerJoin(drafts, eq(aiConversations.draftId, drafts.id))
				.where(eq(aiConversations.id, input));

			if (!conversationWithDraft) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Conversation not found",
				});
			}

			if (conversationWithDraft.conversation.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this conversation",
				});
			}

			// Get message count
			const [messageStats] = await ctx.db
				.select({
					totalMessages: sql<number>`COUNT(*)`,
					userMessages: sql<number>`COUNT(*) FILTER (WHERE role = 'user')`,
					assistantMessages: sql<number>`COUNT(*) FILTER (WHERE role = 'assistant')`,
				})
				.from(chatMessages)
				.where(eq(chatMessages.conversationId, input));

			return {
				...conversationWithDraft.conversation,
				draft: conversationWithDraft.draft,
				stats: {
					totalMessages: Number(messageStats?.totalMessages) || 0,
					userMessages: Number(messageStats?.userMessages) || 0,
					assistantMessages: Number(messageStats?.assistantMessages) || 0,
				},
			};
		}),

	// Update conversation title
	updateConversation: protectedProcedure
		.input(updateConversationSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check conversation ownership
			const [conversation] = await ctx.db
				.select()
				.from(aiConversations)
				.where(eq(aiConversations.id, input.conversationId));

			if (!conversation) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Conversation not found",
				});
			}

			if (conversation.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to update this conversation",
				});
			}

			// Update the conversation
			const [updatedConversation] = await ctx.db
				.update(aiConversations)
				.set({
					title: input.title,
					updatedAt: new Date(),
				})
				.where(eq(aiConversations.id, input.conversationId))
				.returning();

			return updatedConversation;
		}),

	// Delete a conversation
	deleteConversation: protectedProcedure
		.input(z.string().uuid())
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check conversation ownership
			const [conversation] = await ctx.db
				.select()
				.from(aiConversations)
				.where(eq(aiConversations.id, input));

			if (!conversation) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Conversation not found",
				});
			}

			if (conversation.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to delete this conversation",
				});
			}

			// Delete the conversation (messages will cascade delete)
			await ctx.db.delete(aiConversations).where(eq(aiConversations.id, input));

			return { success: true };
		}),
});
