import { z } from 'zod';
import type { CoreMessage } from 'ai';

/**
 * AI Response Quality Scoring System
 * Evaluates and scores AI responses for quality, relevance, and effectiveness
 */

// Quality dimensions schema
const QualityDimensionsSchema = z.object({
  relevance: z.number().min(0).max(1),
  clarity: z.number().min(0).max(1),
  completeness: z.number().min(0).max(1),
  actionability: z.number().min(0).max(1),
  creativity: z.number().min(0).max(1),
  tone: z.number().min(0).max(1),
  platformOptimization: z.number().min(0).max(1),
  engagement: z.number().min(0).max(1),
});

export type QualityDimensions = z.infer<typeof QualityDimensionsSchema>;

// Quality report schema
export interface QualityReport {
  overallScore: number;
  dimensions: QualityDimensions;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  confidence: number;
  metadata?: {
    responseLength: number;
    readabilityScore: number;
    sentimentScore: number;
    keywordDensity: number;
  };
}

// Platform-specific quality criteria
const PLATFORM_CRITERIA = {
  twitter: {
    maxLength: 280,
    idealLength: { min: 100, max: 250 },
    requiredElements: ['hook', 'value', 'cta'],
    engagementFactors: ['questions', 'emojis', 'hashtags'],
  },
  linkedin: {
    maxLength: 3000,
    idealLength: { min: 300, max: 1000 },
    requiredElements: ['professional_tone', 'insights', 'value'],
    engagementFactors: ['statistics', 'questions', 'formatting'],
  },
  facebook: {
    maxLength: 63206,
    idealLength: { min: 100, max: 500 },
    requiredElements: ['story', 'emotion', 'cta'],
    engagementFactors: ['personal_touch', 'questions', 'emojis'],
  },
  instagram: {
    maxLength: 2200,
    idealLength: { min: 150, max: 300 },
    requiredElements: ['visual_language', 'hashtags', 'cta'],
    engagementFactors: ['emojis', 'line_breaks', 'hashtags'],
  },
} as const;

export class AIQualityScorer {
  /**
   * Score a response based on multiple quality dimensions
   */
  async scoreResponse(params: {
    response: string;
    context: {
      platform?: string;
      userPrompt?: string;
      conversationHistory?: CoreMessage[];
      targetAudience?: string;
      goals?: string[];
    };
  }): Promise<QualityReport> {
    const { response, context } = params;
    
    // Calculate individual dimension scores
    const dimensions: QualityDimensions = {
      relevance: this.scoreRelevance(response, context),
      clarity: this.scoreClarity(response),
      completeness: this.scoreCompleteness(response, context),
      actionability: this.scoreActionability(response),
      creativity: this.scoreCreativity(response),
      tone: this.scoreTone(response, context),
      platformOptimization: this.scorePlatformOptimization(response, context.platform),
      engagement: this.scoreEngagement(response, context.platform),
    };
    
    // Calculate weighted overall score
    const weights = this.getWeights(context);
    const overallScore = this.calculateWeightedScore(dimensions, weights);
    
    // Generate strengths and weaknesses
    const { strengths, weaknesses } = this.analyzeStrengthsWeaknesses(dimensions);
    
    // Generate improvement suggestions
    const suggestions = this.generateSuggestions(dimensions, context);
    
    // Calculate confidence based on context availability
    const confidence = this.calculateConfidence(context);
    
    // Calculate metadata
    const metadata = this.calculateMetadata(response);
    
    return {
      overallScore,
      dimensions,
      strengths,
      weaknesses,
      suggestions,
      confidence,
      metadata,
    };
  }
  
  /**
   * Score relevance to user prompt and context
   */
  private scoreRelevance(response: string, context: any): number {
    if (!context.userPrompt) return 0.5;
    
    let score = 0.5;
    const promptWords = context.userPrompt.toLowerCase().split(/\s+/);
    const responseWords = response.toLowerCase();
    
    // Check keyword presence
    const keywordMatches = promptWords.filter(word => 
      word.length > 3 && responseWords.includes(word)
    ).length;
    
    score += (keywordMatches / promptWords.length) * 0.3;
    
    // Check if response addresses the request type
    if (context.userPrompt.includes('improve') && response.includes('improved')) {
      score += 0.1;
    }
    if (context.userPrompt.includes('suggest') && response.includes('suggest')) {
      score += 0.1;
    }
    if (context.userPrompt.includes('fix') && response.includes('fix')) {
      score += 0.1;
    }
    
    return Math.min(1, score);
  }
  
  /**
   * Score clarity and readability
   */
  private scoreClarity(response: string): number {
    let score = 1.0;
    
    // Sentence length check
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = response.length / sentences.length;
    
    if (avgSentenceLength > 30) score -= 0.2;
    if (avgSentenceLength > 50) score -= 0.3;
    
    // Complex word usage
    const complexWords = response.match(/\b\w{10,}\b/g) || [];
    if (complexWords.length > response.split(/\s+/).length * 0.2) {
      score -= 0.2;
    }
    
    // Structure indicators (bullets, numbers, headers)
    if (response.includes('•') || response.includes('1.') || response.includes('#')) {
      score += 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Score completeness of response
   */
  private scoreCompleteness(response: string, context: any): number {
    let score = 0.7;
    
    // Check response length
    if (response.length < 50) score -= 0.3;
    if (response.length > 500) score += 0.1;
    
    // Check for examples
    if (response.includes('example') || response.includes('for instance')) {
      score += 0.1;
    }
    
    // Check for reasoning
    if (response.includes('because') || response.includes('therefore')) {
      score += 0.1;
    }
    
    // Check for alternatives
    if (response.includes('alternatively') || response.includes('another option')) {
      score += 0.1;
    }
    
    return Math.min(1, score);
  }
  
  /**
   * Score actionability of suggestions
   */
  private scoreActionability(response: string): number {
    let score = 0.5;
    
    // Action verbs
    const actionVerbs = ['try', 'use', 'add', 'remove', 'change', 'update', 'implement', 'consider'];
    const actionCount = actionVerbs.filter(verb => 
      response.toLowerCase().includes(verb)
    ).length;
    
    score += actionCount * 0.1;
    
    // Specific instructions
    if (response.match(/\d+\./g)) { // Numbered lists
      score += 0.2;
    }
    
    // Clear CTAs
    const ctaPhrases = ['you can', 'you should', 'i recommend', 'consider'];
    const ctaCount = ctaPhrases.filter(phrase => 
      response.toLowerCase().includes(phrase)
    ).length;
    
    score += ctaCount * 0.1;
    
    return Math.min(1, score);
  }
  
  /**
   * Score creativity and originality
   */
  private scoreCreativity(response: string): number {
    let score = 0.6;
    
    // Varied vocabulary
    const words = response.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const vocabularyDiversity = uniqueWords.size / words.length;
    
    score += vocabularyDiversity * 0.2;
    
    // Creative elements
    if (response.includes('imagine') || response.includes('what if')) {
      score += 0.1;
    }
    
    // Metaphors or comparisons
    if (response.includes('like') || response.includes('as if')) {
      score += 0.1;
    }
    
    return Math.min(1, score);
  }
  
  /**
   * Score tone appropriateness
   */
  private scoreTone(response: string, context: any): number {
    let score = 0.8;
    
    const platform = context.platform || 'general';
    
    // Platform-specific tone checking
    if (platform === 'linkedin') {
      // Professional tone
      const casualWords = ['hey', 'gonna', 'wanna', 'lol'];
      const hasCasual = casualWords.some(word => response.toLowerCase().includes(word));
      if (hasCasual) score -= 0.3;
    }
    
    if (platform === 'twitter') {
      // Conversational tone
      const formalWords = ['therefore', 'furthermore', 'consequently'];
      const hasFormal = formalWords.some(word => response.toLowerCase().includes(word));
      if (hasFormal) score -= 0.2;
    }
    
    // Consistency check
    const sentenceTones = response.split(/[.!?]/).map(s => {
      if (s.includes('!')) return 'excited';
      if (s.includes('?')) return 'questioning';
      return 'neutral';
    });
    
    const toneVariation = new Set(sentenceTones).size;
    if (toneVariation > 3) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Score platform optimization
   */
  private scorePlatformOptimization(response: string, platform?: string): number {
    if (!platform || !PLATFORM_CRITERIA[platform as keyof typeof PLATFORM_CRITERIA]) {
      return 0.7;
    }
    
    const criteria = PLATFORM_CRITERIA[platform as keyof typeof PLATFORM_CRITERIA];
    let score = 1.0;
    
    // Length optimization
    if (response.length > criteria.maxLength) {
      score -= 0.5;
    } else if (
      response.length < criteria.idealLength.min ||
      response.length > criteria.idealLength.max
    ) {
      score -= 0.2;
    }
    
    // Platform-specific elements
    if (platform === 'twitter' && !response.includes('#')) {
      score -= 0.1;
    }
    
    if (platform === 'instagram' && response.match(/#\w+/g)?.length < 5) {
      score -= 0.1;
    }
    
    if (platform === 'linkedin' && !response.match(/\n\n/)) {
      score -= 0.1; // No paragraph breaks
    }
    
    return Math.max(0, score);
  }
  
  /**
   * Score engagement potential
   */
  private scoreEngagement(response: string, platform?: string): number {
    let score = 0.6;
    
    // Questions encourage engagement
    const questions = response.match(/\?/g)?.length || 0;
    score += Math.min(questions * 0.1, 0.2);
    
    // Emotional language
    const emotionalWords = ['amazing', 'excited', 'love', 'incredible', 'fantastic'];
    const emotionCount = emotionalWords.filter(word => 
      response.toLowerCase().includes(word)
    ).length;
    score += Math.min(emotionCount * 0.1, 0.2);
    
    // Call-to-action
    const ctaPhrases = ['share', 'comment', 'let me know', 'what do you think'];
    const hasCTA = ctaPhrases.some(phrase => response.toLowerCase().includes(phrase));
    if (hasCTA) score += 0.2;
    
    // Platform-specific engagement factors
    if (platform === 'twitter' && response.includes('@')) {
      score += 0.1; // Mentions
    }
    
    if ((platform === 'facebook' || platform === 'instagram') && response.includes('❤️')) {
      score += 0.1; // Emojis
    }
    
    return Math.min(1, score);
  }
  
  /**
   * Get dimension weights based on context
   */
  private getWeights(context: any): Record<keyof QualityDimensions, number> {
    const baseWeights = {
      relevance: 0.2,
      clarity: 0.15,
      completeness: 0.15,
      actionability: 0.1,
      creativity: 0.1,
      tone: 0.1,
      platformOptimization: 0.1,
      engagement: 0.1,
    };
    
    // Adjust weights based on context
    if (context.goals?.includes('engagement')) {
      baseWeights.engagement += 0.1;
      baseWeights.creativity += 0.05;
    }
    
    if (context.goals?.includes('conversion')) {
      baseWeights.actionability += 0.1;
      baseWeights.clarity += 0.05;
    }
    
    if (context.platform) {
      baseWeights.platformOptimization += 0.1;
    }
    
    // Normalize weights
    const total = Object.values(baseWeights).reduce((a, b) => a + b, 0);
    Object.keys(baseWeights).forEach(key => {
      baseWeights[key as keyof typeof baseWeights] /= total;
    });
    
    return baseWeights;
  }
  
  /**
   * Calculate weighted overall score
   */
  private calculateWeightedScore(
    dimensions: QualityDimensions,
    weights: Record<keyof QualityDimensions, number>
  ): number {
    let score = 0;
    
    for (const [dimension, value] of Object.entries(dimensions)) {
      score += value * weights[dimension as keyof QualityDimensions];
    }
    
    return Math.round(score * 100) / 100;
  }
  
  /**
   * Analyze strengths and weaknesses
   */
  private analyzeStrengthsWeaknesses(dimensions: QualityDimensions): {
    strengths: string[];
    weaknesses: string[];
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    const dimensionLabels = {
      relevance: 'Highly relevant to the request',
      clarity: 'Clear and easy to understand',
      completeness: 'Comprehensive response',
      actionability: 'Provides actionable suggestions',
      creativity: 'Creative and original approach',
      tone: 'Appropriate tone for the context',
      platformOptimization: 'Well-optimized for the platform',
      engagement: 'High engagement potential',
    };
    
    for (const [dimension, score] of Object.entries(dimensions)) {
      if (score >= 0.8) {
        strengths.push(dimensionLabels[dimension as keyof typeof dimensionLabels]);
      } else if (score < 0.5) {
        weaknesses.push(`Needs improvement: ${dimension}`);
      }
    }
    
    return { strengths, weaknesses };
  }
  
  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(dimensions: QualityDimensions, context: any): string[] {
    const suggestions: string[] = [];
    
    if (dimensions.clarity < 0.6) {
      suggestions.push('Simplify language and use shorter sentences');
    }
    
    if (dimensions.actionability < 0.6) {
      suggestions.push('Add more specific, actionable recommendations');
    }
    
    if (dimensions.engagement < 0.6) {
      suggestions.push('Include questions or calls-to-action to boost engagement');
    }
    
    if (dimensions.platformOptimization < 0.6 && context.platform) {
      suggestions.push(`Optimize for ${context.platform} best practices`);
    }
    
    if (dimensions.creativity < 0.5) {
      suggestions.push('Try a more creative or unique angle');
    }
    
    return suggestions;
  }
  
  /**
   * Calculate confidence in the score
   */
  private calculateConfidence(context: any): number {
    let confidence = 0.5;
    
    if (context.userPrompt) confidence += 0.2;
    if (context.platform) confidence += 0.1;
    if (context.conversationHistory?.length > 0) confidence += 0.1;
    if (context.targetAudience) confidence += 0.05;
    if (context.goals?.length > 0) confidence += 0.05;
    
    return Math.min(1, confidence);
  }
  
  /**
   * Calculate response metadata
   */
  private calculateMetadata(response: string): any {
    const words = response.split(/\s+/).length;
    const sentences = response.split(/[.!?]+/).filter(s => s.trim()).length;
    
    // Simple readability score (Flesch Reading Ease approximation)
    const avgWordsPerSentence = words / sentences;
    const avgSyllablesPerWord = 1.5; // Simplified estimate
    const readabilityScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    
    // Sentiment analysis (simplified)
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'perfect'];
    const negativeWords = ['bad', 'poor', 'terrible', 'hate', 'awful', 'wrong'];
    
    const positiveCount = positiveWords.filter(word => 
      response.toLowerCase().includes(word)
    ).length;
    
    const negativeCount = negativeWords.filter(word => 
      response.toLowerCase().includes(word)
    ).length;
    
    const sentimentScore = (positiveCount - negativeCount) / (positiveCount + negativeCount + 1);
    
    // Keyword density
    const uniqueWords = new Set(response.toLowerCase().split(/\s+/));
    const keywordDensity = uniqueWords.size / words;
    
    return {
      responseLength: response.length,
      readabilityScore: Math.max(0, Math.min(100, readabilityScore)),
      sentimentScore,
      keywordDensity,
    };
  }
  
  /**
   * Compare multiple responses and rank them
   */
  async compareResponses(responses: Array<{
    id: string;
    response: string;
    context: any;
  }>): Promise<Array<{
    id: string;
    score: number;
    rank: number;
    report: QualityReport;
  }>> {
    const scored = await Promise.all(
      responses.map(async (item) => ({
        id: item.id,
        report: await this.scoreResponse({
          response: item.response,
          context: item.context,
        }),
      }))
    );
    
    // Sort by overall score
    const sorted = scored.sort((a, b) => b.report.overallScore - a.report.overallScore);
    
    // Add rankings
    return sorted.map((item, index) => ({
      id: item.id,
      score: item.report.overallScore,
      rank: index + 1,
      report: item.report,
    }));
  }
}

// Export singleton instance
export const aiQualityScorer = new AIQualityScorer();