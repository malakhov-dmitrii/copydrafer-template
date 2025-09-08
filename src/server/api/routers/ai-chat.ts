import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  aiConversations,
  chatMessages,
  drafts,
  versions,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { handleChatStream, streamContentSuggestions, streamContentValidation } from "@/server/services/ai-streaming";
import { llmService } from "@/server/services/llm-service";
import type { CoreMessage } from 'ai';

/**
 * AI Chat Router with streaming support
 * Handles AI-powered chat interactions with streaming responses
 */

// Input schemas
const streamChatSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().min(1),
  draftId: z.string().uuid(),
});

const generateSuggestionsSchema = z.object({
  draftId: z.string().uuid(),
  type: z.enum(['improvement', 'variation', 'ideas']),
});

const validateContentSchema = z.object({
  draftId: z.string().uuid(),
});

const quickActionSchema = z.object({
  draftId: z.string().uuid(),
  action: z.enum(['improve_clarity', 'make_shorter', 'make_longer', 'add_cta', 'add_hook', 'fix_grammar']),
});

export const aiChatRouter = createTRPCRouter({
  // Stream chat response
  streamChat: protectedProcedure
    .input(streamChatSchema)
    .subscription(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify conversation ownership
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

      // Get draft and current version for context
      const [draftWithVersion] = await ctx.db
        .select({
          draft: drafts,
          version: versions,
        })
        .from(drafts)
        .leftJoin(versions, eq(drafts.currentVersionId, versions.id))
        .where(eq(drafts.id, input.draftId));

      if (!draftWithVersion?.draft || draftWithVersion.draft.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this draft",
        });
      }

      // Get conversation history
      const history = await ctx.db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.conversationId, input.conversationId))
        .orderBy(chatMessages.createdAt);

      // Convert to CoreMessage format
      const conversationHistory: CoreMessage[] = history.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      // Save user message
      await ctx.db.insert(chatMessages).values({
        conversationId: input.conversationId,
        role: 'user',
        content: input.message,
      });

      // Update conversation timestamp
      await ctx.db
        .update(aiConversations)
        .set({
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(aiConversations.id, input.conversationId));

      // Create observable for streaming
      return observable<{ token?: string; done?: boolean; error?: string }>((observer) => {
        let fullResponse = '';

        handleChatStream({
          conversationHistory,
          newMessage: input.message,
          draftContext: draftWithVersion.version?.content || '',
          platform: draftWithVersion.draft.targetPlatform,
          userId,
          options: {
            onStart: () => {
              observer.next({ token: '', done: false });
            },
            onToken: (token) => {
              fullResponse += token;
              observer.next({ token, done: false });
            },
            onCompletion: async (completion) => {
              // Save AI response
              await ctx.db.insert(chatMessages).values({
                conversationId: input.conversationId,
                role: 'assistant',
                content: completion,
                metadata: {
                  model: 'gpt-4-turbo-preview',
                  tokens: completion.length / 4, // Rough estimate
                },
              });

              observer.next({ done: true });
              observer.complete();
            },
            onError: (error) => {
              observer.next({ error: error.message, done: true });
              observer.complete();
            },
          },
        }).catch((error) => {
          observer.next({ error: error.message, done: true });
          observer.complete();
        });
      });
    }),

  // Generate content suggestions (non-streaming)
  generateSuggestions: protectedProcedure
    .input(generateSuggestionsSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get draft and current version
      const [draftWithVersion] = await ctx.db
        .select({
          draft: drafts,
          version: versions,
        })
        .from(drafts)
        .leftJoin(versions, eq(drafts.currentVersionId, versions.id))
        .where(eq(drafts.id, input.draftId));

      if (!draftWithVersion?.draft || draftWithVersion.draft.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this draft",
        });
      }

      if (!draftWithVersion.version?.content) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Draft has no content to analyze",
        });
      }

      // Generate suggestions using LLM service
      const result = await streamContentSuggestions({
        content: draftWithVersion.version.content,
        platform: draftWithVersion.draft.targetPlatform,
        type: input.type,
        userId,
      });

      return {
        suggestions: result.text,
        usage: result.usage,
      };
    }),

  // Validate content
  validateContent: protectedProcedure
    .input(validateContentSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get draft and current version
      const [draftWithVersion] = await ctx.db
        .select({
          draft: drafts,
          version: versions,
        })
        .from(drafts)
        .leftJoin(versions, eq(drafts.currentVersionId, versions.id))
        .where(eq(drafts.id, input.draftId));

      if (!draftWithVersion?.draft || draftWithVersion.draft.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this draft",
        });
      }

      if (!draftWithVersion.version?.content) {
        return {
          isValid: false,
          issues: ["No content to validate"],
          suggestions: ["Add content to your draft"],
          score: 0,
        };
      }

      // Validate using LLM service
      const validation = await llmService.validateContent({
        content: draftWithVersion.version.content,
        platform: draftWithVersion.draft.targetPlatform,
        userId,
      });

      return validation;
    }),

  // Quick content improvements
  quickAction: protectedProcedure
    .input(quickActionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get draft and current version
      const [draftWithVersion] = await ctx.db
        .select({
          draft: drafts,
          version: versions,
        })
        .from(drafts)
        .leftJoin(versions, eq(drafts.currentVersionId, versions.id))
        .where(eq(drafts.id, input.draftId));

      if (!draftWithVersion?.draft || draftWithVersion.draft.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this draft",
        });
      }

      if (!draftWithVersion.version?.content) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Draft has no content to improve",
        });
      }

      // Map action to improvement type
      const improvementMap: Record<typeof input.action, string[]> = {
        improve_clarity: ['clarity', 'readability'],
        make_shorter: ['length', 'conciseness'],
        make_longer: ['detail', 'expansion'],
        add_cta: ['call-to-action', 'engagement'],
        add_hook: ['hook', 'attention-grabbing'],
        fix_grammar: ['grammar', 'spelling', 'punctuation'],
      };

      // Apply improvement using LLM service
      const result = await llmService.improveContent({
        content: draftWithVersion.version.content,
        platform: draftWithVersion.draft.targetPlatform,
        improvements: improvementMap[input.action],
        userId,
      });

      return {
        improvedContent: result.text,
        usage: result.usage,
      };
    }),

  // Generate hashtags
  generateHashtags: protectedProcedure
    .input(z.object({
      draftId: z.string().uuid(),
      count: z.number().min(1).max(30).default(10),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get draft and current version
      const [draftWithVersion] = await ctx.db
        .select({
          draft: drafts,
          version: versions,
        })
        .from(drafts)
        .leftJoin(versions, eq(drafts.currentVersionId, versions.id))
        .where(eq(drafts.id, input.draftId));

      if (!draftWithVersion?.draft || draftWithVersion.draft.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this draft",
        });
      }

      if (!draftWithVersion.version?.content) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Draft has no content to analyze",
        });
      }

      // Generate hashtags using LLM service
      const result = await llmService.generateHashtags({
        content: draftWithVersion.version.content,
        platform: draftWithVersion.draft.targetPlatform,
        count: input.count,
        userId,
      });

      return result;
    }),

  // Adapt content to different platform
  adaptToPlatform: protectedProcedure
    .input(z.object({
      draftId: z.string().uuid(),
      targetPlatform: z.enum(['twitter', 'linkedin', 'facebook', 'instagram', 'threads']),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get draft and current version
      const [draftWithVersion] = await ctx.db
        .select({
          draft: drafts,
          version: versions,
        })
        .from(drafts)
        .leftJoin(versions, eq(drafts.currentVersionId, versions.id))
        .where(eq(drafts.id, input.draftId));

      if (!draftWithVersion?.draft || draftWithVersion.draft.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this draft",
        });
      }

      if (!draftWithVersion.version?.content) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Draft has no content to adapt",
        });
      }

      // Adapt content using LLM service
      const result = await llmService.adaptContent({
        content: draftWithVersion.version.content,
        sourcePlatform: draftWithVersion.draft.targetPlatform,
        targetPlatform: input.targetPlatform,
        userId,
      });

      return {
        adaptedContent: result.text,
        usage: result.usage,
      };
    }),
});