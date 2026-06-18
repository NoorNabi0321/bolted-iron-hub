/**
 * WhatsApp Bot Dashboard Router
 * tRPC procedures for bot status, message logs, statistics, and admin management
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { whatsappMessagesLog, whatsappAdminUsers } from '../../drizzle/schema';
import { eq, desc, and, gte, lte, like, SQL } from 'drizzle-orm';
import { isBotReady, getBotStatus } from '../services/whatsappBotService';
import { getMessageStatistics } from '../services/whatsappMessageLogger';

/**
 * WhatsApp Bot Dashboard Router
 */
export const whatsappBotRouter = router({
  /**
   * Get bot status
   */
  getBotStatus: protectedProcedure.query(async () => {
    try {
      const status = getBotStatus();
      return {
        isConnected: status.isConnected,
        isInitialized: status.isInitialized,
        isReady: status.isReady,
        timestamp: new Date().getTime(),
      };
    } catch (error) {
      console.error('[WhatsApp Bot] Error getting bot status:', error);
      return {
        isConnected: false,
        isInitialized: false,
        hasClient: false,
        timestamp: new Date().getTime(),
      };
    }
  }),

  /**
   * Get message logs with filters
   */
  getMessageLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(500).default(50),
        offset: z.number().min(0).default(0),
        status: z.enum(['success', 'error', 'unauthorized']).optional(),
        commandType: z.string().optional(),
        groupChatId: z.string().optional(),
        senderPhone: z.string().optional(),
        startDate: z.number().optional(),
        endDate: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { logs: [], total: 0 };

        // Build where conditions
        const conditions: (SQL<any> | undefined)[] = [];

        if (input.status) {
          conditions.push(eq(whatsappMessagesLog.status, input.status));
        }

        if (input.commandType) {
          conditions.push(eq(whatsappMessagesLog.commandType, input.commandType));
        }

        if (input.groupChatId) {
          conditions.push(eq(whatsappMessagesLog.groupChatId, input.groupChatId));
        }

        if (input.senderPhone) {
          conditions.push(like(whatsappMessagesLog.senderPhoneNumber, `%${input.senderPhone}%`));
        }

        if (input.startDate) {
          conditions.push(gte(whatsappMessagesLog.createdAt, new Date(input.startDate)));
        }

        if (input.endDate) {
          conditions.push(lte(whatsappMessagesLog.createdAt, new Date(input.endDate)));
        }

        // Filter out undefined conditions
        const validConditions = conditions.filter((c) => c !== undefined);

        // Build query with conditions
        let query = db.select().from(whatsappMessagesLog);
        
        if (validConditions.length > 0) {
          query = query.where(validConditions.length === 1 ? validConditions[0] : and(...validConditions));
        }

        // Get paginated results
        const logs = await query
          .orderBy(desc(whatsappMessagesLog.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        // Get total count
        let countQuery = db.select().from(whatsappMessagesLog);
        if (validConditions.length > 0) {
          countQuery = countQuery.where(validConditions.length === 1 ? validConditions[0] : and(...validConditions));
        }
        const allLogs = await countQuery;
        const total = allLogs.length;

        return {
          logs: logs.map((log: any) => ({
            id: log.id,
            groupChatId: log.groupChatId,
            senderPhone: log.senderPhoneNumber,
            messageText: log.messageText,
            status: log.status,
            commandType: log.commandType,
            responseText: log.responseText,
            errorMessage: log.errorMessage,
            createdAt: log.createdAt?.getTime() || 0,
          })),
          total,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error('[WhatsApp Bot] Error fetching message logs:', error);
        return { logs: [], total: 0, limit: input.limit, offset: input.offset };
      }
    }),

  /**
   * Get message statistics
   */
  getMessageStatistics: protectedProcedure.query(async () => {
    try {
      const stats = await getMessageStatistics();
      return {
        totalMessages: stats.totalMessages,
        successCount: stats.successCount,
        errorCount: stats.errorCount,
        unauthorizedCount: stats.unauthorizedCount,
        successRate: stats.totalMessages > 0 ? (stats.successCount / stats.totalMessages) * 100 : 0,
        uniqueGroups: stats.uniqueGroups,
        uniqueSenders: stats.uniqueSenders,
      };
    } catch (error) {
      console.error('[WhatsApp Bot] Error getting statistics:', error);
      return {
        totalMessages: 0,
        successCount: 0,
        errorCount: 0,
        unauthorizedCount: 0,
        successRate: 0,
        uniqueGroups: 0,
        uniqueSenders: 0,
      };
    }
  }),

  /**
   * Get command statistics
   */
  getCommandStatistics: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return {};

      const logs = await (db as any).select().from(whatsappMessagesLog);

      const commandStats: Record<string, number> = {};

      logs.forEach((log: any) => {
        if (log.commandType) {
          commandStats[log.commandType] = (commandStats[log.commandType] || 0) + 1;
        }
      });

      return commandStats;
    } catch (error) {
      console.error('[WhatsApp Bot] Error getting command statistics:', error);
      return {};
    }
  }),

  /**
   * Get admin users
   */
  getAdminUsers: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return [];

      const admins = await (db as any).select().from(whatsappAdminUsers);

      return admins.map((admin: any) => ({
        id: admin.id,
        phoneNumber: admin.phoneNumber,
        role: admin.role,
        isActive: admin.isActive,
        createdAt: admin.createdAt?.getTime() || 0,
        updatedAt: admin.updatedAt?.getTime() || 0,
      }));
    } catch (error) {
      console.error('[WhatsApp Bot] Error fetching admin users:', error);
      return [];
    }
  }),

  /**
   * Add admin user
   */
  addAdminUser: protectedProcedure
    .input(
      z.object({
        phoneNumber: z.string().min(10),
        role: z.enum(['admin', 'super_admin']).default('admin'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database connection failed');

        // Check if admin already exists
        const existing = await (db as any)
          .select()
          .from(whatsappAdminUsers)
          .where((t: any) => t.phoneNumber === input.phoneNumber);

        if (existing.length > 0) {
          throw new Error('Admin user already exists');
        }

        // Add new admin
        await (db as any)
          .insert(whatsappAdminUsers)
          .values({
            phoneNumber: input.phoneNumber,
          role: input.role,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return {
          success: true,
          message: `Admin user added successfully`,
        };
      } catch (error) {
        console.error('[WhatsApp Bot] Error adding admin user:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to add admin user');
      }
    }),

  /**
   * Update admin user
   */
  updateAdminUser: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        role: z.enum(['admin', 'super_admin']).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database connection failed');

        const updates: any = {
          updatedAt: new Date(),
        };

        if (input.role) updates.role = input.role;
        if (input.isActive !== undefined) updates.isActive = input.isActive;

        await (db as any)
          .update(whatsappAdminUsers)
          .set(updates)
          .where((t: any) => t.id === input.adminId);

        return {
          success: true,
          message: 'Admin user updated successfully',
        };
      } catch (error) {
        console.error('[WhatsApp Bot] Error updating admin user:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to update admin user');
      }
    }),

  /**
   * Delete admin user
   */
  deleteAdminUser: protectedProcedure
    .input(z.object({ adminId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database connection failed');

        await (db as any)
          .delete(whatsappAdminUsers)
          .where((t: any) => t.id === input.adminId);

        return {
          success: true,
          message: 'Admin user deleted successfully',
        };
      } catch (error) {
        console.error('[WhatsApp Bot] Error deleting admin user:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to delete admin user');
      }
    }),

  /**
   * Get recent activity summary
   */
  getActivitySummary: protectedProcedure
    .input(z.object({ hours: z.number().default(24) }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { recent: [], hourlyStats: [] };

        const cutoffTime = new Date(Date.now() - input.hours * 60 * 60 * 1000);

        const recentLogs = await (db as any)
          .select()
          .from(whatsappMessagesLog)
          .where((t: any) => t.createdAt >= cutoffTime)
          .orderBy((t: any) => t.createdAt, 'desc')
          .limit(20);

        // Calculate hourly statistics
        const hourlyStats: Record<string, { success: number; error: number; unauthorized: number }> = {};

        recentLogs.forEach((log: any) => {
          const hour = new Date(log.createdAt).toISOString().slice(0, 13);
          if (!hourlyStats[hour]) {
            hourlyStats[hour] = { success: 0, error: 0, unauthorized: 0 };
          }
          hourlyStats[hour][log.status]++;
        });

        return {
          recent: recentLogs.map((log: any) => ({
            id: log.id,
            commandType: log.commandType,
            status: log.status,
            createdAt: log.createdAt?.getTime() || 0,
          })),
          hourlyStats: Object.entries(hourlyStats).map(([hour, stats]) => ({
            hour,
            ...stats,
          })),
        };
      } catch (error) {
        console.error('[WhatsApp Bot] Error getting activity summary:', error);
        return { recent: [], hourlyStats: [] };
      }
    }),

  /**
   * Get bot health check
   */
  getHealthCheck: protectedProcedure.query(async () => {
    try {
      const botStatus = getBotStatus();
      const stats = await getMessageStatistics();

      const recentSuccessRate = stats.totalMessages > 0 
        ? (stats.successCount / stats.totalMessages) * 100 
        : 0;

      return {
        isConnected: botStatus.isConnected,
        isInitialized: botStatus.isInitialized,
        isReady: botStatus.isReady,
        totalMessages: stats.totalMessages,
        successRate: recentSuccessRate,
        errorCount: stats.errorCount,
        unauthorizedCount: stats.unauthorizedCount,
        timestamp: new Date().getTime(),
        health: botStatus.isConnected && recentSuccessRate > 80 ? 'healthy' : 'degraded',
      };
    } catch (error) {
      console.error('[WhatsApp Bot] Error getting health check:', error);
      return {
        botConnected: false,
        botInitialized: false,
        hasClient: false,
        totalMessages: 0,
        successRate: 0,
        errorCount: 0,
        unauthorizedCount: 0,
        timestamp: new Date().getTime(),
        health: 'unhealthy',
      };
    }
  }),

  /**
   * Clear message logs
   */
  clearMessageLogs: protectedProcedure
    .input(z.object({ daysOld: z.number().default(30) }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database connection failed');

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - input.daysOld);

        await (db as any)
          .delete(whatsappMessagesLog)
          .where((t: any) => t.createdAt < cutoffDate);

        return {
          success: true,
          message: `Logs older than ${input.daysOld} days cleared`,
        };
      } catch (error) {
        console.error('[WhatsApp Bot] Error clearing logs:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to clear logs');
      }
    }),

  /**
   * Export message logs as JSON
   */
  exportMessageLogs: protectedProcedure
    .input(z.object({ status: z.enum(['success', 'error', 'unauthorized']).optional() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { data: '[]', timestamp: new Date().getTime() };

        let query = (db as any).select().from(whatsappMessagesLog);

        if (input.status) {
          query = query.where((t: any) => t.status === input.status);
        }

        const logs = await query.orderBy((t: any) => t.createdAt, 'desc');

        return {
          data: JSON.stringify(logs, null, 2),
          timestamp: new Date().getTime(),
          count: logs.length,
        };
      } catch (error) {
        console.error('[WhatsApp Bot] Error exporting logs:', error);
        throw new Error('Failed to export logs');
      }
    }),
});
