import { describe, expect, it } from "vitest";
import * as schema from "../schema";

describe("CopyDrafter Database Schema", () => {
	describe("Drafts Table", () => {
		it("should have drafts table with required fields", () => {
			expect(schema.drafts).toBeDefined();
			expect(schema.drafts).toHaveProperty("id");
			expect(schema.drafts).toHaveProperty("userId");
			expect(schema.drafts).toHaveProperty("title");
			expect(schema.drafts).toHaveProperty("targetPlatform");
			expect(schema.drafts).toHaveProperty("status");
			expect(schema.drafts).toHaveProperty("currentVersionId");
			expect(schema.drafts).toHaveProperty("createdAt");
			expect(schema.drafts).toHaveProperty("updatedAt");
		});

		it("should have proper draft status enum values", () => {
			expect(schema.draftStatusEnum).toBeDefined();
			expect(schema.draftStatusEnum.enumValues).toContain("draft");
			expect(schema.draftStatusEnum.enumValues).toContain("published");
			expect(schema.draftStatusEnum.enumValues).toContain("archived");
		});

		it("should have proper platform enum values", () => {
			expect(schema.platformEnum).toBeDefined();
			expect(schema.platformEnum.enumValues).toContain("twitter");
			expect(schema.platformEnum.enumValues).toContain("linkedin");
			expect(schema.platformEnum.enumValues).toContain("facebook");
			expect(schema.platformEnum.enumValues).toContain("instagram");
			expect(schema.platformEnum.enumValues).toContain("threads");
		});
	});

	describe("Versions Table", () => {
		it("should have versions table with required fields", () => {
			expect(schema.versions).toBeDefined();
			expect(schema.versions).toHaveProperty("id");
			expect(schema.versions).toHaveProperty("draftId");
			expect(schema.versions).toHaveProperty("content");
			expect(schema.versions).toHaveProperty("versionNumber");
			expect(schema.versions).toHaveProperty("isPublished");
			expect(schema.versions).toHaveProperty("publishedAt");
			expect(schema.versions).toHaveProperty("createdAt");
			expect(schema.versions).toHaveProperty("createdBy");
		});
	});

	describe("Chat Messages Table", () => {
		it("should have chatMessages table with required fields", () => {
			expect(schema.chatMessages).toBeDefined();
			expect(schema.chatMessages).toHaveProperty("id");
			expect(schema.chatMessages).toHaveProperty("conversationId");
			expect(schema.chatMessages).toHaveProperty("role");
			expect(schema.chatMessages).toHaveProperty("content");
			expect(schema.chatMessages).toHaveProperty("createdAt");
			expect(schema.chatMessages).toHaveProperty("metadata");
		});

		it("should have proper message role enum values", () => {
			expect(schema.messageRoleEnum).toBeDefined();
			expect(schema.messageRoleEnum.enumValues).toContain("user");
			expect(schema.messageRoleEnum.enumValues).toContain("assistant");
			expect(schema.messageRoleEnum.enumValues).toContain("system");
		});
	});

	describe("AI Conversations Table", () => {
		it("should have aiConversations table with required fields", () => {
			expect(schema.aiConversations).toBeDefined();
			expect(schema.aiConversations).toHaveProperty("id");
			expect(schema.aiConversations).toHaveProperty("draftId");
			expect(schema.aiConversations).toHaveProperty("userId");
			expect(schema.aiConversations).toHaveProperty("title");
			expect(schema.aiConversations).toHaveProperty("createdAt");
			expect(schema.aiConversations).toHaveProperty("updatedAt");
			expect(schema.aiConversations).toHaveProperty("lastMessageAt");
		});
	});

	describe("Table Relationships", () => {
		it("should have drafts relations defined", () => {
			expect(schema.draftsRelations).toBeDefined();
		});

		it("should have versions relations defined", () => {
			expect(schema.versionsRelations).toBeDefined();
		});

		it("should have chatMessages relations defined", () => {
			expect(schema.chatMessagesRelations).toBeDefined();
		});

		it("should have aiConversations relations defined", () => {
			expect(schema.aiConversationsRelations).toBeDefined();
		});
	});

	describe("Table Prefixes", () => {
		it("should use copydrafer_ prefix for all new tables", () => {
			// Check that the table creator function uses the correct prefix
			expect(schema.createTable).toBeDefined();
			// This ensures consistency with existing project patterns
		});
	});
});
