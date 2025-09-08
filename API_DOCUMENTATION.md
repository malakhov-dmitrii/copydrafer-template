# CopyDrafter API Documentation

## Overview

CopyDrafter uses tRPC for type-safe API communication between frontend and backend. All endpoints require authentication except where noted.

## Base Setup

```typescript
// Import the tRPC hooks in your React components
import { api } from "@/trpc/react";
```

## Authentication

All API endpoints use Better Auth session context. Users must be authenticated to access the API.

## API Endpoints

### Draft Router (`api.draft.*`)

#### Create Draft
```typescript
const mutation = api.draft.create.useMutation();

// Usage
await mutation.mutateAsync({
  title: "My Social Media Post",
  targetPlatform: "twitter", // 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'threads'
  content: "Optional initial content"
});

// Returns: Draft object with id, timestamps, etc.
```

#### Get All Drafts
```typescript
const { data } = api.draft.getAll.useQuery({
  limit: 20,        // Optional, default: 20
  offset: 0,        // Optional, default: 0  
  status: "draft"   // Optional: 'draft' | 'published' | 'archived'
});

// Returns: { drafts: Draft[], totalCount: number, hasMore: boolean }
```

#### Get Draft by ID
```typescript
const { data } = api.draft.getById.useQuery("draft-uuid");

// Returns: Draft with versions and conversation count
```

#### Update Draft
```typescript
const mutation = api.draft.update.useMutation();

await mutation.mutateAsync({
  id: "draft-uuid",
  title: "Updated Title",           // Optional
  targetPlatform: "linkedin",       // Optional
  status: "published"                // Optional
});
```

#### Delete (Archive) Draft
```typescript
const mutation = api.draft.delete.useMutation();

await mutation.mutateAsync("draft-uuid");
// Soft deletes by setting status to 'archived'
```

#### Publish Draft
```typescript
const mutation = api.draft.publish.useMutation();

await mutation.mutateAsync("draft-uuid");
// Changes status to 'published' and marks current version as published
```

### Version Router (`api.version.*`)

#### Create New Version
```typescript
const mutation = api.version.create.useMutation();

await mutation.mutateAsync({
  draftId: "draft-uuid",
  content: "New version content"
});

// Automatically increments version number
```

#### Get Versions by Draft
```typescript
const { data } = api.version.getByDraftId.useQuery("draft-uuid");

// Returns: { versions: Version[], currentVersionId: string, totalVersions: number }
```

#### Get Specific Version
```typescript
const { data } = api.version.getById.useQuery("version-uuid");
```

#### Compare Two Versions
```typescript
const { data } = api.version.compare.useQuery({
  draftId: "draft-uuid",
  versionIds: ["version-uuid-1", "version-uuid-2"]
});

// Returns: { older: Version, newer: Version }
```

#### Restore Previous Version
```typescript
const mutation = api.version.restore.useMutation();

await mutation.mutateAsync({
  draftId: "draft-uuid",
  versionId: "old-version-uuid"
});

// Creates a new version with content from the old version
```

#### Get Version History
```typescript
const { data } = api.version.getHistory.useQuery("draft-uuid");

// Returns simplified history with metadata
```

### Chat Router (`api.chat.*`)

#### Create Conversation
```typescript
const mutation = api.chat.createConversation.useMutation();

await mutation.mutateAsync({
  draftId: "draft-uuid",
  title: "Chat about improvements",    // Optional
  initialMessage: "How can I improve this?"  // Optional
});
```

#### Send Message
```typescript
const mutation = api.chat.sendMessage.useMutation();

await mutation.mutateAsync({
  conversationId: "conversation-uuid",
  content: "User message",
  role: "user"  // 'user' | 'assistant' | 'system'
});
```

#### Get Messages
```typescript
const { data } = api.chat.getMessages.useQuery({
  conversationId: "conversation-uuid",
  limit: 50,                    // Optional, default: 50
  cursor: "message-uuid"        // Optional, for pagination
});

// Returns: { messages: Message[], hasMore: boolean, nextCursor?: string }
```

#### Get Conversations by Draft
```typescript
const { data } = api.chat.getConversationsByDraft.useQuery("draft-uuid");

// Returns conversations with message counts
```

#### Get Single Conversation
```typescript
const { data } = api.chat.getConversation.useQuery("conversation-uuid");

// Returns conversation with draft info and statistics
```

#### Update Conversation Title
```typescript
const mutation = api.chat.updateConversation.useMutation();

await mutation.mutateAsync({
  conversationId: "conversation-uuid",
  title: "New Title"
});
```

#### Delete Conversation
```typescript
const mutation = api.chat.deleteConversation.useMutation();

await mutation.mutateAsync("conversation-uuid");
// Cascades delete to all messages
```

### Autosave Router (`api.autosave.*`)

#### Save Draft Content
```typescript
const mutation = api.autosave.save.useMutation();

await mutation.mutateAsync({
  draftId: "draft-uuid",
  content: "Updated content",
  createNewVersion: false  // Optional, default: false
});

// Returns save status with version info
```

#### Get Autosave Status
```typescript
const { data } = api.autosave.getStatus.useQuery({
  draftId: "draft-uuid",
  currentContent: "Current editor content"
});

// Returns: { hasUnsavedChanges: boolean, lastSaved: Date, ... }
```

#### Create Checkpoint
```typescript
const mutation = api.autosave.createCheckpoint.useMutation();

await mutation.mutateAsync({
  draftId: "draft-uuid",
  content: "Content to checkpoint",
  checkpointName: "Before major changes"  // Optional
});

// Creates a new version marked as checkpoint
```

#### Get Recent Activity
```typescript
const { data } = api.autosave.getRecentActivity.useQuery("draft-uuid");

// Returns recent version activity for last 24 hours
```

## AI Service Integration

The backend uses Vercel AI SDK with OpenAI for intelligent content assistance. The AI features are accessed through the dedicated AI Chat router with streaming support.

### AI Chat Router (`api.aiChat.*`)

#### Stream Chat Response (Real-time streaming)
```typescript
// Subscribe to streaming chat response
const subscription = api.aiChat.streamChat.useSubscription({
  conversationId: "conversation-uuid",
  message: "How can I improve this post?",
  draftId: "draft-uuid"
}, {
  onData: (data) => {
    if (data.token) {
      // Handle streaming token
      console.log(data.token);
    }
    if (data.done) {
      // Stream completed
    }
    if (data.error) {
      // Handle error
      console.error(data.error);
    }
  }
});
```

#### Generate Content Suggestions
```typescript
const mutation = api.aiChat.generateSuggestions.useMutation();

await mutation.mutateAsync({
  draftId: "draft-uuid",
  type: "improvement"  // 'improvement' | 'variation' | 'ideas'
});

// Returns suggestions text and usage stats
```

#### Validate Content
```typescript
const { data } = api.aiChat.validateContent.useQuery({
  draftId: "draft-uuid"
});

// Returns: { isValid: boolean, issues: string[], suggestions: string[], score: number }
```

#### Quick Actions
```typescript
const mutation = api.aiChat.quickAction.useMutation();

await mutation.mutateAsync({
  draftId: "draft-uuid",
  action: "improve_clarity"  
  // Options: 'improve_clarity' | 'make_shorter' | 'make_longer' | 
  //          'add_cta' | 'add_hook' | 'fix_grammar'
});

// Returns improved content
```

#### Generate Hashtags
```typescript
const mutation = api.aiChat.generateHashtags.useMutation();

await mutation.mutateAsync({
  draftId: "draft-uuid",
  count: 10  // Number of hashtags to generate
});

// Returns: { hashtags: string[], reasoning: string }
```

#### Adapt to Different Platform
```typescript
const mutation = api.aiChat.adaptToPlatform.useMutation();

await mutation.mutateAsync({
  draftId: "draft-uuid",
  targetPlatform: "linkedin"  // Target platform
});

// Returns adapted content for the new platform
```

### LLM Service Architecture

The backend uses a centralized LLM service with:

1. **Model Configurations**
   - `fast` - GPT-3.5 for simple tasks
   - `standard` - GPT-4 Turbo for content generation
   - `advanced` - GPT-4 for complex tasks
   - `creative` - High temperature for brainstorming
   - `precise` - Low temperature for editing

2. **Streaming Support**
   - Real-time token streaming for chat
   - Progress tracking for long operations
   - Error recovery and retry logic

3. **Rate Limiting**
   - 20 requests per minute per user
   - Automatic rate limit error handling
   - Graceful degradation

4. **Error Handling**
   - Automatic retries with exponential backoff
   - Detailed error messages
   - Fallback strategies

## Database Schema

### Core Tables

- **drafts** - Main content drafts
- **versions** - Version history for each draft
- **aiConversations** - Chat conversations per draft
- **chatMessages** - Individual messages in conversations

### Relationships

- One draft has many versions
- One draft has many conversations
- One conversation has many messages
- All tables use UUID primary keys

## Error Handling

All endpoints return standard tRPC errors:

- `NOT_FOUND` - Resource not found
- `FORBIDDEN` - User lacks permission
- `BAD_REQUEST` - Invalid input
- `INTERNAL_SERVER_ERROR` - Server error
- `TOO_MANY_REQUESTS` - Rate limit exceeded

## Frontend Usage Example

```tsx
// components/DraftEditor.tsx
import { api } from "@/trpc/react";
import { useState, useEffect } from "react";

export function DraftEditor({ draftId }: { draftId: string }) {
  const [content, setContent] = useState("");
  
  // Fetch draft data
  const { data: draft } = api.draft.getById.useQuery(draftId);
  
  // Setup autosave mutation
  const autosave = api.autosave.save.useMutation();
  
  // Debounced autosave
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content && draft) {
        autosave.mutate({
          draftId,
          content,
          createNewVersion: false
        });
      }
    }, 2000); // 2 second debounce
    
    return () => clearTimeout(timer);
  }, [content]);
  
  return (
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
      placeholder="Start writing..."
    />
  );
}
```

## Environment Variables

Required environment variables:

```env
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...  # Optional, for AI features
```

## Testing

All endpoints have been tested and are ready for integration. Use the tRPC panel in development mode to explore the API interactively.

## Support

For questions or issues with the API, please refer to the codebase or contact the backend team.