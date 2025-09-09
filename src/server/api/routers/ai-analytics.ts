import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { aiUsageTracker } from "@/server/services/ai-usage-tracker";
import { aiQualityScorer } from "@/server/services/ai-quality-scorer";
import { TRPCError } from "@trpc/server";

/**
 * AI Analytics Router
 * Provides usage analytics, cost tracking, and quality metrics
 */

export const aiAnalyticsRouter = createTRPCRouter({
  // Get usage analytics
  getUsageAnalytics: protectedProcedure
    .input(z.object({
      period: z.enum(['day', 'week', 'month', 'year']).default('month'),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const analytics = await aiUsageTracker.getUsageAnalytics(
        userId,
        input.period
      );
      
      return analytics;
    }),
  
  // Get cost projection
  getCostProjection: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const projection = await aiUsageTracker.getCostProjection(userId);
      
      return projection;
    }),
  
  // Check current quotas
  checkQuotas: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const quotaStatus = await aiUsageTracker.checkQuotas(userId);
      
      return quotaStatus;
    }),
  
  // Export usage data
  exportUsageData: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      format: z.enum(['csv', 'json']).default('csv'),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      if (input.endDate < input.startDate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'End date must be after start date',
        });
      }
      
      const exportData = await aiUsageTracker.exportUsageData(
        userId,
        input.startDate,
        input.endDate
      );
      
      if (input.format === 'json') {
        return {
          format: 'json',
          data: exportData,
        };
      }
      
      return {
        format: 'csv',
        data: exportData.csv,
        summary: exportData.summary,
      };
    }),
  
  // Score response quality
  scoreResponse: protectedProcedure
    .input(z.object({
      response: z.string(),
      platform: z.string().optional(),
      userPrompt: z.string().optional(),
      targetAudience: z.string().optional(),
      goals: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const report = await aiQualityScorer.scoreResponse({
        response: input.response,
        context: {
          platform: input.platform,
          userPrompt: input.userPrompt,
          targetAudience: input.targetAudience,
          goals: input.goals,
        },
      });
      
      return report;
    }),
  
  // Compare multiple responses
  compareResponses: protectedProcedure
    .input(z.object({
      responses: z.array(z.object({
        id: z.string(),
        response: z.string(),
        platform: z.string().optional(),
      })),
      userPrompt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const comparisons = await aiQualityScorer.compareResponses(
        input.responses.map(r => ({
          id: r.id,
          response: r.response,
          context: {
            platform: r.platform,
            userPrompt: input.userPrompt,
          },
        }))
      );
      
      return comparisons;
    }),
  
  // Get usage trends
  getUsageTrends: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(90).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Get analytics for the specified period
      const period = input.days <= 7 ? 'week' : 
                     input.days <= 30 ? 'month' : 'year';
      
      const analytics = await aiUsageTracker.getUsageAnalytics(userId, period);
      
      // Calculate trends
      const timeline = analytics.timeline;
      if (timeline.length < 2) {
        return {
          trend: 'stable' as const,
          percentageChange: 0,
          timeline,
        };
      }
      
      const firstHalf = timeline.slice(0, Math.floor(timeline.length / 2));
      const secondHalf = timeline.slice(Math.floor(timeline.length / 2));
      
      const firstAvg = firstHalf.reduce((acc, d) => acc + d.tokens, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((acc, d) => acc + d.tokens, 0) / secondHalf.length;
      
      const percentageChange = ((secondAvg - firstAvg) / firstAvg) * 100;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (percentageChange > 10) trend = 'up';
      else if (percentageChange < -10) trend = 'down';
      
      return {
        trend,
        percentageChange: Math.round(percentageChange),
        timeline,
        summary: analytics.summary,
      };
    }),
  
  // Get model usage distribution
  getModelDistribution: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const analytics = await aiUsageTracker.getUsageAnalytics(userId, 'month');
      
      // Calculate percentages
      const totalTokens = analytics.summary.totalTokens;
      const distribution = Object.entries(analytics.byModel).map(([model, data]) => ({
        model,
        tokens: data.tokens,
        cost: data.cost,
        count: data.count,
        percentage: totalTokens > 0 ? (data.tokens / totalTokens) * 100 : 0,
      }));
      
      return distribution.sort((a, b) => b.percentage - a.percentage);
    }),
  
  // Get category breakdown
  getCategoryBreakdown: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const analytics = await aiUsageTracker.getUsageAnalytics(userId, 'month');
      
      // Calculate percentages and averages
      const totalCost = analytics.summary.totalCost;
      const breakdown = Object.entries(analytics.byCategory).map(([category, data]) => ({
        category,
        tokens: data.tokens,
        cost: data.cost,
        count: data.count,
        percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
        averageTokensPerRequest: data.count > 0 ? Math.round(data.tokens / data.count) : 0,
      }));
      
      return breakdown.sort((a, b) => b.cost - a.cost);
    }),
  
  // Get quota recommendations
  getQuotaRecommendations: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const [quotaStatus, projection] = await Promise.all([
        aiUsageTracker.checkQuotas(userId),
        aiUsageTracker.getCostProjection(userId),
      ]);
      
      const currentTier = quotaStatus.limits?.tier || 'free';
      const recommendedTier = projection.recommendedTier;
      
      let recommendation = {
        shouldUpgrade: false,
        currentTier,
        recommendedTier,
        reason: '',
        potentialSavings: 0,
      };
      
      if (recommendedTier && recommendedTier !== currentTier) {
        recommendation.shouldUpgrade = true;
        
        if (projection.projectedMonth > (quotaStatus.limits?.monthlyCostLimit || 0)) {
          recommendation.reason = `Your projected monthly cost ($${projection.projectedMonth.toFixed(2)}) exceeds your current limit`;
        } else if (quotaStatus.usage?.monthly.tokens > (quotaStatus.limits?.monthlyTokenLimit || 0) * 0.8) {
          recommendation.reason = 'You are approaching your monthly token limit';
        }
      }
      
      return {
        recommendation,
        currentUsage: quotaStatus.usage,
        projection,
      };
    }),
});