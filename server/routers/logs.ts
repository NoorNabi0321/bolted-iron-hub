/**
 * Logs Router
 * Provides tRPC endpoints for accessing captured server logs
 */

import { router, publicProcedure } from '../_core/trpc';
import { logCaptureService } from '../services/logCaptureService';
import { z } from 'zod';

export const logsRouter = router({
  /**
   * Get all captured logs with optional filtering
   */
  getLogs: publicProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        level: z.enum(['log', 'warn', 'error', 'info']).optional(),
        keyword: z.string().optional(),
      }).optional()
    )
    .query(({ input }) => {
      if (!input) {
        return logCaptureService.getLogs(100);
      }

      if (input.keyword) {
        return logCaptureService.getLogsByKeyword(input.keyword, input.limit);
      }

      if (input.level) {
        return logCaptureService.getLogsByLevel(input.level, input.limit);
      }

      return logCaptureService.getLogs(input.limit);
    }),

  /**
   * Get recent logs (last N entries)
   */
  getRecentLogs: publicProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(({ input }) => {
      return logCaptureService.getLogs(input.limit);
    }),

  /**
   * Get logs by level
   */
  getLogsByLevel: publicProcedure
    .input(
      z.object({
        level: z.enum(['log', 'warn', 'error', 'info']),
        limit: z.number().optional(),
      })
    )
    .query(({ input }) => {
      return logCaptureService.getLogsByLevel(input.level, input.limit);
    }),

  /**
   * Search logs by keyword
   */
  searchLogs: publicProcedure
    .input(
      z.object({
        keyword: z.string(),
        limit: z.number().optional(),
      })
    )
    .query(({ input }) => {
      return logCaptureService.getLogsByKeyword(input.keyword, input.limit);
    }),

  /**
   * Get log statistics
   */
  getLogStats: publicProcedure.query(() => {
    const allLogs = logCaptureService.getLogs();
    const logs = allLogs;

    return {
      totalLogs: logs.length,
      errorCount: logs.filter(l => l.level === 'error').length,
      warningCount: logs.filter(l => l.level === 'warn').length,
      infoCount: logs.filter(l => l.level === 'info').length,
      logCount: logs.filter(l => l.level === 'log').length,
    };
  }),

  /**
   * Clear all logs
   */
  clearLogs: publicProcedure.mutation(() => {
    logCaptureService.clearLogs();
    return { success: true };
  }),
});
