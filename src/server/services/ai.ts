import { env } from "@/env";
import { TRPCError } from "@trpc/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Initialize OpenAI client
const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY || "",
});

// Types for AI service
export interface AIServiceConfig {
	model?: string;
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
}

export interface StreamingResponse {
	content: string;
	finishReason: string | null;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

// Default configuration
const DEFAULT_CONFIG: AIServiceConfig = {
	model: "gpt-4-turbo-preview",
	temperature: 0.7,
	maxTokens: 2000,
	topP: 1,
	frequencyPenalty: 0,
	presencePenalty: 0,
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per user
const userRequestCounts = new Map<
	string,
	{ count: number; resetTime: number }
>();

// Error handling wrapper
async function handleAIError(error: unknown): Promise<never> {
	if (error instanceof OpenAI.APIError) {
		if (error.status === 429) {
			throw new TRPCError({
				code: "TOO_MANY_REQUESTS",
				message: "Rate limit exceeded. Please try again later.",
			});
		}
		if (error.status === 401) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Invalid API key. Please check your OpenAI configuration.",
			});
		}
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `OpenAI API error: ${error.message}`,
		});
	}

	throw new TRPCError({
		code: "INTERNAL_SERVER_ERROR",
		message: "An unexpected error occurred while processing your request.",
	});
}

// Rate limiting check
export function checkRateLimit(userId: string): void {
	const now = Date.now();
	const userLimit = userRequestCounts.get(userId);

	if (!userLimit || now > userLimit.resetTime) {
		// Reset the counter
		userRequestCounts.set(userId, {
			count: 1,
			resetTime: now + RATE_LIMIT_WINDOW,
		});
		return;
	}

	if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
		const waitTime = Math.ceil((userLimit.resetTime - now) / 1000);
		throw new TRPCError({
			code: "TOO_MANY_REQUESTS",
			message: `Rate limit exceeded. Please wait ${waitTime} seconds before trying again.`,
		});
	}

	// Increment the counter
	userLimit.count++;
	userRequestCounts.set(userId, userLimit);
}

// Main AI service class
export class AIService {
	private config: AIServiceConfig;

	constructor(config: Partial<AIServiceConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	// Generate a completion without streaming
	async generateCompletion(
		messages: ChatCompletionMessageParam[],
		userId: string,
		customConfig?: Partial<AIServiceConfig>,
	): Promise<{ content: string; usage?: any }> {
		try {
			// Check rate limit
			checkRateLimit(userId);

			const config = { ...this.config, ...customConfig };

			const completion = await openai.chat.completions.create({
				model: config.model!,
				messages,
				temperature: config.temperature,
				max_tokens: config.maxTokens,
				top_p: config.topP,
				frequency_penalty: config.frequencyPenalty,
				presence_penalty: config.presencePenalty,
			});

			const content = completion.choices[0]?.message?.content || "";

			return {
				content,
				usage: completion.usage,
			};
		} catch (error) {
			return handleAIError(error);
		}
	}

	// Generate a streaming completion
	async *generateStreamingCompletion(
		messages: ChatCompletionMessageParam[],
		userId: string,
		customConfig?: Partial<AIServiceConfig>,
	): AsyncGenerator<StreamingResponse> {
		try {
			// Check rate limit
			checkRateLimit(userId);

			const config = { ...this.config, ...customConfig };

			const stream = await openai.chat.completions.create({
				model: config.model!,
				messages,
				temperature: config.temperature,
				max_tokens: config.maxTokens,
				top_p: config.topP,
				frequency_penalty: config.frequencyPenalty,
				presence_penalty: config.presencePenalty,
				stream: true,
			});

			let fullContent = "";
			let finishReason: string | null = null;

			for await (const chunk of stream) {
				const delta = chunk.choices[0]?.delta;
				if (delta?.content) {
					fullContent += delta.content;
					yield {
						content: delta.content,
						finishReason: null,
					};
				}

				if (chunk.choices[0]?.finish_reason) {
					finishReason = chunk.choices[0].finish_reason;
				}
			}

			// Yield final message with finish reason
			yield {
				content: "",
				finishReason,
				usage: {
					promptTokens: 0, // These would need to be calculated
					completionTokens: 0,
					totalTokens: 0,
				},
			};
		} catch (error) {
			return handleAIError(error);
		}
	}

	// Generate suggestions for social media content
	async generateContentSuggestions(
		platform: string,
		topic: string,
		tone: string,
		userId: string,
	): Promise<string[]> {
		const systemPrompt = `You are a social media content expert specializing in ${platform}. 
    Generate creative, engaging content suggestions based on the given topic and tone.`;

		const userPrompt = `Topic: ${topic}
    Tone: ${tone}
    Platform: ${platform}
    
    Please provide 3 different content suggestions that would work well on ${platform}.`;

		try {
			const response = await this.generateCompletion(
				[
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userPrompt },
				],
				userId,
				{ temperature: 0.8 }, // Higher temperature for more creative suggestions
			);

			// Parse the response to extract suggestions
			const suggestions = response.content
				.split("\n")
				.filter((line) => line.trim().length > 0)
				.slice(0, 3);

			return suggestions;
		} catch (error) {
			return handleAIError(error);
		}
	}

	// Improve existing content
	async improveContent(
		content: string,
		platform: string,
		improvements: string[],
		userId: string,
	): Promise<string> {
		const systemPrompt = `You are a social media content expert. Improve the given content for ${platform} based on the requested improvements.`;

		const userPrompt = `Original content: ${content}
    
    Platform: ${platform}
    Requested improvements: ${improvements.join(", ")}
    
    Please provide an improved version of this content.`;

		try {
			const response = await this.generateCompletion(
				[
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userPrompt },
				],
				userId,
				{ temperature: 0.6 }, // Moderate temperature for balanced improvements
			);

			return response.content;
		} catch (error) {
			return handleAIError(error);
		}
	}

	// Check content for platform-specific requirements
	async validateContent(
		content: string,
		platform: string,
		userId: string,
	): Promise<{ isValid: boolean; issues: string[]; suggestions: string[] }> {
		const platformLimits: Record<
			string,
			{ charLimit: number; hashtagLimit?: number }
		> = {
			twitter: { charLimit: 280, hashtagLimit: 30 },
			linkedin: { charLimit: 3000 },
			facebook: { charLimit: 63206 },
			instagram: { charLimit: 2200, hashtagLimit: 30 },
			threads: { charLimit: 500 },
		};

		const limit = platformLimits[platform] || { charLimit: 5000 };
		const issues: string[] = [];
		const suggestions: string[] = [];

		// Check character limit
		if (content.length > limit.charLimit) {
			issues.push(
				`Content exceeds ${platform} character limit (${content.length}/${limit.charLimit})`,
			);
			suggestions.push(
				`Shorten content by ${content.length - limit.charLimit} characters`,
			);
		}

		// Check hashtag count for platforms that have limits
		if (limit.hashtagLimit) {
			const hashtagCount = (content.match(/#\w+/g) || []).length;
			if (hashtagCount > limit.hashtagLimit) {
				issues.push(
					`Too many hashtags (${hashtagCount}/${limit.hashtagLimit})`,
				);
				suggestions.push(
					`Remove ${hashtagCount - limit.hashtagLimit} hashtags`,
				);
			}
		}

		// Use AI for more sophisticated validation
		if (issues.length === 0) {
			const systemPrompt = `You are a social media expert. Analyze the following ${platform} post for any issues or improvements.`;

			try {
				const response = await this.generateCompletion(
					[
						{ role: "system", content: systemPrompt },
						{
							role: "user",
							content: `Analyze this ${platform} post and provide any issues or suggestions:\n\n${content}`,
						},
					],
					userId,
					{ temperature: 0.3, maxTokens: 500 },
				);

				// Parse AI response for issues and suggestions
				const lines = response.content
					.split("\n")
					.filter((line) => line.trim());
				lines.forEach((line) => {
					if (
						line.toLowerCase().includes("issue") ||
						line.toLowerCase().includes("problem")
					) {
						issues.push(line);
					} else if (
						line.toLowerCase().includes("suggest") ||
						line.toLowerCase().includes("improve")
					) {
						suggestions.push(line);
					}
				});
			} catch (error) {
				// If AI validation fails, just use basic validation
				console.error("AI validation failed:", error);
			}
		}

		return {
			isValid: issues.length === 0,
			issues,
			suggestions,
		};
	}
}

// Export a default instance
export const aiService = new AIService();

// Export convenience functions
export async function generateAIResponse(
	messages: ChatCompletionMessageParam[],
	userId: string,
	config?: Partial<AIServiceConfig>,
): Promise<{ content: string; usage?: any }> {
	return aiService.generateCompletion(messages, userId, config);
}

export async function* streamAIResponse(
	messages: ChatCompletionMessageParam[],
	userId: string,
	config?: Partial<AIServiceConfig>,
): AsyncGenerator<StreamingResponse> {
	yield* aiService.generateStreamingCompletion(messages, userId, config);
}
