# Spec Requirements Document

> Spec: Dual-Pane Editor Foundation
> Created: 2025-09-08
> Status: Planning

## Overview

Implement the core dual-pane interface foundation for CopyDrafter, featuring a side-by-side text editor and AI chat interface with basic draft management and version history. This establishes the fundamental user experience for seamless content creation and AI interaction.

## User Stories

### Content Creator Workflow

As a content creator, I want to write and edit content in the left pane while chatting with AI in the right pane, so that I can iterate on my content without losing context or switching between tools.

The user opens CopyDrafter, sees a clean dual-pane interface. They start typing a draft idea in the left editor, then describe their content goals in the AI chat on the right. The AI generates suggestions that appear in the chat, and the user can incorporate ideas back into their editor. Each AI generation creates a new version that they can access through version history.

### Version Management

As a content creator, I want to see all iterations of my content and easily switch between versions, so that I can compare different approaches and build on the best elements from each version.

When the AI generates new content based on the user's prompt, it appears as a new version in the editor. The user can see a version selector showing "Version 1, Version 2," etc. Clicking between versions shows different content iterations, and the user can edit any version to create new branches.

### Draft Persistence

As a content creator, I want my drafts and chat history to be saved automatically, so that I can continue working on content across multiple sessions without losing progress.

All content in the editor and chat messages are automatically saved to the database. When the user returns to the application, they can access their previous drafts, see their chat history, and continue exactly where they left off.

## Spec Scope

1. **Dual-Pane Layout** - Responsive left editor and right AI chat with resizable split
2. **Rich Text Editor** - Basic formatting toolbar with copy/paste support
3. **AI Chat Interface** - Message input, conversation history, and AI response display
4. **Draft Management** - Create, save, load, and delete drafts with metadata
5. **Version System** - Automatic version creation and manual version selection
6. **Real-time Persistence** - Auto-save functionality for editor content and chat
7. **AI Provider Integration** - OpenAI GPT-4 connection with error handling

## Out of Scope

- File upload and attachment management
- Style analysis and profile generation
- Fragment-based text editing
- Multiple AI provider support
- Advanced formatting and preview modes
- Template system and content export

## Expected Deliverable

1. Users can create new drafts and see dual-pane interface with functional editor and chat
2. AI chat responds to prompts and generates content suggestions using OpenAI integration
3. Generated content creates new versions accessible through version selector
4. All drafts, versions, and chat history persist between browser sessions and page reloads