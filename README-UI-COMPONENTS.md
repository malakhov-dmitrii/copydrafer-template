# CopyDrafter UI Components

## Overview

Core UI components for the CopyDrafter content editor with AI chat integration.

## Components Created

### 1. DualPaneLayout (`src/app/_components/dual-pane-layout.tsx`)
- Responsive resizable dual-pane layout using react-resizable-panels
- Saves pane sizes to localStorage for persistence
- Mobile-responsive (stacked layout on mobile)
- Configurable min/max sizes for panes

### 2. RichTextEditor (`src/app/_components/rich-text-editor.tsx`)
- Full-featured rich text editor using Tiptap
- Formatting toolbar with:
  - Text styles: Bold, Italic, Underline, Strikethrough, Highlight
  - Headings: H1, H2
  - Lists: Bullet, Ordered, Blockquote
  - Code formatting and links
  - Undo/Redo functionality
- Auto-save with debouncing (default 2s)
- Keyboard shortcuts (Cmd/Ctrl+S to save)

### 3. AIChat (`src/app/_components/ai-chat.tsx`)
- Chat interface for AI assistant
- Message history with timestamps
- Typing indicators and loading states
- Copy message to clipboard functionality
- Regenerate last response feature
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

### 4. Content Editor Page (`src/app/(dashboard)/dashboard/content/new/page.tsx`)
- Complete content editor combining all components
- Title input and content type selector
- Save draft and publish functionality
- Integration between editor and AI chat
- Copy AI responses directly to editor

## Usage

Navigate to `/dashboard/content/new` to access the content editor.

## Features

- **Responsive Design**: Works on desktop and mobile devices
- **Persistent Layout**: Remembers your preferred pane sizes
- **Rich Text Editing**: Full formatting capabilities with Tiptap
- **AI Integration**: Chat with AI assistant for content help
- **Auto-save**: Automatically saves your work as you type
- **Keyboard Shortcuts**: Efficient keyboard navigation and commands

## Dependencies Installed

- `@tiptap/react`: Rich text editor framework
- `@tiptap/starter-kit`: Core editor functionality
- `@tiptap/extension-placeholder`: Placeholder text support
- `@tiptap/extension-typography`: Smart typography
- `@tiptap/extension-link`: Link functionality
- `@tiptap/extension-highlight`: Text highlighting
- `@tiptap/extension-underline`: Underline support
- `react-resizable-panels`: Already installed, used for dual-pane layout

## Next Steps

The UI components are ready for backend integration. The backend team can:

1. Connect the AI chat to actual LLM endpoints
2. Implement real save/publish functionality via tRPC
3. Add user content management and storage
4. Integrate with authentication for user-specific content

## Testing

To test the UI:

1. Set up environment variables (copy `.env.example` to `.env`)
2. Run `npm run dev`
3. Navigate to `http://localhost:3000/dashboard/content/new`
4. Try the editor features and AI chat (currently using mock responses)