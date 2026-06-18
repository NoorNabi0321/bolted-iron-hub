import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { whatsappMessagesLog, whatsappAuthorizedGroups } from '../../drizzle/schema';
import { eq, and, gte, lte, like, desc } from 'drizzle-orm';

export const whatsappLogsRouter = router({
  /**
   * Get paginated message logs with optional filters
   */
  getMessageLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
        groupChatId: z.string().optional(),
        commandType: z.string().optional(),
        status: z.enum(['success', 'error', 'unauthorized']).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        searchQuery: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();

      const conditions: any[] = [];

      if (input.groupChatId) {
        conditions.push(eq(whatsappMessagesLog.groupChatId, input.groupChatId));
      }

      if (input.commandType) {
        conditions.push(like(whatsappMessagesLog.commandType, `%${input.commandType}%`));
      }

      if (input.status) {
        conditions.push(eq(whatsappMessagesLog.status, input.status));
      }

      if (input.startDate) {
        conditions.push(gte(whatsappMessagesLog.createdAt, input.startDate));
      }

      if (input.endDate) {
        const endOfDay = new Date(input.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(lte(whatsappMessagesLog.createdAt, endOfDay));
      }

      if (input.searchQuery) {
        conditions.push(
          like(whatsappMessagesLog.senderPhoneNumber, `%${input.searchQuery}%`)
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const logs = await db
        .select()
        .from(whatsappMessagesLog)
        .where(whereClause)
        .orderBy(desc(whatsappMessagesLog.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const countResult = await db
        .select({ count: whatsappMessagesLog.id })
        .from(whatsappMessagesLog)
        .where(whereClause);

      const total = countResult.length > 0 ? 1 : 0;

      return {
        logs,
        total,
        limit: input.limit,
        offset: input.offset,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Get single message log details
   */
  getMessageLogDetail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return null;
      }

      const log = await db
        .select()
        .from(whatsappMessagesLog)
        .where(eq(whatsappMessagesLog.id, input.id))
        .limit(1);

      if (log.length === 0) {
        return null;
      }

      const groupInfo = await db
        .select()
        .from(whatsappAuthorizedGroups)
        .where(eq(whatsappAuthorizedGroups.groupChatId, log[0].groupChatId))
        .limit(1);

      return {
        ...log[0],
        groupName: groupInfo[0]?.groupName || 'Unknown Group',
      };
    }),

  /**
   * Get logs grouped by status for error tracking
   */
  getErrorStatistics: protectedProcedure
    .input(
      z.object({
        groupChatId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return {};
      }

      const conditions: any[] = [];

      if (input.groupChatId) {
        conditions.push(eq(whatsappMessagesLog.groupChatId, input.groupChatId));
      }

      if (input.startDate) {
        conditions.push(gte(whatsappMessagesLog.createdAt, input.startDate));
      }

      if (input.endDate) {
        const endOfDay = new Date(input.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(lte(whatsappMessagesLog.createdAt, endOfDay));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const logs = await db
        .select()
        .from(whatsappMessagesLog)
        .where(whereClause);

      const successCount = logs.filter(l => l.status === 'success').length;
      const errorCount = logs.filter(l => l.status === 'error').length;
      const unauthorizedCount = logs.filter(l => l.status === 'unauthorized').length;

      const errorsByType: Record<string, number> = {};
      logs
        .filter(l => l.status === 'error')
        .forEach(log => {
          const errorMsg = log.errorMessage || 'Unknown Error';
          errorsByType[errorMsg] = (errorsByType[errorMsg] || 0) + 1;
        });

      return {
        total: logs.length,
        successCount,
        errorCount,
        unauthorizedCount,
        successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 0,
        errorRate: logs.length > 0 ? (errorCount / logs.length) * 100 : 0,
        unauthorizedRate: logs.length > 0 ? (unauthorizedCount / logs.length) * 100 : 0,
        errorsByType,
      };
    }),

  /**
   * Get logs grouped by command type
   */
  getCommandStatistics: protectedProcedure
    .input(
      z.object({
        groupChatId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return {};
      }

      const conditions: any[] = [];

      if (input.groupChatId) {
        conditions.push(eq(whatsappMessagesLog.groupChatId, input.groupChatId));
      }

      if (input.startDate) {
        conditions.push(gte(whatsappMessagesLog.createdAt, input.startDate));
      }

      if (input.endDate) {
        const endOfDay = new Date(input.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(lte(whatsappMessagesLog.createdAt, endOfDay));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const logs = await db
        .select()
        .from(whatsappMessagesLog)
        .where(whereClause);

      const commandStats: Record<string, { count: number; successCount: number }> = {};

      logs.forEach(log => {
        const cmd = log.commandType || 'unknown';
        if (!commandStats[cmd]) {
          commandStats[cmd] = { count: 0, successCount: 0 };
        }
        commandStats[cmd].count += 1;
        if (log.status === 'success') {
          commandStats[cmd].successCount += 1;
        }
      });

      return Object.entries(commandStats).map(([command, stats]) => ({
        command,
        count: stats.count,
        successCount: stats.successCount,
        successRate: stats.count > 0 ? (stats.successCount / stats.count) * 100 : 0,
      }));
    }),

  /**
   * Get logs for CSV export
   */
  exportLogs: protectedProcedure
    .input(
      z.object({
        groupChatId: z.string().optional(),
        commandType: z.string().optional(),
        status: z.enum(['success', 'error', 'unauthorized']).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return [];
      }

      const conditions: any[] = [];

      if (input.groupChatId) {
        conditions.push(eq(whatsappMessagesLog.groupChatId, input.groupChatId));
      }

      if (input.commandType) {
        conditions.push(like(whatsappMessagesLog.commandType, `%${input.commandType}%`));
      }

      if (input.status) {
        conditions.push(eq(whatsappMessagesLog.status, input.status));
      }

      if (input.startDate) {
        conditions.push(gte(whatsappMessagesLog.createdAt, input.startDate));
      }

      if (input.endDate) {
        const endOfDay = new Date(input.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(lte(whatsappMessagesLog.createdAt, endOfDay));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const logs = await db
        .select()
        .from(whatsappMessagesLog)
        .where(whereClause)
        .orderBy(desc(whatsappMessagesLog.createdAt));

      // Get group names for each log
      const groupMap = new Map<string, string>();
      if (db) {
        const groups = await db.select().from(whatsappAuthorizedGroups);
        groups.forEach(g => groupMap.set(g.groupChatId, g.groupName));
      }

      return logs.map(log => ({
        timestamp: log.createdAt,
        group: groupMap.get(log.groupChatId) || 'Unknown',
        sender: log.senderPhoneNumber,
        command: log.commandType || 'N/A',
        status: log.status,
        response: log.responseText || 'N/A',
        error: log.errorMessage || 'N/A',
      }));
    }),

  /**
   * Delete logs older than specified date
   */
  deleteOldLogs: protectedProcedure
    .input(z.object({ beforeDate: z.date() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database connection failed');
      }

      const result = await db
        .delete(whatsappMessagesLog)
        .where(lte(whatsappMessagesLog.createdAt, input.beforeDate));

      return { deletedCount: 0 };
    }),
});
