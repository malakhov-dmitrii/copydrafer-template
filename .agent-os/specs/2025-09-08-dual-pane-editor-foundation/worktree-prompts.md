# Worktree Agent Prompts

This file contains detailed prompts for each worktree agent to work on different parts of the CopyDrafter project in parallel.

## Agent 1: Database & Backend Foundation
**Branch:** `feature/database-backend`  
**Tasks:** 1-3 (Database, API, AI Integration)

```
You are working on the database and backend foundation for CopyDrafter, a social media content editor with AI integration.

CONTEXT:
- Read @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/spec-lite.md for project overview
- Read @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/sub-specs/database-schema.md for complete schema
- Read @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/sub-specs/api-spec.md for API requirements
- Read @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/tasks.md for detailed task breakdown

YOUR RESPONSIBILITIES:
1. Task 1: Database Schema and Models Setup
   - Implement all tables: drafts, versions, chatMessages, aiConversations
   - Set up Drizzle relationships and indexes
   - Generate and apply migrations
   
2. Task 2: tRPC API Routers Implementation
   - Create draft router (CRUD operations)
   - Create version router (version management)
   - Create chat router (AI message handling)
   - Create autosave router (debounced saving)
   
3. Task 3: AI Integration and OpenAI Setup
   - Install OpenAI SDK and configure environment
   - Create AI service with streaming responses
   - Implement error handling and rate limiting
   - Add prompt engineering utilities

IMPLEMENTATION NOTES:
- Use existing Better Auth session context for user authentication
- Follow existing project patterns in src/server/db/schema.ts and src/server/api/
- Add all new tables with copydrafer_ prefix to match project conventions
- Write comprehensive tests for all API endpoints before implementation
- Use TDD approach: write tests first, then implement functionality

START WITH:
Task 1.1 - Write tests for the data models, then proceed sequentially through Task 1 subtasks.

The frontend team will work separately on UI components, so focus purely on robust backend functionality that will support the dual-pane editor interface.
```

## Agent 2: Core UI & Layout
**Branch:** `feature/core-ui-layout`  
**Tasks:** 4-6 (Layout, Editor, Chat Interface)

```
You are working on the core UI and layout components for CopyDrafter, a social media content editor with AI chat integration.

CONTEXT:
- Read @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/spec-lite.md for project overview
- Read @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/sub-specs/technical-spec.md for UI requirements
- Read @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/tasks.md for detailed task breakdown
- Review existing UI patterns in src/app/_components/ and src/styles/

YOUR RESPONSIBILITIES:
1. Task 4: Frontend Dependencies and Layout Structure
   - Install @tiptap/react, react-resizable-panels, other UI dependencies
   - Create responsive dual-pane layout component
   - Implement resizable panes with persistence
   
2. Task 5: Rich Text Editor Implementation
   - Set up Tiptap editor with formatting toolbar
   - Implement auto-save with debouncing
   - Add keyboard shortcuts and accessibility
   
3. Task 6: AI Chat Interface
   - Create chat message components with proper styling
   - Implement message input with send functionality
   - Add typing indicators and loading states
   - Handle AI streaming responses in UI

IMPLEMENTATION NOTES:
- Use existing shadcn/ui components and Tailwind classes
- Follow project's design system in src/styles/globals.css
- Use existing tRPC client patterns for API integration (mock the API calls for now)
- Implement proper TypeScript types for all components
- Use React Server Components and Client Components appropriately
- Make layout mobile-responsive with proper breakpoints

START WITH:
Task 4.1 - Install required dependencies, then proceed with layout structure.

The backend team is working on API endpoints separately, so you can mock the tRPC calls during development and integration will happen later.

DESIGN GOALS:
- Clean, professional interface similar to modern writing tools
- Seamless interaction between editor and chat panes
- Responsive design that works on tablet and desktop
- Proper loading states and error handling throughout
```

## Agent 3: Feature UI & State Management  
**Branch:** `feature/ui-features`  
**Tasks:** 7-8 (Version Management, Draft Management)

```
You are working on the feature UI components for CopyDrafter, focusing on version management and draft organization.

CONTEXT:
- Read @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/spec-lite.md for project overview
- Read @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/sub-specs/technical-spec.md for state requirements
- Read @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/tasks.md for detailed task breakdown
- Wait for Agent 2 to complete core layout components before starting

YOUR RESPONSIBILITIES:
1. Task 7: Version Management UI
   - Create version selector dropdown component
   - Implement version switching functionality
   - Build version comparison interface
   - Handle version creation from AI responses
   
2. Task 8: Draft Management and Navigation
   - Create draft list page with CRUD operations
   - Implement draft creation and metadata editing
   - Add navigation between drafts and editor
   - Build search and filtering functionality

IMPLEMENTATION NOTES:
- Build on top of core layout components from Agent 2
- Use Zustand for complex state management between components
- Mock tRPC API calls with proper TypeScript types
- Follow existing routing patterns in src/app/
- Implement optimistic updates for smooth UX
- Use existing form patterns with proper validation

DEPENDENCIES:
- Wait for Agent 2 to complete Task 4-5 (layout and editor components)
- Coordinate with Agent 2 for any shared component interfaces
- Use mock data that matches the database schema from Agent 1

START WITH:
Task 7.1 - Write tests for version management components after Agent 2 completes core UI.

DESIGN GOALS:
- Intuitive version switching without disrupting writing flow
- Clear visual indication of different content versions
- Efficient draft organization for content creators
- Smooth navigation between different drafts and projects
```

## Agent 4: Integration & Testing
**Branch:** `feature/integration-testing`  
**Tasks:** 9-10 (State Management, End-to-End Testing)

```
You are responsible for integration, state management, and comprehensive testing for CopyDrafter.

CONTEXT:
- Read @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/spec-lite.md for complete feature overview
- Read all sub-specs in @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/sub-specs/
- Review @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/tasks.md for all task details
- Wait for Agents 1-3 to complete their primary tasks before starting integration

YOUR RESPONSIBILITIES:
1. Task 9: State Management and Data Flow
   - Integrate all components with proper state management
   - Implement real tRPC connections replacing mocks
   - Handle optimistic updates and conflict resolution
   - Add comprehensive error boundaries
   
2. Task 10: Integration Testing and Polish
   - Write end-to-end tests for complete user workflows
   - Performance testing and optimization
   - UI/UX polish and responsive design fixes
   - Add proper loading states and error handling

INTEGRATION FOCUS:
- Connect frontend components (Agent 2 & 3) with backend APIs (Agent 1)
- Resolve any interface mismatches between teams
- Ensure proper data flow from editor → AI chat → version management
- Handle real-time auto-save and concurrent editing scenarios

TESTING STRATEGY:
- Test complete user journey: create draft → write content → chat with AI → manage versions
- Verify proper error handling for AI API failures and network issues
- Load testing with large documents and many versions
- Cross-browser and responsive design testing

DEPENDENCIES:
- Agent 1 must complete API implementation (Tasks 1-3)
- Agent 2 must complete core UI components (Tasks 4-6)  
- Agent 3 must complete feature UI (Tasks 7-8)

START WITH:
Task 9.1 - Set up comprehensive state management after all core components are built.

SUCCESS CRITERIA:
- All user stories from spec.md work end-to-end
- No console errors or typescript issues
- Smooth performance with large documents
- Proper error handling and recovery throughout
- Mobile and desktop responsive design complete
```

## Agent 5: AI Enhancement & Optimization
**Branch:** `feature/ai-optimization`  
**Tasks:** AI refinement and performance optimization

```
You are working on AI integration refinement and performance optimization for CopyDrafter.

CONTEXT:
- Read @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/spec-lite.md for AI requirements
- Read @.agent-os/specs/2025-09-08-dual-pane-editor-foundation/sub-specs/technical-spec.md for AI integration details
- Wait for Agent 1 to complete basic AI integration before starting enhancements

YOUR RESPONSIBILITIES:
- Optimize AI prompt engineering for content generation
- Implement streaming response handling in UI
- Add retry logic and fallback mechanisms for AI failures
- Create context management for maintaining conversation quality
- Add usage tracking and cost optimization
- Implement rate limiting and quota management

ENHANCEMENT AREAS:
- Smart context injection based on current draft content
- Conversation memory management for better AI responses
- Response quality scoring and improvement
- AI provider switching and comparison
- Usage analytics and cost tracking

DEPENDENCIES:
- Wait for Agent 1 to complete Task 3 (basic AI integration)
- Coordinate with Agent 2 for streaming UI updates
- Work with Agent 4 for integration testing

START AFTER:
Agent 1 completes basic OpenAI integration and Agent 2 has chat interface ready.

This is an enhancement role - focus on making the AI integration production-ready and highly performant.
```

## Coordination Instructions

### Git Worktree Setup Commands:
```bash
# Create worktrees for each agent
git worktree add ../copydrafer-database feature/database-backend
git worktree add ../copydrafer-ui feature/core-ui-layout  
git worktree add ../copydrafer-features feature/ui-features
git worktree add ../copydrafer-integration feature/integration-testing
git worktree add ../copydrafer-ai feature/ai-optimization
```

### Agent Startup Order:
1. **Agent 1** (Database/Backend) - Start immediately
2. **Agent 2** (Core UI) - Start immediately (parallel to Agent 1)
3. **Agent 3** (Feature UI) - Start after Agent 2 completes Task 4-5
4. **Agent 4** (Integration) - Start after Agents 1-3 complete their core tasks
5. **Agent 5** (AI Enhancement) - Start after Agent 1 completes Task 3

### Merge Strategy:
- Agent 1 merges first (database schema and API foundation)
- Agent 2 merges next (core UI components)
- Agent 3 merges after Agent 2 (builds on UI foundation)
- Agent 4 handles final integration and testing
- Agent 5 adds optimizations and enhancements

This approach minimizes merge conflicts while enabling maximum parallelization of development work.