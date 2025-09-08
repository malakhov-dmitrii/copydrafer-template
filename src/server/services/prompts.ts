/**
 * Prompt engineering utilities for CopyDrafter AI features
 */

// Platform-specific writing guidelines
export const PLATFORM_GUIDELINES = {
	twitter: {
		maxLength: 280,
		style:
			"Concise, punchy, and engaging. Use relevant hashtags sparingly. Consider thread potential for longer content.",
		bestPractices: [
			"Hook readers in the first line",
			"Use line breaks for readability",
			"Include a clear CTA when appropriate",
			"Optimize for retweets and engagement",
		],
	},
	linkedin: {
		maxLength: 3000,
		style:
			"Professional, insightful, and value-driven. Focus on industry insights and professional growth.",
		bestPractices: [
			"Start with a compelling hook",
			"Use storytelling to engage",
			"Include data and insights",
			"End with a thoughtful question",
			"Use relevant professional hashtags",
		],
	},
	facebook: {
		maxLength: 63206,
		style:
			"Conversational, community-focused, and authentic. Encourage discussion and sharing.",
		bestPractices: [
			"Tell stories that resonate",
			"Ask questions to boost engagement",
			"Use emojis appropriately",
			"Include relevant links",
		],
	},
	instagram: {
		maxLength: 2200,
		style:
			"Visual-first, lifestyle-oriented, and hashtag-optimized. Focus on inspiration and aesthetics.",
		bestPractices: [
			"Front-load important information",
			"Use line breaks and emojis for structure",
			"Include 5-10 relevant hashtags",
			"Add a clear CTA",
			"Consider carousel potential",
		],
	},
	threads: {
		maxLength: 500,
		style:
			"Conversational, community-driven, similar to Twitter but more intimate.",
		bestPractices: [
			"Be authentic and conversational",
			"Engage with the community",
			"Share thoughts and opinions",
			"Use threads for longer discussions",
		],
	},
};

// Content improvement prompts
export const IMPROVEMENT_PROMPTS = {
	clarity: "Make the message clearer and easier to understand",
	engagement: "Increase engagement potential with hooks and CTAs",
	tone: "Adjust the tone to better match the platform and audience",
	length: "Optimize the length for the platform",
	hashtags: "Suggest relevant hashtags for better reach",
	emotion: "Add emotional appeal to connect with readers",
	data: "Include relevant statistics or data points",
	storytelling: "Transform into a compelling story format",
	questions: "Add thought-provoking questions",
	cta: "Include a clear call-to-action",
};

// Tone options for content generation
export const TONE_OPTIONS = {
	professional: "Professional and authoritative",
	casual: "Casual and friendly",
	humorous: "Light-hearted and funny",
	inspirational: "Motivational and uplifting",
	educational: "Informative and teaching-focused",
	provocative: "Thought-provoking and challenging",
	empathetic: "Understanding and supportive",
	urgent: "Time-sensitive and action-oriented",
	analytical: "Data-driven and logical",
	creative: "Imaginative and original",
};

// Content types for different purposes
export const CONTENT_TYPES = {
	announcement: "Product launch or news announcement",
	educational: "Teaching or explaining a concept",
	promotional: "Promoting a product or service",
	engagement: "Starting a conversation or discussion",
	storytelling: "Sharing a story or experience",
	thought_leadership: "Sharing industry insights",
	user_generated: "Highlighting community content",
	behind_scenes: "Showing the process or team",
	tips: "Providing actionable advice",
	opinion: "Sharing a perspective or stance",
};

/**
 * Generate a system prompt for content creation
 */
export function generateSystemPrompt(
	platform: string,
	tone: string,
	contentType: string,
): string {
	const guidelines =
		PLATFORM_GUIDELINES[platform as keyof typeof PLATFORM_GUIDELINES];

	return `You are an expert social media copywriter specializing in ${platform} content.
  
Writing Style Guidelines:
- Platform: ${platform}
- Character Limit: ${guidelines?.maxLength || "No specific limit"}
- Style: ${guidelines?.style || "Engaging and platform-appropriate"}
- Tone: ${TONE_OPTIONS[tone as keyof typeof TONE_OPTIONS] || tone}
- Content Type: ${CONTENT_TYPES[contentType as keyof typeof CONTENT_TYPES] || contentType}

Best Practices for ${platform}:
${guidelines?.bestPractices?.map((bp) => `- ${bp}`).join("\n") || "- Follow platform best practices"}

Your goal is to create compelling, platform-optimized content that drives engagement and achieves the user's objectives.`;
}

/**
 * Generate a user prompt for content creation
 */
export function generateUserPrompt(
	topic: string,
	additionalContext?: string,
	keywords?: string[],
	targetAudience?: string,
): string {
	let prompt = `Create social media content about: ${topic}`;

	if (targetAudience) {
		prompt += `\n\nTarget Audience: ${targetAudience}`;
	}

	if (keywords && keywords.length > 0) {
		prompt += `\n\nKeywords to include: ${keywords.join(", ")}`;
	}

	if (additionalContext) {
		prompt += `\n\nAdditional Context: ${additionalContext}`;
	}

	return prompt;
}

/**
 * Generate a prompt for content improvement
 */
export function generateImprovementPrompt(
	content: string,
	improvements: string[],
	platform: string,
): string {
	const improvementDescriptions = improvements.map(
		(imp) =>
			IMPROVEMENT_PROMPTS[imp as keyof typeof IMPROVEMENT_PROMPTS] || imp,
	);

	return `Improve the following ${platform} post:

Original Content:
${content}

Requested Improvements:
${improvementDescriptions.map((imp) => `- ${imp}`).join("\n")}

Maintain the core message while implementing these improvements. Ensure the content remains authentic and platform-appropriate.`;
}

/**
 * Generate a prompt for content analysis
 */
export function generateAnalysisPrompt(
	content: string,
	platform: string,
): string {
	return `Analyze the following ${platform} post and provide feedback:

Content:
${content}

Please evaluate:
1. Platform optimization (character count, format, hashtags)
2. Engagement potential (hooks, CTAs, questions)
3. Tone and voice consistency
4. Target audience alignment
5. Areas for improvement

Provide specific, actionable feedback for each area.`;
}

/**
 * Generate a prompt for hashtag suggestions
 */
export function generateHashtagPrompt(
	content: string,
	platform: string,
	niche?: string,
): string {
	return `Suggest relevant hashtags for this ${platform} post:

Content:
${content}

${niche ? `Niche/Industry: ${niche}` : ""}

Requirements:
- Provide 10-15 relevant hashtags
- Mix popular and niche-specific tags
- Include 2-3 branded or unique hashtags
- Order by relevance and reach potential
- Follow ${platform} best practices for hashtag usage`;
}

/**
 * Generate a prompt for content adaptation across platforms
 */
export function generateAdaptationPrompt(
	content: string,
	sourcePlatform: string,
	targetPlatform: string,
): string {
	const sourceGuidelines =
		PLATFORM_GUIDELINES[sourcePlatform as keyof typeof PLATFORM_GUIDELINES];
	const targetGuidelines =
		PLATFORM_GUIDELINES[targetPlatform as keyof typeof PLATFORM_GUIDELINES];

	return `Adapt this ${sourcePlatform} post for ${targetPlatform}:

Original Content:
${content}

Source Platform (${sourcePlatform}):
- Style: ${sourceGuidelines?.style}
- Max Length: ${sourceGuidelines?.maxLength}

Target Platform (${targetPlatform}):
- Style: ${targetGuidelines?.style}
- Max Length: ${targetGuidelines?.maxLength}

Requirements:
1. Maintain the core message and value
2. Adjust tone and style for ${targetPlatform}
3. Optimize length (max ${targetGuidelines?.maxLength} characters)
4. Add platform-specific elements (hashtags, mentions, emojis)
5. Ensure maximum engagement on ${targetPlatform}`;
}

/**
 * Generate a prompt for creating content variations
 */
export function generateVariationPrompt(
	content: string,
	platform: string,
	numberOfVariations = 3,
): string {
	return `Create ${numberOfVariations} variations of this ${platform} post:

Original Content:
${content}

Requirements for each variation:
1. Maintain the core message
2. Use different hooks and angles
3. Vary the tone slightly
4. Experiment with different CTAs
5. Keep within ${PLATFORM_GUIDELINES[platform as keyof typeof PLATFORM_GUIDELINES]?.maxLength} characters

Provide ${numberOfVariations} distinct variations that could be A/B tested.`;
}

/**
 * Generate a prompt for trending topic integration
 */
export function generateTrendingPrompt(
	topic: string,
	trend: string,
	platform: string,
): string {
	return `Create ${platform} content that connects this topic with a current trend:

Topic: ${topic}
Trending Topic/Hashtag: ${trend}
Platform: ${platform}

Requirements:
1. Naturally integrate the trend into your content
2. Maintain authenticity and relevance
3. Avoid forced connections
4. Include trending hashtags appropriately
5. Optimize for viral potential while staying on-brand`;
}

/**
 * Helper function to estimate token count (rough approximation)
 */
export function estimateTokenCount(text: string): number {
	// Rough estimation: 1 token ≈ 4 characters
	return Math.ceil(text.length / 4);
}

/**
 * Helper function to validate content length for platform
 */
export function validateContentLength(
	content: string,
	platform: string,
): {
	isValid: boolean;
	currentLength: number;
	maxLength: number;
	difference: number;
} {
	const maxLength =
		PLATFORM_GUIDELINES[platform as keyof typeof PLATFORM_GUIDELINES]
			?.maxLength || Number.POSITIVE_INFINITY;
	const currentLength = content.length;

	return {
		isValid: currentLength <= maxLength,
		currentLength,
		maxLength,
		difference: maxLength - currentLength,
	};
}

/**
 * Helper function to extract hashtags from content
 */
export function extractHashtags(content: string): string[] {
	const hashtagRegex = /#[a-zA-Z0-9_]+/g;
	return content.match(hashtagRegex) || [];
}

/**
 * Helper function to extract mentions from content
 */
export function extractMentions(content: string): string[] {
	const mentionRegex = /@[a-zA-Z0-9_]+/g;
	return content.match(mentionRegex) || [];
}
