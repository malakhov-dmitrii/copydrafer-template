# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/spec.md

## Endpoints

### Draft Management Router (`/api/trpc/draft`)

#### `GET /create`
**Purpose:** Create new empty draft for authenticated user
**Parameters:** None (uses session user ID)
**Response:** `{ id: string, title: string, createdAt: Date }`
**Errors:** 401 Unauthorized, 500 Database Error

#### `GET /list`
**Purpose:** Get all drafts for authenticated user with pagination
**Parameters:** `{ limit?: number, offset?: number }`
**Response:** `{ drafts: Draft[], total: number }`
**Errors:** 401 Unauthorized

#### `GET /get`
**Purpose:** Get specific draft with current version and metadata
**Parameters:** `{ id: string }`
**Response:** `{ draft: Draft, currentVersion: Version, versionCount: number }`
**Errors:** 401 Unauthorized, 404 Not Found, 403 Forbidden

#### `POST /update`
**Purpose:** Update draft metadata (title, description)
**Parameters:** `{ id: string, title?: string, description?: string }`
**Response:** `{ success: boolean, draft: Draft }`
**Errors:** 401 Unauthorized, 404 Not Found, 403 Forbidden

#### `DELETE /delete`
**Purpose:** Delete draft and all associated data
**Parameters:** `{ id: string }`
**Response:** `{ success: boolean }`
**Errors:** 401 Unauthorized, 404 Not Found, 403 Forbidden

### Version Management Router (`/api/trpc/version`)

#### `POST /create`
**Purpose:** Create new version for draft with content
**Parameters:** `{ draftId: string, content: string, parentVersionId?: string, source: "user" | "ai_generation" | "ai_edit" }`
**Response:** `{ version: Version, versionNumber: number }`
**Errors:** 401 Unauthorized, 404 Draft Not Found, 403 Forbidden

#### `GET /list`
**Purpose:** Get all versions for specific draft
**Parameters:** `{ draftId: string }`
**Response:** `{ versions: Version[] }`
**Errors:** 401 Unauthorized, 404 Not Found, 403 Forbidden

#### `GET /get`
**Purpose:** Get specific version content
**Parameters:** `{ id: string }`
**Response:** `{ version: Version }`
**Errors:** 401 Unauthorized, 404 Not Found, 403 Forbidden

#### `POST /setCurrent`
**Purpose:** Set specific version as current for draft
**Parameters:** `{ draftId: string, versionId: string }`
**Response:** `{ success: boolean, draft: Draft }`
**Errors:** 401 Unauthorized, 404 Not Found, 403 Forbidden

### Chat Router (`/api/trpc/chat`)

#### `POST /sendMessage`
**Purpose:** Send user message and get AI response
**Parameters:** `{ draftId: string, message: string, context?: { currentContent: string } }`
**Response:** `{ userMessage: ChatMessage, aiResponse: ChatMessage, conversation: AiConversation }`
**Errors:** 401 Unauthorized, 404 Draft Not Found, 403 Forbidden, 429 Rate Limited, 502 AI Service Error

#### `GET /getHistory`
**Purpose:** Get chat history for specific draft
**Parameters:** `{ draftId: string, limit?: number, before?: string }`
**Response:** `{ messages: ChatMessage[], hasMore: boolean }`
**Errors:** 401 Unauthorized, 404 Not Found, 403 Forbidden

#### `POST /generateContent`
**Purpose:** Generate content based on chat context and create new version
**Parameters:** `{ draftId: string, prompt: string, baseVersionId?: string }`
**Response:** `{ version: Version, chatMessage: ChatMessage }`
**Errors:** 401 Unauthorized, 404 Not Found, 403 Forbidden, 429 Rate Limited, 502 AI Service Error

### Auto-save Router (`/api/trpc/autosave`)

#### `POST /saveContent`
**Purpose:** Auto-save current editor content (debounced)
**Parameters:** `{ draftId: string, content: string, versionId?: string }`
**Response:** `{ success: boolean, savedAt: Date }`
**Errors:** 401 Unauthorized, 404 Not Found, 403 Forbidden

## Controllers

### DraftController
- **createDraft**: Initialize draft with first empty version
- **getUserDrafts**: Query user's drafts with pagination and sorting
- **getDraftWithVersion**: Load draft with current version and metadata
- **updateDraftMetadata**: Update title/description with validation
- **deleteDraft**: Soft delete with cascade cleanup

### VersionController  
- **createVersion**: Create version with automatic numbering and parent linking
- **getVersionHistory**: Load chronological version list for draft
- **getVersionContent**: Retrieve specific version data
- **setCurrentVersion**: Update draft's current version pointer
- **compareVersions**: Generate diff between two versions

### ChatController
- **sendMessage**: Process user message, call AI API, store both messages
- **getChatHistory**: Paginated chat history with infinite scroll support
- **generateContent**: AI content generation with version creation
- **handleAIResponse**: Process streaming AI responses with error handling

### AutosaveController
- **debouncedsave**: Debounced content persistence (500ms delay)
- **validateContent**: Basic content validation before save
- **handleConflicts**: Resolve concurrent editing conflicts