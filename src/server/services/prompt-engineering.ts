import type { CoreMessage } from 'ai';
import { z } from 'zod';

/**
 * Advanced Prompt Engineering Service
 * Provides smart context injection and optimized prompts for different use cases
 */

// Platform-specific configurations
const PLATFORM_CONFIGS = {
  twitter: {
    maxLength: 280,
    features: ['hashtags', 'mentions', 'threads', 'engagement'],
    tone: 'concise, witty, conversational',
    bestPractices: [
      'Use 1-2 hashtags max',
      'Front-load key message',
      'Include clear CTA',
      'Optimize for mobile reading',
    ],
  },
  linkedin: {
    maxLength: 3000,
    features: ['professional tone', 'industry insights', 'thought leadership'],
    tone: 'professional, informative, value-driven',
    bestPractices: [
      'Start with a hook',
      'Use line breaks for readability',
      'Include 3-5 relevant hashtags',
      'End with a question or CTA',
    ],
  },
  facebook: {
    maxLength: 63206,
    features: ['storytelling', 'community engagement', 'visuals'],
    tone: 'friendly, personal, engaging',
    bestPractices: [
      'Tell a story',
      'Use emojis sparingly',
      'Ask questions',
      'Include visual descriptions',
    ],
  },
  instagram: {
    maxLength: 2200,
    features: ['visual storytelling', 'hashtags', 'reels', 'stories'],
    tone: 'visual, inspiring, authentic',
    bestPractices: [
      'Start with attention-grabbing first line',
      'Use up to 30 hashtags',
      'Include emojis for visual breaks',
      'Add clear CTA',
    ],
  },
  threads: {
    maxLength: 500,
    features: ['conversations', 'quick thoughts', 'replies'],
    tone: 'casual, conversational, authentic',
    bestPractices: [
      'Keep it conversational',
      'Encourage replies',
      'Use threading effectively',
      'Be authentic',
    ],
  },
} as const;

// Content analysis schema
const ContentAnalysisSchema = z.object({
  topic: z.string(),
  tone: z.enum(['professional', 'casual', 'humorous', 'inspiring', 'educational']),
  keywords: z.array(z.string()),
  targetAudience: z.string(),
  goalType: z.enum(['engagement', 'conversion', 'awareness', 'education']),
  emotionalTone: z.enum(['positive', 'neutral', 'urgent', 'empathetic']),
});

export type ContentAnalysis = z.infer<typeof ContentAnalysisSchema>;

/**
 * Analyze content to extract key characteristics
 */
export function analyzeContent(content: string): Partial<ContentAnalysis> {
  const analysis: Partial<ContentAnalysis> = {};
  
  // Detect tone
  const formalWords = /\b(therefore|furthermore|consequently|accordingly|pursuant)\b/gi;
  const casualWords = /\b(hey|gonna|wanna|yeah|lol|btw)\b/gi;
  const humorIndicators = /\b(joke|funny|hilarious|lmao|😂|🤣)\b/gi;
  
  if (formalWords.test(content)) {
    analysis.tone = 'professional';
  } else if (casualWords.test(content)) {
    analysis.tone = 'casual';
  } else if (humorIndicators.test(content)) {
    analysis.tone = 'humorous';
  }
  
  // Extract keywords (simple approach - can be enhanced)
  const words = content.toLowerCase().split(/\s+/);
  const wordFreq = new Map<string, number>();
  
  words.forEach(word => {
    const cleaned = word.replace(/[^a-z0-9]/g, '');
    if (cleaned.length > 4) {
      wordFreq.set(cleaned, (wordFreq.get(cleaned) || 0) + 1);
    }
  });
  
  analysis.keywords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
  
  // Detect emotional tone
  if (/\b(urgent|now|limited|hurry|fast)\b/gi.test(content)) {
    analysis.emotionalTone = 'urgent';
  } else if (/\b(understand|feel|empathy|support|together)\b/gi.test(content)) {
    analysis.emotionalTone = 'empathetic';
  } else if (/\b(amazing|excellent|fantastic|great|wonderful)\b/gi.test(content)) {
    analysis.emotionalTone = 'positive';
  } else {
    analysis.emotionalTone = 'neutral';
  }
  
  return analysis;
}

/**
 * Build an optimized system prompt based on context
 */
export function buildOptimizedSystemPrompt(params: {
  platform: string;
  draftContext?: string;
  conversationHistory?: CoreMessage[];
  userPreferences?: {
    tone?: string;
    style?: string;
    goals?: string[];
  };
}): string {
  const { platform, draftContext, conversationHistory, userPreferences } = params;
  const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
  
  let prompt = `You are an expert ${platform} content strategist and copywriter with deep understanding of platform-specific best practices, audience psychology, and engagement optimization.

## Platform Context
Platform: ${platform}
Character Limit: ${config?.maxLength || 'No limit'}
Tone: ${config?.tone || 'Adaptable'}
Key Features: ${config?.features?.join(', ') || 'Standard social media features'}

## Best Practices for ${platform}
${config?.bestPractices?.map(bp => `- ${bp}`).join('\n') || '- Follow general social media best practices'}
`;

  // Add user preferences if provided
  if (userPreferences) {
    prompt += `\n## User Preferences\n`;
    if (userPreferences.tone) {
      prompt += `Preferred Tone: ${userPreferences.tone}\n`;
    }
    if (userPreferences.style) {
      prompt += `Writing Style: ${userPreferences.style}\n`;
    }
    if (userPreferences.goals?.length) {
      prompt += `Content Goals: ${userPreferences.goals.join(', ')}\n`;
    }
  }

  // Add draft context with analysis
  if (draftContext) {
    const analysis = analyzeContent(draftContext);
    prompt += `\n## Current Draft Analysis
Content: ${draftContext.substring(0, 500)}${draftContext.length > 500 ? '...' : ''}
Detected Tone: ${analysis.tone || 'neutral'}
Key Topics: ${analysis.keywords?.join(', ') || 'general content'}
Emotional Tone: ${analysis.emotionalTone || 'neutral'}

When providing suggestions:
1. Maintain the user's authentic voice while enhancing clarity
2. Optimize for ${platform}-specific engagement patterns
3. Ensure content aligns with detected tone: ${analysis.tone || 'neutral'}
4. Enhance emotional resonance while staying authentic
`;
  }

  // Add conversation memory if available
  if (conversationHistory && conversationHistory.length > 0) {
    const recentContext = conversationHistory.slice(-3); // Last 3 exchanges
    prompt += `\n## Recent Conversation Context
The user has been working on improving their content with the following focus areas:
`;
    recentContext.forEach((msg, idx) => {
      if (msg.role === 'user' && idx > 0) {
        prompt += `- Previous request: "${msg.content.substring(0, 100)}..."\n`;
      }
    });
  }

  prompt += `\n## Response Guidelines
1. Be specific and actionable in your suggestions
2. Provide examples when recommending changes
3. Explain the "why" behind each suggestion
4. Consider the platform's algorithm and engagement patterns
5. Maintain authenticity while optimizing for performance
6. Use data-driven insights when applicable
7. Suggest A/B testing opportunities when relevant

## Output Format
Structure your responses with:
- Clear headers for different sections
- Bullet points for easy scanning
- Specific examples in quotes
- Metrics or benchmarks when relevant
- Action items clearly marked`;

  return prompt;
}

/**
 * Generate context-aware prompts for specific tasks
 */
export class SmartPromptBuilder {
  /**
   * Build prompt for content improvement
   */
  static forContentImprovement(params: {
    content: string;
    platform: string;
    improvements: string[];
    analysis?: Partial<ContentAnalysis>;
  }): string {
    const { content, platform, improvements, analysis } = params;
    const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
    
    return `As a ${platform} content optimization expert, improve this post focusing on: ${improvements.join(', ')}

Original Content:
"${content}"

Platform Requirements:
- Max length: ${config?.maxLength || 'No limit'} characters
- Current length: ${content.length} characters
- Optimal tone: ${config?.tone || 'Platform appropriate'}

${analysis ? `Content Analysis:
- Detected tone: ${analysis.tone || 'neutral'}
- Key topics: ${analysis.keywords?.join(', ') || 'general'}
- Emotional tone: ${analysis.emotionalTone || 'neutral'}` : ''}

Improvement Focus:
${improvements.map(imp => `- ${imp}: Specific changes to enhance this aspect`).join('\n')}

Provide:
1. Improved version (maintain core message)
2. Explanation of key changes
3. Expected impact on engagement
4. Alternative approaches if applicable`;
  }

  /**
   * Build prompt for hashtag generation
   */
  static forHashtagGeneration(params: {
    content: string;
    platform: string;
    count: number;
    trending?: string[];
  }): string {
    const { content, platform, count, trending } = params;
    
    return `Generate ${count} optimized hashtags for this ${platform} post:

Content: "${content}"

Requirements:
- Mix of broad reach (popular) and niche (specific) hashtags
- Platform-appropriate formatting
- Relevant to content and target audience
- Balance between competitive and discoverable

${trending?.length ? `Current Trending Hashtags to Consider:
${trending.join(', ')}` : ''}

Provide hashtags in categories:
1. High-reach (1-3): Popular, competitive
2. Medium-reach (3-5): Balanced discoverability
3. Niche (remaining): Specific to content/audience

Include reasoning for each category selection.`;
  }

  /**
   * Build prompt for content validation
   */
  static forContentValidation(params: {
    content: string;
    platform: string;
    criteria?: string[];
  }): string {
    const { content, platform, criteria = [] } = params;
    const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
    
    return `Perform a comprehensive validation of this ${platform} content:

Content: "${content}"

Platform Specifications:
- Character limit: ${config?.maxLength || 'No limit'}
- Best practices: ${config?.bestPractices?.join('; ') || 'Standard'}

Validation Criteria:
${criteria.length > 0 ? criteria.map(c => `- ${c}`).join('\n') : `- Character count compliance
- Hashtag optimization
- Engagement potential
- Platform best practices
- Accessibility considerations
- Brand safety
- Call-to-action effectiveness`}

Provide structured feedback:
1. Compliance Score (0-100)
2. Critical Issues (must fix)
3. Recommendations (should improve)
4. Opportunities (could enhance)
5. Predicted engagement level (Low/Medium/High)
6. A/B testing suggestions`;
  }

  /**
   * Build prompt for trend adaptation
   */
  static forTrendAdaptation(params: {
    trend: string;
    brandContext: string;
    platform: string;
    riskTolerance: 'low' | 'medium' | 'high';
  }): string {
    const { trend, brandContext, platform, riskTolerance } = params;
    
    return `Create authentic ${platform} content connecting "${brandContext}" with trending topic "${trend}":

Risk Tolerance: ${riskTolerance}
- Low: Very safe, subtle connection
- Medium: Clear connection, balanced approach
- High: Bold, creative interpretation

Analyze:
1. Trend relevance to brand (score 1-10)
2. Authenticity assessment
3. Potential risks and mitigation
4. Expected engagement multiplier

Provide:
1. Primary content approach (based on risk tolerance)
2. 2 alternative angles
3. Hashtag strategy
4. Optimal posting time
5. Expected audience response
6. Metrics to track success`;
  }

  /**
   * Build prompt for multi-platform adaptation
   */
  static forCrossPlatformAdaptation(params: {
    content: string;
    sourcePlatform: string;
    targetPlatforms: string[];
  }): string {
    const { content, sourcePlatform, targetPlatforms } = params;
    
    return `Adapt this ${sourcePlatform} content for multiple platforms:

Original (${sourcePlatform}):
"${content}"

Target Platforms: ${targetPlatforms.join(', ')}

For each platform, provide:
1. Adapted content (respecting character limits)
2. Platform-specific optimizations
3. Hashtag adjustments
4. Tone modifications
5. CTA adaptations
6. Visual/media recommendations
7. Posting time suggestions

Maintain core message while optimizing for each platform's:
- Audience expectations
- Algorithm preferences
- Engagement patterns
- Format requirements`;
  }
}

/**
 * Generate dynamic conversation context
 */
export function buildConversationContext(
  messages: CoreMessage[],
  maxTokens: number = 1000
): string {
  if (messages.length === 0) return '';
  
  let context = 'Previous conversation highlights:\n';
  let tokenCount = 0;
  
  // Process messages in reverse to prioritize recent context
  const reversedMessages = [...messages].reverse();
  const includedMessages: string[] = [];
  
  for (const msg of reversedMessages) {
    const msgPreview = `${msg.role}: ${msg.content.substring(0, 200)}...\n`;
    const msgTokens = Math.ceil(msgPreview.length / 4); // Rough token estimate
    
    if (tokenCount + msgTokens <= maxTokens) {
      includedMessages.unshift(msgPreview);
      tokenCount += msgTokens;
    } else {
      break;
    }
  }
  
  return context + includedMessages.join('\n');
}

/**
 * Optimize prompts for token efficiency
 */
export function optimizePromptForTokens(
  prompt: string,
  maxTokens: number = 2000
): string {
  // Rough token estimation (1 token ≈ 4 characters)
  const estimatedTokens = Math.ceil(prompt.length / 4);
  
  if (estimatedTokens <= maxTokens) {
    return prompt;
  }
  
  // Prioritize sections for truncation
  const sections = prompt.split('\n## ');
  const prioritizedSections = sections.map((section, index) => ({
    content: section,
    priority: index === 0 ? 1 : 2, // Keep main instruction
    tokens: Math.ceil(section.length / 4),
  }));
  
  // Sort by priority and rebuild
  let optimizedPrompt = '';
  let currentTokens = 0;
  
  for (const section of prioritizedSections.sort((a, b) => a.priority - b.priority)) {
    if (currentTokens + section.tokens <= maxTokens) {
      optimizedPrompt += (optimizedPrompt ? '\n## ' : '') + section.content;
      currentTokens += section.tokens;
    }
  }
  
  return optimizedPrompt;
}

/**
 * Create feedback loops for continuous improvement
 */
export interface PromptFeedback {
  promptId: string;
  userSatisfaction: number; // 1-5
  outputQuality: number; // 1-5
  relevance: number; // 1-5
  improvements?: string[];
}

export class PromptOptimizer {
  private feedbackHistory: Map<string, PromptFeedback[]> = new Map();
  
  /**
   * Record feedback for a prompt
   */
  recordFeedback(feedback: PromptFeedback): void {
    const history = this.feedbackHistory.get(feedback.promptId) || [];
    history.push(feedback);
    this.feedbackHistory.set(feedback.promptId, history);
  }
  
  /**
   * Get optimization suggestions based on feedback
   */
  getOptimizationSuggestions(promptId: string): string[] {
    const feedback = this.feedbackHistory.get(promptId);
    if (!feedback || feedback.length < 3) {
      return [];
    }
    
    const avgSatisfaction = feedback.reduce((acc, f) => acc + f.userSatisfaction, 0) / feedback.length;
    const avgQuality = feedback.reduce((acc, f) => acc + f.outputQuality, 0) / feedback.length;
    const avgRelevance = feedback.reduce((acc, f) => acc + f.relevance, 0) / feedback.length;
    
    const suggestions: string[] = [];
    
    if (avgSatisfaction < 3) {
      suggestions.push('Improve response tone and helpfulness');
    }
    if (avgQuality < 3) {
      suggestions.push('Enhance output quality with more specific examples');
    }
    if (avgRelevance < 3) {
      suggestions.push('Better align responses with user intent');
    }
    
    // Aggregate improvement suggestions from feedback
    const allImprovements = feedback.flatMap(f => f.improvements || []);
    const improvementCounts = new Map<string, number>();
    
    allImprovements.forEach(imp => {
      improvementCounts.set(imp, (improvementCounts.get(imp) || 0) + 1);
    });
    
    // Add frequently mentioned improvements
    Array.from(improvementCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .forEach(([improvement]) => suggestions.push(improvement));
    
    return suggestions;
  }
}