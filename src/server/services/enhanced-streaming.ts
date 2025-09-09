import { TRPCError } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import type { CoreMessage } from 'ai';
import { llmService } from './llm-service';
import { buildOptimizedSystemPrompt, buildConversationContext, SmartPromptBuilder } from './prompt-engineering';

/**
 * Enhanced Streaming Service with retry logic, fallbacks, and optimizations
 */

export interface StreamToken {
  token?: string;
  done?: boolean;
  error?: string;
  metadata?: {
    model?: string;
    totalTokens?: number;
    processingTime?: number;
    retryCount?: number;
  };
}

export interface StreamOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  fallbackModel?: string;
  enableCaching?: boolean;
  streamBufferSize?: number;
}

const DEFAULT_OPTIONS: StreamOptions = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  enableCaching: true,
  streamBufferSize: 10,
};

/**
 * Response cache for reducing API calls
 */
class ResponseCache {
  private cache = new Map<string, { response: string; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  
  set(key: string, response: string): void {
    this.cache.set(key, { response, timestamp: Date.now() });
    this.cleanup();
  }
  
  get(key: string): string | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.response;
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }
  
  generateKey(messages: CoreMessage[], platform?: string): string {
    const content = messages.map(m => `${m.role}:${m.content}`).join('|');
    return `${platform || 'general'}_${this.hashString(content)}`;
  }
  
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

const responseCache = new ResponseCache();

/**
 * Token buffer for smooth streaming
 */
class TokenBuffer {
  private buffer: string[] = [];
  private readonly maxSize: number;
  private flushCallback?: (tokens: string[]) => void;
  
  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }
  
  add(token: string): void {
    this.buffer.push(token);
    if (this.buffer.length >= this.maxSize) {
      this.flush();
    }
  }
  
  flush(): void {
    if (this.buffer.length > 0 && this.flushCallback) {
      this.flushCallback([...this.buffer]);
      this.buffer = [];
    }
  }
  
  onFlush(callback: (tokens: string[]) => void): void {
    this.flushCallback = callback;
  }
  
  clear(): void {
    this.buffer = [];
  }
}

/**
 * Enhanced streaming with retry logic and fallbacks
 */
export async function createEnhancedStream(params: {
  messages: CoreMessage[];
  userId: string;
  platform?: string;
  draftContext?: string;
  options?: StreamOptions;
}) {
  const options = { ...DEFAULT_OPTIONS, ...params.options };
  const { messages, userId, platform, draftContext } = params;
  
  return observable<StreamToken>((observer) => {
    let isComplete = false;
    let retryCount = 0;
    let startTime = Date.now();
    let totalTokens = 0;
    let currentModel = 'standard';
    let fullResponse = '';
    
    // Check cache first if enabled
    if (options.enableCaching) {
      const cacheKey = responseCache.generateKey(messages, platform);
      const cached = responseCache.get(cacheKey);
      
      if (cached) {
        // Stream cached response with simulated delay
        const words = cached.split(' ');
        let index = 0;
        
        const streamInterval = setInterval(() => {
          if (index < words.length) {
            const token = (index > 0 ? ' ' : '') + words[index];
            observer.next({ token, done: false });
            index++;
          } else {
            clearInterval(streamInterval);
            observer.next({ 
              done: true, 
              metadata: { 
                model: 'cached',
                totalTokens: words.length,
                processingTime: Date.now() - startTime,
              }
            });
            observer.complete();
          }
        }, 50);
        
        return () => clearInterval(streamInterval);
      }
    }
    
    // Create token buffer for smooth streaming
    const tokenBuffer = new TokenBuffer(options.streamBufferSize);
    tokenBuffer.onFlush((tokens) => {
      tokens.forEach(token => {
        observer.next({ token, done: false });
        totalTokens++;
      });
    });
    
    // Timeout handler
    const timeoutId = setTimeout(() => {
      if (!isComplete) {
        observer.next({ 
          error: 'Request timeout. Please try again.',
          done: true,
        });
        observer.complete();
      }
    }, options.timeout!);
    
    // Main streaming function with retry logic
    const performStream = async (attempt: number = 0): Promise<void> => {
      try {
        // Build optimized system prompt
        const system = buildOptimizedSystemPrompt({
          platform: platform || 'general',
          draftContext,
          conversationHistory: messages.slice(-5), // Last 5 messages for context
        });
        
        // Add conversation context
        const contextualizedMessages = [...messages];
        if (messages.length > 10) {
          const context = buildConversationContext(messages.slice(0, -5));
          contextualizedMessages.unshift({
            role: 'system',
            content: context,
          });
        }
        
        // Use fallback model on retries
        if (attempt > 1 && options.fallbackModel) {
          currentModel = 'fast'; // Fallback to faster model
        }
        
        const result = await llmService.streamText({
          messages: contextualizedMessages,
          system,
          modelType: currentModel as any,
          userId,
          onChunk: (chunk) => {
            tokenBuffer.add(chunk);
            fullResponse += chunk;
          },
        });
        
        // Process stream
        for await (const chunk of result.textStream) {
          if (isComplete) break;
          // Chunks are already handled by onChunk callback
        }
        
        // Flush remaining tokens
        tokenBuffer.flush();
        
        // Cache successful response
        if (options.enableCaching && fullResponse) {
          const cacheKey = responseCache.generateKey(messages, platform);
          responseCache.set(cacheKey, fullResponse);
        }
        
        // Send completion
        observer.next({
          done: true,
          metadata: {
            model: currentModel,
            totalTokens,
            processingTime: Date.now() - startTime,
            retryCount: attempt,
          },
        });
        
        isComplete = true;
        clearTimeout(timeoutId);
        observer.complete();
        
      } catch (error) {
        console.error(`Stream attempt ${attempt + 1} failed:`, error);
        
        // Retry logic
        if (attempt < options.maxRetries! - 1) {
          retryCount++;
          
          // Exponential backoff
          const delay = options.retryDelay! * Math.pow(2, attempt);
          
          observer.next({
            token: `\n[Retrying... attempt ${attempt + 2}/${options.maxRetries}]\n`,
            done: false,
          });
          
          setTimeout(() => {
            performStream(attempt + 1);
          }, delay);
        } else {
          // Final failure
          observer.next({
            error: error instanceof Error ? error.message : 'Stream failed after retries',
            done: true,
            metadata: {
              retryCount,
              processingTime: Date.now() - startTime,
            },
          });
          
          isComplete = true;
          clearTimeout(timeoutId);
          observer.complete();
        }
      }
    };
    
    // Start streaming
    performStream();
    
    // Cleanup function
    return () => {
      isComplete = true;
      clearTimeout(timeoutId);
      tokenBuffer.clear();
    };
  });
}

/**
 * Stream with quality scoring
 */
export async function streamWithQualityScore(params: {
  messages: CoreMessage[];
  userId: string;
  platform?: string;
  draftContext?: string;
  minQualityScore?: number;
}) {
  const { minQualityScore = 0.7 } = params;
  
  return observable<StreamToken>((observer) => {
    let fullResponse = '';
    let isComplete = false;
    
    // First, stream the response
    const streamSub = createEnhancedStream(params).subscribe({
      next: (token) => {
        if (token.token) {
          fullResponse += token.token;
        }
        observer.next(token);
        
        if (token.done && !token.error) {
          // Score the response quality
          scoreResponseQuality(fullResponse, params.platform || 'general').then(score => {
            if (score < minQualityScore && !isComplete) {
              // Low quality - regenerate with improved prompt
              observer.next({
                token: '\n[Response quality below threshold. Regenerating...]\n',
                done: false,
              });
              
              // Add quality improvement instruction
              const improvedMessages = [...params.messages];
              improvedMessages.push({
                role: 'system',
                content: 'Please provide a more detailed, actionable, and specific response.',
              });
              
              // Retry with improved prompt
              createEnhancedStream({
                ...params,
                messages: improvedMessages,
              }).subscribe({
                next: (improvedToken) => {
                  if (!isComplete) {
                    observer.next(improvedToken);
                  }
                },
                complete: () => {
                  isComplete = true;
                  observer.complete();
                },
              });
            } else {
              isComplete = true;
            }
          });
        }
      },
      error: (err) => observer.error(err),
      complete: () => {
        if (isComplete) {
          observer.complete();
        }
      },
    });
    
    return () => {
      isComplete = true;
      streamSub.unsubscribe();
    };
  });
}

/**
 * Score response quality
 */
async function scoreResponseQuality(response: string, platform: string): Promise<number> {
  let score = 1.0;
  
  // Length check
  if (response.length < 50) score -= 0.3;
  if (response.length > 2000) score -= 0.1;
  
  // Specificity check
  const specificityIndicators = /\b(specifically|for example|such as|including|step \d+)\b/gi;
  const specificityMatches = response.match(specificityIndicators);
  if (!specificityMatches || specificityMatches.length < 2) score -= 0.2;
  
  // Actionability check
  const actionIndicators = /\b(try|consider|use|add|remove|change|update|implement)\b/gi;
  const actionMatches = response.match(actionIndicators);
  if (!actionMatches || actionMatches.length < 2) score -= 0.2;
  
  // Platform relevance
  if (!response.toLowerCase().includes(platform.toLowerCase())) score -= 0.1;
  
  // Structure check (headers, lists, etc.)
  const structureIndicators = /[\n•\-\*]|^\d+\.|^#+\s/gm;
  const structureMatches = response.match(structureIndicators);
  if (!structureMatches || structureMatches.length < 3) score -= 0.1;
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Parallel streaming for A/B testing
 */
export async function parallelStreamVariations(params: {
  messages: CoreMessage[];
  userId: string;
  platform?: string;
  draftContext?: string;
  variationCount?: number;
  temperatures?: number[];
}) {
  const { variationCount = 2, temperatures = [0.7, 0.9] } = params;
  
  return observable<{ variation: number; token: StreamToken }>((observer) => {
    const subscriptions: any[] = [];
    let completedCount = 0;
    
    // Create parallel streams with different temperatures
    for (let i = 0; i < variationCount; i++) {
      const temperature = temperatures[i] || 0.7 + (i * 0.1);
      
      const sub = createEnhancedStream({
        ...params,
        options: {
          ...params.options,
        },
      }).subscribe({
        next: (token) => {
          observer.next({ variation: i, token });
          
          if (token.done) {
            completedCount++;
            if (completedCount === variationCount) {
              observer.complete();
            }
          }
        },
        error: (err) => observer.error(err),
      });
      
      subscriptions.push(sub);
    }
    
    // Cleanup
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  });
}

/**
 * Stream with automatic platform detection
 */
export async function streamWithPlatformDetection(params: {
  content: string;
  userId: string;
  messages: CoreMessage[];
}) {
  // Detect platform from content characteristics
  const platform = detectPlatform(params.content);
  
  // Use platform-specific prompt
  const promptBuilder = platform === 'twitter' 
    ? SmartPromptBuilder.forContentImprovement
    : SmartPromptBuilder.forContentValidation;
  
  const optimizedPrompt = promptBuilder({
    content: params.content,
    platform,
    improvements: ['clarity', 'engagement', 'platform-optimization'],
  });
  
  const messages = [
    ...params.messages,
    { role: 'user' as const, content: optimizedPrompt },
  ];
  
  return createEnhancedStream({
    messages,
    userId: params.userId,
    platform,
    draftContext: params.content,
  });
}

/**
 * Detect platform from content characteristics
 */
function detectPlatform(content: string): string {
  const length = content.length;
  
  // Twitter detection
  if (length <= 280 || content.includes('@') && content.includes('#')) {
    return 'twitter';
  }
  
  // LinkedIn detection
  if (content.match(/\b(professional|industry|business|career)\b/gi)) {
    return 'linkedin';
  }
  
  // Instagram detection
  if (content.match(/#\w+/g)?.length > 5) {
    return 'instagram';
  }
  
  // Facebook default for longer content
  if (length > 500) {
    return 'facebook';
  }
  
  return 'general';
}

/**
 * Stream with conversation memory management
 */
export class ConversationMemoryStream {
  private memory: Map<string, CoreMessage[]> = new Map();
  private readonly maxMemorySize = 20;
  
  async streamWithMemory(params: {
    conversationId: string;
    newMessage: string;
    userId: string;
    platform?: string;
    draftContext?: string;
  }) {
    const { conversationId, newMessage, userId, platform, draftContext } = params;
    
    // Get or initialize conversation memory
    const history = this.memory.get(conversationId) || [];
    
    // Add new user message
    history.push({ role: 'user', content: newMessage });
    
    // Trim old messages if needed
    if (history.length > this.maxMemorySize) {
      history.splice(0, history.length - this.maxMemorySize);
    }
    
    // Create stream with full context
    const stream = await createEnhancedStream({
      messages: history,
      userId,
      platform,
      draftContext,
      options: {
        enableCaching: true,
        streamBufferSize: 15,
      },
    });
    
    // Update memory with assistant response
    let assistantResponse = '';
    stream.subscribe({
      next: (token) => {
        if (token.token) {
          assistantResponse += token.token;
        }
        if (token.done && !token.error) {
          history.push({ role: 'assistant', content: assistantResponse });
          this.memory.set(conversationId, history);
        }
      },
    });
    
    return stream;
  }
  
  clearMemory(conversationId: string): void {
    this.memory.delete(conversationId);
  }
  
  getMemorySize(conversationId: string): number {
    return this.memory.get(conversationId)?.length || 0;
  }
}

export const conversationMemory = new ConversationMemoryStream();