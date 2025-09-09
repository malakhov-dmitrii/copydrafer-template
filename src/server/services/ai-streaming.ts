import { streamText } from "ai";
import type { CoreMessage } from "ai";
import { MODEL_CONFIGS, llmService } from "./llm-service";

/**
 * AI Streaming Service for real-time chat interactions
 * Handles streaming responses for the chat interface
 */

export interface StreamingOptions {
	onStart?: () => void;
	onToken?: (token: string) => void;
	onCompletion?: (completion: string) => void;
	onError?: (error: Error) => void;
}

/**
 * Create a streaming chat response
 */
export async function createStreamingChatResponse(params: {
	messages: CoreMessage[];
	userId: string;
	draftContext?: string;
	platform?: string;
	options?: StreamingOptions;
}) {
	const { messages, userId, draftContext, platform, options } = params;

	try {
		// Build system prompt with context
		const system = buildSystemPrompt(draftContext, platform);

		// Get streaming response from LLM service
		const result = await llmService.streamText({
			messages,
			system,
			modelType: "standard",
			userId,
			onChunk: options?.onToken,
		});

		// Handle streaming
		options?.onStart?.();

		let fullText = "";
		for await (const chunk of result.textStream) {
			fullText += chunk;
			options?.onToken?.(chunk);
		}

		options?.onCompletion?.(fullText);

		return {
			text: fullText,
			usage: await result.usage,
		};
	} catch (error) {
		const err = error instanceof Error ? error : new Error("Streaming failed");
		options?.onError?.(err);
		throw err;
	}
}

/**
 * Build system prompt with context
 */
function buildSystemPrompt(draftContext?: string, platform?: string): string {
	let prompt = `You are an AI assistant helping with social media content creation.`;

	if (platform) {
		prompt += ` You specialize in ${platform} content and understand its best practices, character limits, and audience expectations.`;
	}

	if (draftContext) {
		prompt += ` 
    
Current draft context:
${draftContext}

Help the user improve, refine, or get suggestions for their content while maintaining their voice and message.`;
	}

	prompt += ` 

Guidelines:
- Be concise and actionable
- Provide specific suggestions
- Maintain the user's authentic voice
- Consider platform-specific requirements
- Focus on engagement and clarity`;

	return prompt;
}

/**
 * Stream content suggestions
 */
export async function streamContentSuggestions(params: {
	content: string;
	platform: string;
	type: "improvement" | "variation" | "ideas";
	userId: string;
	options?: StreamingOptions;
}) {
	const { content, platform, type, userId, options } = params;

	const messages: CoreMessage[] = [];

	switch (type) {
		case "improvement":
			messages.push({
				role: "user",
				content: `Suggest improvements for this ${platform} post:\n\n${content}`,
			});
			break;
		case "variation":
			messages.push({
				role: "user",
				content: `Create 3 variations of this ${platform} post:\n\n${content}`,
			});
			break;
		case "ideas":
			messages.push({
				role: "user",
				content: `Generate content ideas related to this ${platform} post:\n\n${content}`,
			});
			break;
	}

	return createStreamingChatResponse({
		messages,
		userId,
		platform,
		options,
	});
}

/**
 * Stream real-time content validation
 */
export async function streamContentValidation(params: {
	content: string;
	platform: string;
	userId: string;
	options?: StreamingOptions;
}) {
	const { content, platform, userId, options } = params;

	const messages: CoreMessage[] = [
		{
			role: "user",
			content: `Validate this ${platform} post and provide feedback:

${content}

Check for:
1. Character limits
2. Hashtag usage
3. Engagement potential
4. Platform best practices
5. Clarity and impact`,
		},
	];

	return createStreamingChatResponse({
		messages,
		userId,
		platform,
		options,
	});
}

/**
 * Stream AI coaching for content creation
 */
export async function streamContentCoaching(params: {
	topic: string;
	platform: string;
	goal: string;
	userId: string;
	options?: StreamingOptions;
}) {
	const { topic, platform, goal, userId, options } = params;

	const messages: CoreMessage[] = [
		{
			role: "user",
			content: `Help me create a ${platform} post about "${topic}" with the goal of ${goal}.

Guide me through:
1. Key message to convey
2. Best hook to grab attention
3. Structure and flow
4. Call-to-action
5. Hashtag strategy`,
		},
	];

	return createStreamingChatResponse({
		messages,
		userId,
		platform,
		options,
	});
}

/**
 * Stream trend analysis and suggestions
 */
export async function streamTrendAnalysis(params: {
	trend: string;
	platform: string;
	brandContext: string;
	userId: string;
	options?: StreamingOptions;
}) {
	const { trend, platform, brandContext, userId, options } = params;

	const messages: CoreMessage[] = [
		{
			role: "user",
			content: `Analyze how to leverage the trend "${trend}" on ${platform} for: ${brandContext}

Provide:
1. Trend relevance and longevity
2. Content angle suggestions
3. Risk assessment
4. Example posts
5. Best timing for posting`,
		},
	];

	return createStreamingChatResponse({
		messages,
		userId,
		platform,
		options,
	});
}

/**
 * Handle streaming for chat conversations
 */
export async function handleChatStream(params: {
	conversationHistory: CoreMessage[];
	newMessage: string;
	draftContext: string;
	platform: string;
	userId: string;
	options?: StreamingOptions;
}) {
	const {
		conversationHistory,
		newMessage,
		draftContext,
		platform,
		userId,
		options,
	} = params;

	// Add the new user message to history
	const messages: CoreMessage[] = [
		...conversationHistory,
		{ role: "user", content: newMessage },
	];

	return createStreamingChatResponse({
		messages,
		userId,
		draftContext,
		platform,
		options,
	});
}
