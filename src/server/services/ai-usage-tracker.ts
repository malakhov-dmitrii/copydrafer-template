import { db } from "@/server/db";
import { aiUsage, userQuotas } from "@/server/db/schema";
import { and, eq, gte, sql, sum } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * AI Usage Tracking and Analytics Service
 * Tracks usage, costs, and provides analytics for AI operations
 */

// Model pricing configuration (per 1K tokens)
export const MODEL_PRICING = {
  'gpt-3.5-turbo': {
    input: 0.0005,
    output: 0.0015,
  },
  'gpt-4-turbo-preview': {
    input: 0.01,
    output: 0.03,
  },
  'gpt-4': {
    input: 0.03,
    output: 0.06,
  },
  'gpt-4o': {
    input: 0.005,
    output: 0.015,
  },
} as const;

// Usage categories
export type UsageCategory = 
  | 'chat'
  | 'content_generation'
  | 'improvement'
  | 'validation'
  | 'hashtags'
  | 'adaptation';

// Quota types
export interface UserQuota {
  userId: string;
  dailyTokenLimit: number;
  monthlyTokenLimit: number;
  dailyCostLimit: number;
  monthlyCostLimit: number;
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
}

// Default quotas by tier
export const DEFAULT_QUOTAS = {
  free: {
    dailyTokenLimit: 10000,
    monthlyTokenLimit: 100000,
    dailyCostLimit: 0.5,
    monthlyCostLimit: 5,
  },
  starter: {
    dailyTokenLimit: 50000,
    monthlyTokenLimit: 1000000,
    dailyCostLimit: 2.5,
    monthlyCostLimit: 25,
  },
  pro: {
    dailyTokenLimit: 200000,
    monthlyTokenLimit: 5000000,
    dailyCostLimit: 10,
    monthlyCostLimit: 100,
  },
  enterprise: {
    dailyTokenLimit: -1, // Unlimited
    monthlyTokenLimit: -1,
    dailyCostLimit: -1,
    monthlyCostLimit: -1,
  },
} as const;

export class AIUsageTracker {
  /**
   * Track AI usage for a user
   */
  async trackUsage(params: {
    userId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    category: UsageCategory;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const { userId, model, inputTokens, outputTokens, category, metadata } = params;
    
    // Calculate cost
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
    if (!pricing) {
      console.warn(`Unknown model pricing for: ${model}`);
      return;
    }
    
    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;
    
    // Record usage
    await db.insert(aiUsage).values({
      userId,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      inputCost,
      outputCost,
      totalCost,
      category,
      metadata,
      timestamp: new Date(),
    });
    
    // Update cached metrics (optional - for real-time dashboards)
    await this.updateCachedMetrics(userId);
  }
  
  /**
   * Check if user has exceeded quotas
   */
  async checkQuotas(userId: string, estimatedTokens?: number): Promise<{
    allowed: boolean;
    reason?: string;
    usage?: {
      daily: { tokens: number; cost: number };
      monthly: { tokens: number; cost: number };
    };
    limits?: UserQuota;
  }> {
    // Get user's quota
    const [quota] = await db
      .select()
      .from(userQuotas)
      .where(eq(userQuotas.userId, userId));
    
    // Use default quotas if not set
    const userQuota = quota || {
      userId,
      ...DEFAULT_QUOTAS.free,
      tier: 'free' as const,
    };
    
    // Skip checks for unlimited quotas
    if (userQuota.tier === 'enterprise') {
      return { allowed: true };
    }
    
    // Get current usage
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Daily usage
    const [dailyUsage] = await db
      .select({
        totalTokens: sum(aiUsage.totalTokens),
        totalCost: sum(aiUsage.totalCost),
      })
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.userId, userId),
          gte(aiUsage.timestamp, startOfDay)
        )
      );
    
    // Monthly usage
    const [monthlyUsage] = await db
      .select({
        totalTokens: sum(aiUsage.totalTokens),
        totalCost: sum(aiUsage.totalCost),
      })
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.userId, userId),
          gte(aiUsage.timestamp, startOfMonth)
        )
      );
    
    const daily = {
      tokens: Number(dailyUsage?.totalTokens || 0),
      cost: Number(dailyUsage?.totalCost || 0),
    };
    
    const monthly = {
      tokens: Number(monthlyUsage?.totalTokens || 0),
      cost: Number(monthlyUsage?.totalCost || 0),
    };
    
    // Check limits
    const futureDaily = daily.tokens + (estimatedTokens || 0);
    const futureMonthly = monthly.tokens + (estimatedTokens || 0);
    
    if (userQuota.dailyTokenLimit > 0 && futureDaily > userQuota.dailyTokenLimit) {
      return {
        allowed: false,
        reason: `Daily token limit exceeded (${daily.tokens}/${userQuota.dailyTokenLimit})`,
        usage: { daily, monthly },
        limits: userQuota,
      };
    }
    
    if (userQuota.monthlyTokenLimit > 0 && futureMonthly > userQuota.monthlyTokenLimit) {
      return {
        allowed: false,
        reason: `Monthly token limit exceeded (${monthly.tokens}/${userQuota.monthlyTokenLimit})`,
        usage: { daily, monthly },
        limits: userQuota,
      };
    }
    
    if (userQuota.dailyCostLimit > 0 && daily.cost > userQuota.dailyCostLimit) {
      return {
        allowed: false,
        reason: `Daily cost limit exceeded ($${daily.cost.toFixed(2)}/$${userQuota.dailyCostLimit})`,
        usage: { daily, monthly },
        limits: userQuota,
      };
    }
    
    if (userQuota.monthlyCostLimit > 0 && monthly.cost > userQuota.monthlyCostLimit) {
      return {
        allowed: false,
        reason: `Monthly cost limit exceeded ($${monthly.cost.toFixed(2)}/$${userQuota.monthlyCostLimit})`,
        usage: { daily, monthly },
        limits: userQuota,
      };
    }
    
    return {
      allowed: true,
      usage: { daily, monthly },
      limits: userQuota,
    };
  }
  
  /**
   * Get usage analytics for a user
   */
  async getUsageAnalytics(userId: string, period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<{
    summary: {
      totalTokens: number;
      totalCost: number;
      requestCount: number;
      averageTokensPerRequest: number;
    };
    byCategory: Record<UsageCategory, { tokens: number; cost: number; count: number }>;
    byModel: Record<string, { tokens: number; cost: number; count: number }>;
    timeline: Array<{ date: string; tokens: number; cost: number; count: number }>;
    topExpensiveRequests: Array<{
      id: string;
      model: string;
      tokens: number;
      cost: number;
      category: string;
      timestamp: Date;
    }>;
  }> {
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    // Get all usage in period
    const usage = await db
      .select()
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.userId, userId),
          gte(aiUsage.timestamp, startDate)
        )
      );
    
    // Calculate summary
    const summary = {
      totalTokens: usage.reduce((acc, u) => acc + u.totalTokens, 0),
      totalCost: usage.reduce((acc, u) => acc + u.totalCost, 0),
      requestCount: usage.length,
      averageTokensPerRequest: usage.length > 0 
        ? Math.round(usage.reduce((acc, u) => acc + u.totalTokens, 0) / usage.length)
        : 0,
    };
    
    // Group by category
    const byCategory = usage.reduce((acc, u) => {
      const cat = u.category as UsageCategory;
      if (!acc[cat]) {
        acc[cat] = { tokens: 0, cost: 0, count: 0 };
      }
      acc[cat].tokens += u.totalTokens;
      acc[cat].cost += u.totalCost;
      acc[cat].count += 1;
      return acc;
    }, {} as Record<UsageCategory, { tokens: number; cost: number; count: number }>);
    
    // Group by model
    const byModel = usage.reduce((acc, u) => {
      if (!acc[u.model]) {
        acc[u.model] = { tokens: 0, cost: 0, count: 0 };
      }
      acc[u.model].tokens += u.totalTokens;
      acc[u.model].cost += u.totalCost;
      acc[u.model].count += 1;
      return acc;
    }, {} as Record<string, { tokens: number; cost: number; count: number }>);
    
    // Create timeline
    const timelineMap = new Map<string, { tokens: number; cost: number; count: number }>();
    
    usage.forEach(u => {
      const dateKey = u.timestamp.toISOString().split('T')[0];
      const existing = timelineMap.get(dateKey) || { tokens: 0, cost: 0, count: 0 };
      timelineMap.set(dateKey, {
        tokens: existing.tokens + u.totalTokens,
        cost: existing.cost + u.totalCost,
        count: existing.count + 1,
      });
    });
    
    const timeline = Array.from(timelineMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Get top expensive requests
    const topExpensiveRequests = usage
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10)
      .map(u => ({
        id: u.id,
        model: u.model,
        tokens: u.totalTokens,
        cost: u.totalCost,
        category: u.category,
        timestamp: u.timestamp,
      }));
    
    return {
      summary,
      byCategory,
      byModel,
      timeline,
      topExpensiveRequests,
    };
  }
  
  /**
   * Get cost projection based on current usage
   */
  async getCostProjection(userId: string): Promise<{
    currentMonth: number;
    projectedMonth: number;
    currentYear: number;
    projectedYear: number;
    averageDailyCost: number;
    trendDirection: 'up' | 'down' | 'stable';
    recommendedTier?: 'starter' | 'pro' | 'enterprise';
  }> {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    // Get month-to-date usage
    const [monthUsage] = await db
      .select({
        totalCost: sum(aiUsage.totalCost),
      })
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.userId, userId),
          gte(aiUsage.timestamp, startOfMonth)
        )
      );
    
    // Get year-to-date usage
    const [yearUsage] = await db
      .select({
        totalCost: sum(aiUsage.totalCost),
      })
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.userId, userId),
          gte(aiUsage.timestamp, startOfYear)
        )
      );
    
    // Get last 7 days for trend analysis
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentUsage = await db
      .select({
        date: sql<string>`DATE(${aiUsage.timestamp})`,
        dailyCost: sum(aiUsage.totalCost),
      })
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.userId, userId),
          gte(aiUsage.timestamp, sevenDaysAgo)
        )
      )
      .groupBy(sql`DATE(${aiUsage.timestamp})`);
    
    const currentMonthCost = Number(monthUsage?.totalCost || 0);
    const currentYearCost = Number(yearUsage?.totalCost || 0);
    const averageDailyCost = currentMonthCost / dayOfMonth;
    
    // Project costs
    const projectedMonthCost = averageDailyCost * daysInMonth;
    const projectedYearCost = (currentYearCost / dayOfMonth) * 365;
    
    // Analyze trend
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (recentUsage.length >= 3) {
      const firstHalf = recentUsage.slice(0, Math.floor(recentUsage.length / 2));
      const secondHalf = recentUsage.slice(Math.floor(recentUsage.length / 2));
      
      const firstAvg = firstHalf.reduce((acc, d) => acc + Number(d.dailyCost), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((acc, d) => acc + Number(d.dailyCost), 0) / secondHalf.length;
      
      if (secondAvg > firstAvg * 1.1) trendDirection = 'up';
      else if (secondAvg < firstAvg * 0.9) trendDirection = 'down';
    }
    
    // Recommend tier based on projected costs
    let recommendedTier: 'starter' | 'pro' | 'enterprise' | undefined;
    if (projectedMonthCost > DEFAULT_QUOTAS.pro.monthlyCostLimit) {
      recommendedTier = 'enterprise';
    } else if (projectedMonthCost > DEFAULT_QUOTAS.starter.monthlyCostLimit) {
      recommendedTier = 'pro';
    } else if (projectedMonthCost > DEFAULT_QUOTAS.free.monthlyCostLimit) {
      recommendedTier = 'starter';
    }
    
    return {
      currentMonth: currentMonthCost,
      projectedMonth: projectedMonthCost,
      currentYear: currentYearCost,
      projectedYear: projectedYearCost,
      averageDailyCost,
      trendDirection,
      recommendedTier,
    };
  }
  
  /**
   * Update cached metrics for real-time dashboards
   */
  private async updateCachedMetrics(userId: string): Promise<void> {
    // This could update Redis or in-memory cache for real-time metrics
    // For now, we'll skip implementation as it depends on infrastructure
  }
  
  /**
   * Clean up old usage records (for GDPR compliance)
   */
  async cleanupOldRecords(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await db
      .delete(aiUsage)
      .where(gte(aiUsage.timestamp, cutoffDate));
    
    return result.rowCount || 0;
  }
  
  /**
   * Export usage data for billing or analysis
   */
  async exportUsageData(userId: string, startDate: Date, endDate: Date): Promise<{
    csv: string;
    summary: {
      totalCost: number;
      totalTokens: number;
      requestCount: number;
    };
  }> {
    const usage = await db
      .select()
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.userId, userId),
          gte(aiUsage.timestamp, startDate),
          gte(endDate, aiUsage.timestamp)
        )
      );
    
    // Create CSV
    const headers = ['Date', 'Model', 'Category', 'Input Tokens', 'Output Tokens', 'Total Tokens', 'Cost'];
    const rows = usage.map(u => [
      u.timestamp.toISOString(),
      u.model,
      u.category,
      u.inputTokens.toString(),
      u.outputTokens.toString(),
      u.totalTokens.toString(),
      u.totalCost.toFixed(4),
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const summary = {
      totalCost: usage.reduce((acc, u) => acc + u.totalCost, 0),
      totalTokens: usage.reduce((acc, u) => acc + u.totalTokens, 0),
      requestCount: usage.length,
    };
    
    return { csv, summary };
  }
}

// Export singleton instance
export const aiUsageTracker = new AIUsageTracker();

/**
 * Middleware to track usage automatically
 */
export async function trackAIUsage(
  userId: string,
  model: string,
  usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number },
  category: UsageCategory = 'chat',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await aiUsageTracker.trackUsage({
      userId,
      model,
      inputTokens: usage.promptTokens || 0,
      outputTokens: usage.completionTokens || 0,
      category,
      metadata,
    });
  } catch (error) {
    console.error('Failed to track AI usage:', error);
    // Don't throw - tracking failures shouldn't break the app
  }
}

/**
 * Check quotas before making AI calls
 */
export async function enforceQuotas(
  userId: string,
  estimatedTokens: number = 1000
): Promise<void> {
  const quotaCheck = await aiUsageTracker.checkQuotas(userId, estimatedTokens);
  
  if (!quotaCheck.allowed) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: quotaCheck.reason || 'Usage quota exceeded',
      cause: quotaCheck,
    });
  }
}