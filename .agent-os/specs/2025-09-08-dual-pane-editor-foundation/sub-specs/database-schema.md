# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/spec.md

## New Tables

### Drafts Table
```typescript
export const drafts = createTable("draft", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  currentVersionId: varchar("current_version_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Versions Table
```typescript
export const versions = createTable("version", {
  id: varchar("id", { length: 255 }).primaryKey(),
  draftId: varchar("draft_id", { length: 255 }).notNull().references(() => drafts.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  versionNumber: integer("version_number").notNull(),
  parentVersionId: varchar("parent_version_id", { length: 255 }),
  generationSource: varchar("generation_source", { length: 50 }), // "user", "ai_generation", "ai_edit"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Chat Messages Table
```typescript
export const chatMessages = createTable("chat_message", {
  id: varchar("id", { length: 255 }).primaryKey(),
  draftId: varchar("draft_id", { length: 255 }).notNull().references(() => drafts.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  metadata: json("metadata"), // For storing AI model info, generation parameters, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### AI Conversations Table
```typescript
export const aiConversations = createTable("ai_conversation", {
  id: varchar("id", { length: 255 }).primaryKey(),
  draftId: varchar("draft_id", { length: 255 }).notNull().references(() => drafts.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(), // "openai", "anthropic", etc.
  model: varchar("model", { length: 100 }).notNull(), // "gpt-4", "claude-3", etc.
  systemPrompt: text("system_prompt"),
  totalTokens: integer("total_tokens"),
  totalCost: decimal("total_cost", { precision: 10, scale: 6 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

## Indexes and Constraints

```typescript
// Indexes for performance
export const draftUserIdIdx = index("draft_user_id_idx").on(drafts.userId);
export const versionDraftIdIdx = index("version_draft_id_idx").on(versions.draftId);
export const chatMessageDraftIdIdx = index("chat_message_draft_id_idx").on(chatMessages.draftId);
export const aiConversationDraftIdIdx = index("ai_conversation_draft_id_idx").on(aiConversations.draftId);

// Foreign key relationships
export const draftRelations = relations(drafts, ({ one, many }) => ({
  user: one(users, { fields: [drafts.userId], references: [users.id] }),
  versions: many(versions),
  chatMessages: many(chatMessages),
  aiConversations: many(aiConversations),
  currentVersion: one(versions, { 
    fields: [drafts.currentVersionId], 
    references: [versions.id] 
  }),
}));

export const versionRelations = relations(versions, ({ one, many }) => ({
  draft: one(drafts, { fields: [versions.draftId], references: [drafts.id] }),
  parentVersion: one(versions, { 
    fields: [versions.parentVersionId], 
    references: [versions.id] 
  }),
  childVersions: many(versions, { relationName: "versionParent" }),
}));

export const chatMessageRelations = relations(chatMessages, ({ one }) => ({
  draft: one(drafts, { fields: [chatMessages.draftId], references: [drafts.id] }),
}));

export const aiConversationRelations = relations(aiConversations, ({ one }) => ({
  draft: one(drafts, { fields: [aiConversations.draftId], references: [drafts.id] }),
}));
```

## Migration Strategy

1. **Create new tables** using Drizzle generate and migrate commands
2. **Add foreign key constraints** after table creation to avoid circular dependencies  
3. **Create indexes** for query performance on user-scoped data access
4. **Set up cascading deletes** to maintain data consistency when drafts are deleted
5. **Initialize default data** for existing users if needed (empty state)

## Data Integrity Rules

- All drafts must belong to a user (foreign key constraint)
- Current version ID must reference valid version in same draft
- Version numbers must be sequential within each draft
- Chat messages must belong to valid draft
- Parent version references must be within same draft (application-level validation)