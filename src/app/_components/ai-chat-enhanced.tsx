"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import {
	AlertCircle,
	Bot,
	Check,
	Copy,
	Hash,
	Lightbulb,
	Loader2,
	RefreshCw,
	RotateCcw,
	Send,
	Sparkles,
	ThumbsDown,
	ThumbsUp,
	TrendingUp,
	User,
	Wand2,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Message {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: Date;
	isStreaming?: boolean;
	error?: boolean;
	metadata?: {
		model?: string;
		tokens?: number;
		processingTime?: number;
		quality?: number;
		suggestions?: string[];
	};
	feedback?: {
		rating?: "good" | "bad";
		reason?: string;
	};
}

interface QuickAction {
	id: string;
	label: string;
	icon: React.ReactNode;
	action: string;
	description: string;
}

interface AIChatEnhancedProps {
	conversationId: string;
	draftId: string;
	draftContent?: string;
	platform?: string;
	initialMessages?: Message[];
	className?: string;
	onMessageCopy?: (content: string) => void;
	onVersionCreate?: (content: string) => void;
}

const quickActions: QuickAction[] = [
	{
		id: "improve",
		label: "Improve",
		icon: <Wand2 className="h-4 w-4" />,
		action: "improve_clarity",
		description: "Enhance clarity and impact",
	},
	{
		id: "shorter",
		label: "Shorten",
		icon: <TrendingUp className="h-4 w-4" />,
		action: "make_shorter",
		description: "Make more concise",
	},
	{
		id: "hook",
		label: "Add Hook",
		icon: <Zap className="h-4 w-4" />,
		action: "add_hook",
		description: "Grab attention",
	},
	{
		id: "hashtags",
		label: "Hashtags",
		icon: <Hash className="h-4 w-4" />,
		action: "generate_hashtags",
		description: "Generate relevant hashtags",
	},
	{
		id: "ideas",
		label: "Ideas",
		icon: <Lightbulb className="h-4 w-4" />,
		action: "generate_ideas",
		description: "Get content ideas",
	},
];

export function AIChatEnhanced({
	conversationId,
	draftId,
	draftContent = "",
	platform = "general",
	initialMessages = [],
	className,
	onMessageCopy,
	onVersionCreate,
}: AIChatEnhancedProps) {
	const [messages, setMessages] = useState<Message[]>(initialMessages);
	const [input, setInput] = useState("");
	const [isStreaming, setIsStreaming] = useState(false);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [streamingMessage, setStreamingMessage] = useState<string>("");
	const [streamingMetadata, setStreamingMetadata] = useState<any>(null);
	const [connectionQuality, setConnectionQuality] = useState<"good" | "fair" | "poor">("good");
	const [retryCount, setRetryCount] = useState(0);
	
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const abortControllerRef = useRef<AbortController | null>(null);

	// tRPC mutations and subscriptions
	const quickActionMutation = api.aiChat.quickAction.useMutation();
	const generateHashtagsMutation = api.aiChat.generateHashtags.useMutation();
	const validateContentQuery = api.aiChat.validateContent.useQuery(
		{ draftId },
		{ enabled: false }
	);

	useEffect(() => {
		scrollToBottom();
	}, [messages, streamingMessage]);

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

	// Stream chat subscription
	api.aiChat.streamChat.useSubscription(
		{ conversationId, message: input, draftId },
		{
			enabled: false,
			onData: (data) => {
				if (data.token) {
					setStreamingMessage(prev => prev + data.token);
				}
				
				if (data.done) {
					if (data.error) {
						handleStreamError(data.error);
					} else {
						finalizeStreamingMessage(data.metadata);
					}
				}
			},
			onError: (error) => {
				handleStreamError(error.message);
			},
		}
	);

	const handleStreamError = (error: string) => {
		setIsStreaming(false);
		setStreamingMessage("");
		
		// Update last message with error
		setMessages(prev => {
			const updated = [...prev];
			if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
				updated[updated.length - 1] = {
					...updated[updated.length - 1],
					content: "I encountered an error. Please try again.",
					error: true,
					isStreaming: false,
				};
			}
			return updated;
		});
		
		// Handle retry logic
		if (retryCount < 3) {
			setRetryCount(prev => prev + 1);
			setConnectionQuality("poor");
			toast.error(`Connection issue. Retry ${retryCount + 1}/3`);
			
			// Auto-retry after delay
			setTimeout(() => {
				handleSend();
			}, 1000 * (retryCount + 1));
		} else {
			toast.error("Failed after 3 retries. Please check your connection.");
			setRetryCount(0);
		}
	};

	const finalizeStreamingMessage = (metadata?: any) => {
		if (streamingMessage) {
			setMessages(prev => {
				const updated = [...prev];
				if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
					updated[updated.length - 1] = {
						...updated[updated.length - 1],
						content: streamingMessage,
						isStreaming: false,
						metadata,
					};
				}
				return updated;
			});
		}
		
		setStreamingMessage("");
		setIsStreaming(false);
		setRetryCount(0);
		setConnectionQuality("good");
		textareaRef.current?.focus();
	};

	const handleSend = async () => {
		if (!input.trim() || isStreaming) return;

		const userMessage: Message = {
			id: `msg-${Date.now()}`,
			role: "user",
			content: input.trim(),
			timestamp: new Date(),
		};

		setMessages(prev => [...prev, userMessage]);
		setInput("");
		setIsStreaming(true);

		const assistantMessage: Message = {
			id: `msg-${Date.now() + 1}`,
			role: "assistant",
			content: "",
			timestamp: new Date(),
			isStreaming: true,
		};

		setMessages(prev => [...prev, assistantMessage]);
		setStreamingMessage("");

		// Start streaming - the subscription will handle the response
		// In a real implementation, you'd trigger the subscription here
	};

	const handleQuickAction = async (action: QuickAction) => {
		if (isStreaming) return;

		try {
			setIsStreaming(true);
			
			const userMessage: Message = {
				id: `msg-${Date.now()}`,
				role: "user",
				content: `[Quick Action: ${action.label}]`,
				timestamp: new Date(),
			};
			
			setMessages(prev => [...prev, userMessage]);

			if (action.action === "generate_hashtags") {
				const result = await generateHashtagsMutation.mutateAsync({
					draftId,
					count: 10,
				});

				const assistantMessage: Message = {
					id: `msg-${Date.now() + 1}`,
					role: "assistant",
					content: `Here are relevant hashtags for your content:\n\n${result.hashtags.join(" ")}\n\n${result.reasoning}`,
					timestamp: new Date(),
					metadata: {
						model: "gpt-3.5-turbo",
					},
				};
				
				setMessages(prev => [...prev, assistantMessage]);
			} else {
				const result = await quickActionMutation.mutateAsync({
					draftId,
					action: action.action as any,
				});

				const assistantMessage: Message = {
					id: `msg-${Date.now() + 1}`,
					role: "assistant",
					content: result.improvedContent,
					timestamp: new Date(),
					metadata: {
						model: "gpt-4-turbo-preview",
						tokens: result.usage?.totalTokens,
					},
				};
				
				setMessages(prev => [...prev, assistantMessage]);
				
				// Optionally create a new version
				if (onVersionCreate) {
					onVersionCreate(result.improvedContent);
					toast.success("New version created!");
				}
			}
		} catch (error) {
			toast.error("Quick action failed. Please try again.");
		} finally {
			setIsStreaming(false);
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
			toast.success("Copied to clipboard!");

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
		if (lastUserMessage && !isStreaming) {
			setInput(lastUserMessage.content);
			setMessages(prev => prev.slice(0, -2));
			setTimeout(() => {
				handleSend();
			}, 100);
		}
	}, [messages, isStreaming]);

	const handleMessageFeedback = (messageId: string, rating: "good" | "bad") => {
		setMessages(prev =>
			prev.map(msg =>
				msg.id === messageId
					? { ...msg, feedback: { ...msg.feedback, rating } }
					: msg
			)
		);
		toast.success(`Feedback recorded: ${rating}`);
	};

	const cancelStream = () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
		setIsStreaming(false);
		setStreamingMessage("");
		toast.info("Response cancelled");
	};

	return (
		<div className={cn("flex h-full flex-col", className)}>
			{/* Header */}
			<div className="border-b p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Sparkles className="h-5 w-5 text-primary" />
						<h2 className="font-semibold">AI Assistant</h2>
						<Badge variant="outline" className="ml-2">
							{platform}
						</Badge>
					</div>
					<div className="flex items-center gap-2">
						{/* Connection indicator */}
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger>
									<div className={cn(
										"h-2 w-2 rounded-full",
										connectionQuality === "good" && "bg-green-500",
										connectionQuality === "fair" && "bg-yellow-500",
										connectionQuality === "poor" && "bg-red-500"
									)} />
								</TooltipTrigger>
								<TooltipContent>
									Connection: {connectionQuality}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						
						{retryCount > 0 && (
							<Badge variant="secondary" className="text-xs">
								Retry {retryCount}/3
							</Badge>
						)}
					</div>
				</div>
				
				{/* Quick actions */}
				<div className="mt-3 flex flex-wrap gap-2">
					{quickActions.map(action => (
						<TooltipProvider key={action.id}>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="sm"
										variant="outline"
										onClick={() => handleQuickAction(action)}
										disabled={isStreaming || !draftContent}
										className="gap-1"
									>
										{action.icon}
										<span className="text-xs">{action.label}</span>
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									{action.description}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					))}
				</div>
			</div>

			{/* Messages */}
			<ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
				<div className="space-y-4">
					{messages.length === 0 ? (
						<Card className="p-8 text-center">
							<Bot className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
							<p className="text-muted-foreground">
								Start a conversation or use quick actions to enhance your content
							</p>
							<div className="mt-4 grid gap-2 text-left text-sm text-muted-foreground">
								<p>• Ask for suggestions to improve your draft</p>
								<p>• Generate hashtags and trending topics</p>
								<p>• Get variations for A/B testing</p>
								<p>• Validate content for platform best practices</p>
							</div>
						</Card>
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
											<div className="space-y-2">
												{streamingMessage || (
													<div className="flex items-center gap-2">
														<Loader2 className="h-3 w-3 animate-spin" />
														<span className="text-sm">Thinking...</span>
													</div>
												)}
												{streamingMessage && (
													<div>{streamingMessage}<span className="animate-pulse">▊</span></div>
												)}
											</div>
										) : (
											message.content
										)}
									</div>

									{/* Metadata */}
									{message.metadata && (
										<div className="mt-2 flex flex-wrap gap-2 text-xs opacity-70">
											{message.metadata.model && (
												<Badge variant="secondary" className="text-xs">
													{message.metadata.model}
												</Badge>
											)}
											{message.metadata.tokens && (
												<span>{message.metadata.tokens} tokens</span>
											)}
											{message.metadata.processingTime && (
												<span>{message.metadata.processingTime}ms</span>
											)}
											{message.metadata.quality && (
												<Progress value={message.metadata.quality * 100} className="h-1 w-20" />
											)}
										</div>
									)}

									<div className="mt-1 flex items-center gap-2 text-xs opacity-70">
										<time>{format(message.timestamp, "HH:mm")}</time>
									</div>

									{/* Actions for assistant messages */}
									{message.role === "assistant" && !message.isStreaming && (
										<div className="-bottom-6 absolute left-0 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
											<Button
												size="sm"
												variant="ghost"
												className="h-6 px-2"
												onClick={() => copyToClipboard(message.content, message.id)}
											>
												{copiedId === message.id ? (
													<Check className="h-3 w-3" />
												) : (
													<Copy className="h-3 w-3" />
												)}
											</Button>
											
											{onVersionCreate && (
												<Button
													size="sm"
													variant="ghost"
													className="h-6 px-2"
													onClick={() => onVersionCreate(message.content)}
													title="Create new version from this"
												>
													<RefreshCw className="h-3 w-3" />
												</Button>
											)}
											
											<Button
												size="sm"
												variant="ghost"
												className="h-6 px-2"
												onClick={() => handleMessageFeedback(message.id, "good")}
											>
												<ThumbsUp className={cn(
													"h-3 w-3",
													message.feedback?.rating === "good" && "fill-current"
												)} />
											</Button>
											
											<Button
												size="sm"
												variant="ghost"
												className="h-6 px-2"
												onClick={() => handleMessageFeedback(message.id, "bad")}
											>
												<ThumbsDown className={cn(
													"h-3 w-3",
													message.feedback?.rating === "bad" && "fill-current"
												)} />
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

			{/* Input area */}
			<div className="border-t p-4">
				{isStreaming && (
					<div className="mb-2 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
						<div className="flex items-center gap-2">
							<Loader2 className="h-4 w-4 animate-spin" />
							<span className="text-sm">AI is responding...</span>
						</div>
						<Button
							size="sm"
							variant="ghost"
							onClick={cancelStream}
						>
							Cancel
						</Button>
					</div>
				)}
				
				<div className="flex gap-2">
					<Textarea
						ref={textareaRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Ask AI anything about your content..."
						className="min-h-[60px] resize-none"
						disabled={isStreaming}
					/>
					<div className="flex flex-col gap-2">
						<Button
							onClick={handleSend}
							disabled={!input.trim() || isStreaming}
							size="icon"
						>
							{isStreaming ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Send className="h-4 w-4" />
							)}
						</Button>
						{messages.length > 0 && (
							<Button
								onClick={regenerateLastMessage}
								disabled={isStreaming}
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
					Press Enter to send, Shift+Enter for new line • {draftContent.length} chars in draft
				</p>
			</div>
		</div>
	);
}