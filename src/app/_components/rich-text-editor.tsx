"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	Bold,
	Code,
	Heading1,
	Heading2,
	Highlighter,
	Italic,
	Link as LinkIcon,
	List,
	ListOrdered,
	Quote,
	Redo,
	Strikethrough,
	Underline as UnderlineIcon,
	Undo,
} from "lucide-react";
import { useCallback, useEffect } from "react";

interface RichTextEditorProps {
	content?: string;
	onChange?: (content: string) => void;
	onSave?: (content: string) => void;
	placeholder?: string;
	className?: string;
	editable?: boolean;
	autoSave?: boolean;
	autoSaveDelay?: number;
}

export function RichTextEditor({
	content = "",
	onChange,
	onSave,
	placeholder = "Start writing your content...",
	className,
	editable = true,
	autoSave = true,
	autoSaveDelay = 2000,
}: RichTextEditorProps) {
	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3],
				},
			}),
			Placeholder.configure({
				placeholder,
			}),
			Typography,
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: "text-primary underline",
				},
			}),
			Highlight.configure({
				multicolor: false,
			}),
			Underline,
		],
		content,
		editable,
		onUpdate: ({ editor }) => {
			const html = editor.getHTML();
			onChange?.(html);

			if (autoSave && onSave) {
				handleAutoSave(html);
			}
		},
	});

	const handleAutoSave = useCallback(
		(() => {
			let timeout: NodeJS.Timeout;
			return (content: string) => {
				clearTimeout(timeout);
				timeout = setTimeout(() => {
					onSave?.(content);
				}, autoSaveDelay);
			};
		})(),
		[onSave, autoSaveDelay],
	);

	useEffect(() => {
		if (editor && content !== editor.getHTML()) {
			editor.commands.setContent(content);
		}
	}, [content, editor]);

	useEffect(() => {
		const handleKeydown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				e.preventDefault();
				if (onSave && editor) {
					onSave(editor.getHTML());
				}
			}
		};

		document.addEventListener("keydown", handleKeydown);
		return () => document.removeEventListener("keydown", handleKeydown);
	}, [editor, onSave]);

	const addLink = useCallback(() => {
		const url = window.prompt("Enter URL:");
		if (url && editor) {
			editor.chain().focus().setLink({ href: url }).run();
		}
	}, [editor]);

	if (!editor) {
		return null;
	}

	return (
		<div className={cn("flex h-full flex-col", className)}>
			{editable && (
				<div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
					<div className="flex flex-wrap items-center gap-1 p-2">
						<ToggleGroup type="multiple" size="sm">
							<ToggleGroupItem
								value="bold"
								aria-label="Bold"
								data-state={editor.isActive("bold") ? "on" : "off"}
								onClick={() => editor.chain().focus().toggleBold().run()}
							>
								<Bold className="h-4 w-4" />
							</ToggleGroupItem>
							<ToggleGroupItem
								value="italic"
								aria-label="Italic"
								data-state={editor.isActive("italic") ? "on" : "off"}
								onClick={() => editor.chain().focus().toggleItalic().run()}
							>
								<Italic className="h-4 w-4" />
							</ToggleGroupItem>
							<ToggleGroupItem
								value="underline"
								aria-label="Underline"
								data-state={editor.isActive("underline") ? "on" : "off"}
								onClick={() => editor.chain().focus().toggleUnderline().run()}
							>
								<UnderlineIcon className="h-4 w-4" />
							</ToggleGroupItem>
							<ToggleGroupItem
								value="strike"
								aria-label="Strikethrough"
								data-state={editor.isActive("strike") ? "on" : "off"}
								onClick={() => editor.chain().focus().toggleStrike().run()}
							>
								<Strikethrough className="h-4 w-4" />
							</ToggleGroupItem>
							<ToggleGroupItem
								value="highlight"
								aria-label="Highlight"
								data-state={editor.isActive("highlight") ? "on" : "off"}
								onClick={() => editor.chain().focus().toggleHighlight().run()}
							>
								<Highlighter className="h-4 w-4" />
							</ToggleGroupItem>
						</ToggleGroup>

						<Separator orientation="vertical" className="mx-1 h-6" />

						<ToggleGroup type="single" size="sm">
							<ToggleGroupItem
								value="h1"
								aria-label="Heading 1"
								data-state={
									editor.isActive("heading", { level: 1 }) ? "on" : "off"
								}
								onClick={() =>
									editor.chain().focus().toggleHeading({ level: 1 }).run()
								}
							>
								<Heading1 className="h-4 w-4" />
							</ToggleGroupItem>
							<ToggleGroupItem
								value="h2"
								aria-label="Heading 2"
								data-state={
									editor.isActive("heading", { level: 2 }) ? "on" : "off"
								}
								onClick={() =>
									editor.chain().focus().toggleHeading({ level: 2 }).run()
								}
							>
								<Heading2 className="h-4 w-4" />
							</ToggleGroupItem>
						</ToggleGroup>

						<Separator orientation="vertical" className="mx-1 h-6" />

						<ToggleGroup type="multiple" size="sm">
							<ToggleGroupItem
								value="bullet"
								aria-label="Bullet List"
								data-state={editor.isActive("bulletList") ? "on" : "off"}
								onClick={() => editor.chain().focus().toggleBulletList().run()}
							>
								<List className="h-4 w-4" />
							</ToggleGroupItem>
							<ToggleGroupItem
								value="ordered"
								aria-label="Ordered List"
								data-state={editor.isActive("orderedList") ? "on" : "off"}
								onClick={() => editor.chain().focus().toggleOrderedList().run()}
							>
								<ListOrdered className="h-4 w-4" />
							</ToggleGroupItem>
							<ToggleGroupItem
								value="quote"
								aria-label="Quote"
								data-state={editor.isActive("blockquote") ? "on" : "off"}
								onClick={() => editor.chain().focus().toggleBlockquote().run()}
							>
								<Quote className="h-4 w-4" />
							</ToggleGroupItem>
						</ToggleGroup>

						<Separator orientation="vertical" className="mx-1 h-6" />

						<ToggleGroup type="multiple" size="sm">
							<ToggleGroupItem
								value="code"
								aria-label="Code"
								data-state={editor.isActive("code") ? "on" : "off"}
								onClick={() => editor.chain().focus().toggleCode().run()}
							>
								<Code className="h-4 w-4" />
							</ToggleGroupItem>
							<ToggleGroupItem
								value="link"
								aria-label="Link"
								data-state={editor.isActive("link") ? "on" : "off"}
								onClick={addLink}
							>
								<LinkIcon className="h-4 w-4" />
							</ToggleGroupItem>
						</ToggleGroup>

						<div className="ml-auto flex items-center gap-1">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => editor.chain().focus().undo().run()}
								disabled={!editor.can().undo()}
							>
								<Undo className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => editor.chain().focus().redo().run()}
								disabled={!editor.can().redo()}
							>
								<Redo className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			)}

			<div className="flex-1 overflow-y-auto">
				<EditorContent
					editor={editor}
					className="prose prose-sm dark:prose-invert max-w-none p-4 focus:outline-none [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
				/>
			</div>
		</div>
	);
}
