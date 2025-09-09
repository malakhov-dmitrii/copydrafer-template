import { env } from "@/env";
import { createOpenAI } from "@ai-sdk/openai";
import { TRPCError } from "@trpc/server";
import { generateObject, generateText, streamText } from "ai";
import type { CoreMessage } from "ai";
import { z } from "zod";
import { aiUsageTracker, enforceQuotas, trackAIUsage } from "./ai-usage-tracker";
import type { UsageCategory } from "./ai-usage-tracker";

/**
 * Centralized LLM Service for CopyDrafter
 * Manages all LLM interactions with consistent configuration and error handling
 */

// Initialize OpenAI provider with Vercel AI SDK
const openai = createOpenAI({
	apiKey: env.OPENAI_API_KEY || "",
});

// Shared model configurations
export const MODEL_CONFIGS = {
	// Fast, cost-effective model for simple tasks
	fast: {
		model: openai("gpt-3.5-turbo"),
		temperature: 0.7,
		maxTokens: 2000,
	},
	// Balanced model for most content generation
	standard: {
		model: openai("gpt-4-turbo-preview"),
		temperature: 0.7,
		maxTokens: 4000,
	},
	// High-quality model for complex tasks
	advanced: {
		model: openai("gpt-4"),
		temperature: 0.8,
		maxTokens: 4000,
	},
	// Creative model for brainstorming
	creative: {
		model: openai("gpt-4-turbo-preview"),
		temperature: 0.9,
		maxTokens: 4000,
	},
	// Precise model for editing and validation
	precise: {
		model: openai("gpt-4-turbo-preview"),
		temperature: 0.3,
		maxTokens: 2000,
	},
} as const;

export type ModelType = keyof typeof MODEL_CONFIGS;

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per user
const userRequestCounts = new Map<
	string,
	{ count: number; resetTime: number }
>();

/**
 * Check rate limit for a user
 */
function checkRateLimit(userId: string): void {
	const now = Date.now();
	const userLimit = userRequestCounts.get(userId);

	if (!userLimit || now > userLimit.resetTime) {
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

	userLimit.count++;
	userRequestCounts.set(userId, userLimit);
}

/**
 * Handle LLM errors consistently
 */
function handleLLMError(error: unknown): never {
	console.error("LLM Service Error:", error);

	if (error instanceof Error) {
		if (error.message.includes("rate limit")) {
			throw new TRPCError({
				code: "TOO_MANY_REQUESTS",
				message: "AI service rate limit exceeded. Please try again later.",
			});
		}
		if (error.message.includes("API key")) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "AI service configuration error. Please contact support.",
			});
		}
	}

	throw new TRPCError({
		code: "INTERNAL_SERVER_ERROR",
		message: "An error occurred while processing your request.",
	});
}

/**
 * Main LLM Service class
 */
export class LLMService {
	/**
	 * Generate text completion
	 */
	async generateText(params: {
		messages: CoreMessage[];
		modelType?: ModelType;
		userId: string;
		system?: string;
		temperature?: number;
		maxTokens?: number;
		category?: UsageCategory;
	}) {
		try {
			checkRateLimit(params.userId);

			const config = MODEL_CONFIGS[params.modelType || "standard"];
			const modelName = params.modelType || "standard";

			// Check quotas before making the call
			await enforceQuotas(params.userId, config.maxTokens);

			const result = await generateText({
				model: config.model,
				messages: params.messages,
				system: params.system,
				temperature: params.temperature ?? config.temperature,
				maxRetries: 2,
			});

			// Track usage
			if (result.usage) {
				await trackAIUsage(
					params.userId,
					modelName === "fast"
						? "gpt-3.5-turbo"
						: modelName === "advanced"
							? "gpt-4"
							: "gpt-4-turbo-preview",
					result.usage,
					params.category || "content_generation",
				);
			}

			return {
				text: result.text,
				usage: result.usage,
				finishReason: result.finishReason,
			};
		} catch (error) {
			return handleLLMError(error);
		}
	}

	/**
	 * Stream text completion
	 */
	async streamText(params: {
		messages: CoreMessage[];
		modelType?: ModelType;
		userId: string;
		system?: string;
		temperature?: number;
		maxTokens?: number;
		onChunk?: (chunk: string) => void;
		category?: UsageCategory;
	}) {
		try {
			checkRateLimit(params.userId);

			const config = MODEL_CONFIGS[params.modelType || "standard"];
			const modelName = params.modelType || "standard";

			// Check quotas before making the call
			await enforceQuotas(params.userId, config.maxTokens);

			const result = await streamText({
				model: config.model,
				messages: params.messages,
				system: params.system,
				temperature: params.temperature ?? config.temperature,
				maxRetries: 2,
			});

			// Track usage after streaming completes
			result.usage
				.then(async (usage) => {
					if (usage) {
						await trackAIUsage(
							params.userId,
							modelName === "fast"
								? "gpt-3.5-turbo"
								: modelName === "advanced"
									? "gpt-4"
									: "gpt-4-turbo-preview",
							usage,
							params.category || "chat",
						);
					}
				})
				.catch(console.error);

			return result;
		} catch (error) {
			return handleLLMError(error);
		}
	}

	/**
	 * Generate structured object output
	 */
	async generateObject<T>(params: {
		messages: CoreMessage[];
		schema: z.ZodSchema<T>;
		modelType?: ModelType;
		userId: string;
		system?: string;
	}) {
		try {
			checkRateLimit(params.userId);

			const config = MODEL_CONFIGS[params.modelType || "precise"];

			const result = await generateObject({
				model: config.model,
				messages: params.messages,
				schema: params.schema,
				system: params.system,
				temperature: 0.3, // Lower temperature for structured output
			});

			return result.object;
		} catch (error) {
			return handleLLMError(error);
		}
	}

	/**
	 * Generate content for social media
	 */
	async generateSocialContent(params: {
		platform: string;
		topic: string;
		tone: string;
		userId: string;
		keywords?: string[];
		targetAudience?: string;
	}) {
		const system = `You are an expert social media copywriter specializing in ${params.platform}. 
    Create engaging, platform-optimized content that drives engagement.
    Platform: ${params.platform}
    Tone: ${params.tone}`;

		const userMessage = `Create a ${params.platform} post about: ${params.topic}
    ${params.keywords ? `Keywords to include: ${params.keywords.join(", ")}` : ""}
    ${params.targetAudience ? `Target audience: ${params.targetAudience}` : ""}`;

		return this.generateText({
			messages: [{ role: "user", content: userMessage }],
			system,
			modelType: "creative",
			userId: params.userId,
		});
	}

	/**
	 * Improve existing content
	 */
	async improveContent(params: {
		content: string;
		platform: string;
		improvements: string[];
		userId: string;
	}) {
		const system = `You are an expert social media content editor. 
    Improve content while maintaining the core message and authenticity.`;

		const userMessage = `Improve this ${params.platform} post:
    
    Original: ${params.content}
    
    Requested improvements: ${params.improvements.join(", ")}`;

		return this.generateText({
			messages: [{ role: "user", content: userMessage }],
			system,
			modelType: "standard",
			userId: params.userId,
			temperature: 0.6,
		});
	}

	/**
	 * Validate content for platform requirements
	 */
	async validateContent(params: {
		content: string;
		platform: string;
		userId: string;
	}) {
		const schema = z.object({
			isValid: z.boolean(),
			issues: z.array(z.string()),
			suggestions: z.array(z.string()),
			score: z.number().min(0).max(100),
		});

		const system = `You are a social media content validator. 
    Analyze content for platform-specific requirements and best practices.`;

		const userMessage = `Validate this ${params.platform} post:
    
    ${params.content}
    
    Check for character limits, hashtag usage, engagement potential, and platform best practices.`;

		return this.generateObject({
			messages: [{ role: "user", content: userMessage }],
			schema,
			system,
			modelType: "precise",
			userId: params.userId,
		});
	}

	/**
	 * Generate content variations for A/B testing
	 */
	async generateVariations(params: {
		content: string;
		platform: string;
		count: number;
		userId: string;
	}) {
		const schema = z.object({
			variations: z.array(
				z.object({
					content: z.string(),
					hook: z.string(),
					cta: z.string().optional(),
				}),
			),
		});

		const system = `You are a social media optimization expert. 
    Create variations of content for A/B testing while maintaining the core message.`;

		const userMessage = `Create ${params.count} variations of this ${params.platform} post:
    
    ${params.content}
    
    Each variation should have a different hook and approach while keeping the same core message.`;

		return this.generateObject({
			messages: [{ role: "user", content: userMessage }],
			schema,
			system,
			modelType: "creative",
			userId: params.userId,
		});
	}

	/**
	 * Extract hashtags from content or generate new ones
	 */
	async generateHashtags(params: {
		content: string;
		platform: string;
		count: number;
		userId: string;
	}) {
		const schema = z.object({
			hashtags: z.array(z.string()),
			reasoning: z.string(),
		});

		const system = `You are a social media hashtag expert. 
    Generate relevant, trending hashtags that maximize reach and engagement.`;

		const userMessage = `Generate ${params.count} hashtags for this ${params.platform} post:
    
    ${params.content}
    
    Include a mix of popular and niche hashtags for optimal reach.`;

		return this.generateObject({
			messages: [{ role: "user", content: userMessage }],
			schema,
			system,
			modelType: "fast",
			userId: params.userId,
		});
	}

	/**
	 * Adapt content between platforms
	 */
	async adaptContent(params: {
		content: string;
		sourcePlatform: string;
		targetPlatform: string;
		userId: string;
	}) {
		const system = `You are an expert at adapting content between social media platforms. 
    Maintain the core message while optimizing for platform-specific requirements and audience expectations.`;

		const userMessage = `Adapt this ${params.sourcePlatform} post for ${params.targetPlatform}:
    
    ${params.content}
    
    Adjust tone, length, hashtags, and format as needed for ${params.targetPlatform}.`;

		return this.generateText({
			messages: [{ role: "user", content: userMessage }],
			system,
			modelType: "standard",
			userId: params.userId,
		});
	}

	/**
	 * Generate content from trending topics
	 */
	async generateTrendingContent(params: {
		trend: string;
		platform: string;
		brand: string;
		userId: string;
	}) {
		const system = `You are a social media trend expert. 
    Create content that authentically connects brands with trending topics without appearing forced.`;

		const userMessage = `Create a ${params.platform} post that connects ${params.brand} with the trending topic: ${params.trend}
    
    Make it authentic, relevant, and engaging while maintaining brand voice.`;

		return this.generateText({
			messages: [{ role: "user", content: userMessage }],
			system,
			modelType: "creative",
			userId: params.userId,
			temperature: 0.8,
		});
	}
}

// Export singleton instance
export const llmService = new LLMService();

// Export helper functions for common use cases
export const generateContent =
	llmService.generateSocialContent.bind(llmService);
export const improveContent = llmService.improveContent.bind(llmService);
export const validateContent = llmService.validateContent.bind(llmService);
export const adaptContent = llmService.adaptContent.bind(llmService);