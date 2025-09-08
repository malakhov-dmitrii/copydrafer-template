"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
	Bot,
	Check,
	Copy,
	Loader2,
	RotateCcw,
	Send,
	Sparkles,
	User,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
	isStreaming?: boolean;
	error?: boolean;
}

interface AIChatProps {
	onSendMessage?: (message: string) => Promise<string>;
	initialMessages?: Message[];
	placeholder?: string;
	className?: string;
	onMessageCopy?: (content: string) => void;
	systemPrompt?: string;
}

export function AIChat({
	onSendMessage,
	initialMessages = [],
	placeholder = "Ask AI to help with your content...",
	className,
	onMessageCopy,
	systemPrompt,
}: AIChatProps) {
	const [messages, setMessages] = useState<Message[]>(initialMessages);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const scrollToBottom = () => {
		if (scrollAreaRef.current) {
			const scrollContainer = scrollAreaRef.current.querySelector(
				"[data-radix-scroll-area-viewport]",
			);
			if (scrollContainer) {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}
		}
	};

	const handleSend = async () => {
		if (!input.trim() || isLoading) return;

		const userMessage: Message = {
			id: `msg-${Date.now()}`,
			role: "user",
			content: input.trim(),
			timestamp: new Date(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setIsLoading(true);

		const assistantMessage: Message = {
			id: `msg-${Date.now() + 1}`,
			role: "assistant",
			content: "",
			timestamp: new Date(),
			isStreaming: true,
		};

		setMessages((prev) => [...prev, assistantMessage]);

		try {
			let response: string;

			if (onSendMessage) {
				response = await onSendMessage(input);
			} else {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				response =
					"I'm a mock AI response. Connect the backend to get real responses!";
			}

			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === assistantMessage.id
						? { ...msg, content: response, isStreaming: false }
						: msg,
				),
			);
		} catch (error) {
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === assistantMessage.id
						? {
								...msg,
								content: "Sorry, I encountered an error. Please try again.",
								isStreaming: false,
								error: true,
							}
						: msg,
				),
			);
		} finally {
			setIsLoading(false);
			textareaRef.current?.focus();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const copyToClipboard = useCallback(
		(content: string, messageId: string) => {
			navigator.clipboard.writeText(content);
			setCopiedId(messageId);
			onMessageCopy?.(content);

			setTimeout(() => {
				setCopiedId(null);
			}, 2000);
		},
		[onMessageCopy],
	);

	const regenerateLastMessage = useCallback(async () => {
		const lastUserMessage = [...messages]
			.reverse()
			.find((msg) => msg.role === "user");
		if (lastUserMessage && !isLoading) {
			setInput(lastUserMessage.content);
			setMessages((prev) => prev.slice(0, -2));
			setTimeout(() => {
				handleSend();
			}, 100);
		}
	}, [messages, isLoading]);

	return (
		<div className={cn("flex h-full flex-col", className)}>
			<div className="border-b p-4">
				<div className="flex items-center gap-2">
					<Sparkles className="h-5 w-5 text-primary" />
					<h2 className="font-semibold">AI Assistant</h2>
				</div>
				{systemPrompt && (
					<p className="mt-1 text-muted-foreground text-sm">{systemPrompt}</p>
				)}
			</div>

			<ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
				<div className="space-y-4">
					{messages.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<Bot className="mb-4 h-12 w-12 text-muted-foreground/50" />
							<p className="text-muted-foreground">
								Start a conversation with AI to get help with your content
							</p>
						</div>
					) : (
						messages.map((message) => (
							<div
								key={message.id}
								className={cn(
									"flex gap-3",
									message.role === "user" ? "justify-end" : "justify-start",
								)}
							>
								{message.role === "assistant" && (
									<Avatar className="h-8 w-8">
										<AvatarFallback>
											<Bot className="h-4 w-4" />
										</AvatarFallback>
									</Avatar>
								)}

								<div
									className={cn(
										"group relative max-w-[80%] rounded-lg px-3 py-2",
										message.role === "user"
											? "bg-primary text-primary-foreground"
											: "bg-muted",
										message.error && "bg-destructive/10 text-destructive",
									)}
								>
									<div className="whitespace-pre-wrap break-words">
										{message.isStreaming ? (
											<div className="flex items-center gap-2">
												<Loader2 className="h-3 w-3 animate-spin" />
												<span className="text-sm">Thinking...</span>
											</div>
										) : (
											message.content
										)}
									</div>

									<div className="mt-1 flex items-center gap-2 text-xs opacity-70">
										<time>{format(message.timestamp, "HH:mm")}</time>
									</div>

									{message.role === "assistant" && !message.isStreaming && (
										<div className="-bottom-6 absolute left-0 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
											<Button
												size="sm"
												variant="ghost"
												className="h-6 px-2"
												onClick={() =>
													copyToClipboard(message.content, message.id)
												}
											>
												{copiedId === message.id ? (
													<Check className="h-3 w-3" />
												) : (
													<Copy className="h-3 w-3" />
												)}
											</Button>
										</div>
									)}
								</div>

								{message.role === "user" && (
									<Avatar className="h-8 w-8">
										<AvatarFallback>
											<User className="h-4 w-4" />
										</AvatarFallback>
									</Avatar>
								)}
							</div>
						))
					)}
				</div>
			</ScrollArea>

			<div className="border-t p-4">
				<div className="flex gap-2">
					<Textarea
						ref={textareaRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={placeholder}
						className="min-h-[60px] resize-none"
						disabled={isLoading}
					/>
					<div className="flex flex-col gap-2">
						<Button
							onClick={handleSend}
							disabled={!input.trim() || isLoading}
							size="icon"
						>
							{isLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Send className="h-4 w-4" />
							)}
						</Button>
						{messages.length > 0 && (
							<Button
								onClick={regenerateLastMessage}
								disabled={isLoading}
								size="icon"
								variant="outline"
								title="Regenerate last response"
							>
								<RotateCcw className="h-4 w-4" />
							</Button>
						)}
					</div>
				</div>
				<p className="mt-2 text-muted-foreground text-xs">
					Press Enter to send, Shift+Enter for new line
				</p>
			</div>
		</div>
	);
}
