import { relations, sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	pgTableCreator,
	primaryKey,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */

// Create a custom table creator with copydrafer_ prefix
export const createTable = pgTableCreator((name) => `copydrafer_${name}`);

// Enums for the CopyDrafter application
export const draftStatusEnum = pgEnum("draft_status", [
	"draft",
	"published",
	"archived",
]);
export const platformEnum = pgEnum("platform", [
	"twitter",
	"linkedin",
	"facebook",
	"instagram",
	"threads",
]);
export const messageRoleEnum = pgEnum("message_role", [
	"user",
	"assistant",
	"system",
]);

// Drafts table - main content drafts
export const drafts = createTable(
	"drafts",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		title: varchar("title", { length: 255 }).notNull(),
		targetPlatform: platformEnum("target_platform").notNull(),
		status: draftStatusEnum("status").default("draft").notNull(),
		currentVersionId: text("current_version_id"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [
		index("drafts_user_id_idx").on(t.userId),
		index("drafts_status_idx").on(t.status),
		index("drafts_platform_idx").on(t.targetPlatform),
		index("drafts_created_at_idx").on(t.createdAt),
	],
);

// Versions table - version history for drafts
export const versions = createTable(
	"versions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		draftId: text("draft_id")
			.notNull()
			.references(() => drafts.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		versionNumber: integer("version_number").notNull(),
		isPublished: boolean("is_published").default(false).notNull(),
		publishedAt: timestamp("published_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		createdBy: text("created_by")
			.notNull()
			.references(() => user.id),
	},
	(t) => [
		index("versions_draft_id_idx").on(t.draftId),
		index("versions_version_number_idx").on(t.draftId, t.versionNumber),
		index("versions_is_published_idx").on(t.isPublished),
	],
);

// AI Conversations table - tracks chat conversations per draft
export const aiConversations = createTable(
	"ai_conversations",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		draftId: text("draft_id")
			.notNull()
			.references(() => drafts.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		title: varchar("title", { length: 255 }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.$onUpdate(() => new Date())
			.notNull(),
		lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
	},
	(t) => [
		index("ai_conversations_draft_id_idx").on(t.draftId),
		index("ai_conversations_user_id_idx").on(t.userId),
		index("ai_conversations_last_message_idx").on(t.lastMessageAt),
	],
);

// Chat Messages table - individual messages in conversations
export const chatMessages = createTable(
	"chat_messages",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		conversationId: text("conversation_id")
			.notNull()
			.references(() => aiConversations.id, { onDelete: "cascade" }),
		role: messageRoleEnum("role").notNull(),
		content: text("content").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		metadata: jsonb("metadata").$type<{
			model?: string;
			tokens?: number;
			finishReason?: string;
		}>(),
	},
	(t) => [
		index("chat_messages_conversation_id_idx").on(t.conversationId),
		index("chat_messages_created_at_idx").on(t.createdAt),
	],
);

export const posts = pgTable(
	"post",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		name: d.varchar({ length: 256 }),
		createdById: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => user.id),
		createdAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("created_by_idx").on(t.createdById),
		index("name_idx").on(t.name),
	],
);

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const usersRelations = relations(user, ({ many }) => ({
	accounts: many(account),
	drafts: many(drafts),
	versions: many(versions),
	aiConversations: many(aiConversations),
}));

export const accountsRelations = relations(account, ({ one }) => ({
	user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionsRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] }),
}));

// CopyDrafter table relationships
export const draftsRelations = relations(drafts, ({ one, many }) => ({
	user: one(user, { fields: [drafts.userId], references: [user.id] }),
	currentVersion: one(versions, {
		fields: [drafts.currentVersionId],
		references: [versions.id],
	}),
	versions: many(versions),
	aiConversations: many(aiConversations),
}));

export const versionsRelations = relations(versions, ({ one }) => ({
	draft: one(drafts, { fields: [versions.draftId], references: [drafts.id] }),
	createdByUser: one(user, {
		fields: [versions.createdBy],
		references: [user.id],
	}),
}));

export const aiConversationsRelations = relations(
	aiConversations,
	({ one, many }) => ({
		draft: one(drafts, {
			fields: [aiConversations.draftId],
			references: [drafts.id],
		}),
		user: one(user, {
			fields: [aiConversations.userId],
			references: [user.id],
		}),
		messages: many(chatMessages),
	}),
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
	conversation: one(aiConversations, {
		fields: [chatMessages.conversationId],
		references: [aiConversations.id],
	}),
}));
