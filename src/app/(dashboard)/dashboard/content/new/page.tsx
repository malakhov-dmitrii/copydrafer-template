"use client";

import { AIChat } from "@/app/_components/ai-chat";
import { DualPaneLayout } from "@/app/_components/dual-pane-layout";
import { RichTextEditor } from "@/app/_components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	ArrowLeft,
	CheckCircle,
	Download,
	FileText,
	Save,
	Settings,
	Share,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export default function NewContentPage() {
	const router = useRouter();
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [contentType, setContentType] = useState("blog-post");
	const [isSaving, setIsSaving] = useState(false);
	const [lastSaved, setLastSaved] = useState<Date | null>(null);

	const handleSave = useCallback(
		async (content: string) => {
			setIsSaving(true);

			try {
				await new Promise((resolve) => setTimeout(resolve, 500));

				console.log("Saving:", { title, content, contentType });
				setLastSaved(new Date());
				toast.success("Content saved", {
					description: "Your changes have been saved",
					icon: <CheckCircle className="h-4 w-4" />,
				});
			} catch (error) {
				toast.error("Failed to save", {
					description: "Please try again",
				});
			} finally {
				setIsSaving(false);
			}
		},
		[title, contentType],
	);

	const handlePublish = useCallback(async () => {
		if (!title.trim()) {
			toast.error("Title required", {
				description: "Please add a title before publishing",
			});
			return;
		}

		try {
			await handleSave(content);
			toast.success("Content published!", {
				description: "Your content is now live",
			});
			router.push("/dashboard");
		} catch (error) {
			toast.error("Failed to publish", {
				description: "Please try again",
			});
		}
	}, [title, content, handleSave, router]);

	const handleAIMessage = useCallback(
		async (message: string): Promise<string> => {
			await new Promise((resolve) => setTimeout(resolve, 1500));

			const responses = [
				"I can help you improve your content! Try asking me to make it more engaging, fix grammar, or suggest improvements.",
				"Here's a suggestion: Consider adding more specific examples to make your point clearer.",
				"Your content looks good! You might want to add a compelling call-to-action at the end.",
				"I can help with SEO optimization, tone adjustments, or content structure. What would you like to focus on?",
			];

			return (
				responses[Math.floor(Math.random() * responses.length)] ||
				"I'm here to help with your content!"
			);
		},
		[],
	);

	const handleCopyFromChat = useCallback(
		(text: string) => {
			const currentContent = content || "";
			const newContent = currentContent ? `${currentContent}\n\n${text}` : text;
			setContent(newContent);
			toast.success("Added to editor", {
				description: "Content copied from chat",
			});
		},
		[content],
	);

	const editorPanel = (
		<div className="flex h-full flex-col">
			<div className="border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Button variant="ghost" size="icon" asChild>
							<Link href="/dashboard">
								<ArrowLeft className="h-4 w-4" />
							</Link>
						</Button>

						<div className="flex items-center gap-2">
							<FileText className="h-5 w-5 text-muted-foreground" />
							<Select value={contentType} onValueChange={setContentType}>
								<SelectTrigger className="w-[140px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="blog-post">Blog Post</SelectItem>
									<SelectItem value="email">Email</SelectItem>
									<SelectItem value="social">Social Media</SelectItem>
									<SelectItem value="landing">Landing Page</SelectItem>
									<SelectItem value="newsletter">Newsletter</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{lastSaved && (
							<span className="text-muted-foreground text-sm">
								Saved {lastSaved.toLocaleTimeString()}
							</span>
						)}

						<Button
							variant="outline"
							size="sm"
							onClick={() => handleSave(content)}
							disabled={isSaving}
						>
							<Save className="mr-2 h-4 w-4" />
							{isSaving ? "Saving..." : "Save Draft"}
						</Button>

						<Button size="sm" onClick={handlePublish}>
							<Share className="mr-2 h-4 w-4" />
							Publish
						</Button>

						<Button variant="ghost" size="icon">
							<Download className="h-4 w-4" />
						</Button>

						<Button variant="ghost" size="icon">
							<Settings className="h-4 w-4" />
						</Button>
					</div>
				</div>

				<div className="mt-4">
					<Input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="Enter your title..."
						className="border-0 bg-transparent px-0 font-bold text-2xl placeholder:text-muted-foreground/50 focus-visible:ring-0"
					/>
				</div>
			</div>

			<div className="flex-1 overflow-hidden">
				<RichTextEditor
					content={content}
					onChange={setContent}
					onSave={handleSave}
					placeholder={`Start writing your ${contentType.replace("-", " ")}...`}
					autoSave={true}
					autoSaveDelay={3000}
				/>
			</div>
		</div>
	);

	const chatPanel = (
		<AIChat
			onSendMessage={handleAIMessage}
			onMessageCopy={handleCopyFromChat}
			systemPrompt="I'm here to help you create amazing content. Ask me anything about writing, editing, or improving your text!"
			placeholder="Ask AI for help with your content..."
		/>
	);

	return (
		<div className="h-[calc(100vh-4rem)]">
			<DualPaneLayout
				leftPanel={editorPanel}
				rightPanel={chatPanel}
				defaultSize={[65, 35]}
				minSize={30}
				maxSize={80}
				persistenceKey="content-editor-layout"
			/>
		</div>
	);
}
