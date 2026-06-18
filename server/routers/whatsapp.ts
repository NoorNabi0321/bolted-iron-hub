/**
 * WhatsApp Admin Router
 * tRPC procedures for WhatsApp settings, group management, and statistics
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { whatsappAuthorizedGroups, whatsappMessagesLog } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * WhatsApp Admin Router
 * Manages WhatsApp bot settings, authorized groups, and usage statistics
 */
export const whatsappRouter = router({
  /**
   * Get all authorized groups
   */
  getAuthorizedGroups: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
        if (!db) throw new Error("Database connection failed");
      const groups = await db
        .select()
        .from(whatsappAuthorizedGroups)
        .orderBy(desc(whatsappAuthorizedGroups.lastActivityAt));

      return groups.map(g => ({
        id: g.id,
        groupChatId: g.groupChatId,
        groupName: g.groupName,
        isEnabled: g.isEnabled,
        createdAt: g.createdAt?.getTime() || 0,
        updatedAt: g.updatedAt?.getTime() || 0,
        lastActivityAt: g.lastActivityAt?.getTime() || 0,
        notes: g.notes || '',
      }));
    } catch (error) {
      console.error('[WhatsApp] Error fetching authorized groups:', error);
      throw new Error('Failed to fetch authorized groups');
    }
  }),

  /**
   * Get single group by ID
   */
  getGroupById: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        const groups = await db
          .select()
          .from(whatsappAuthorizedGroups)
          .where(eq(whatsappAuthorizedGroups.id as any, parseInt(input.groupId) as any));

        if (groups.length === 0) {
          return null;
        }

        const g = groups[0];
        return {
          id: g.id,
          groupChatId: g.groupChatId,
          groupName: g.groupName,
          isEnabled: g.isEnabled,
          createdAt: g.createdAt?.getTime() || 0,
          updatedAt: g.updatedAt?.getTime() || 0,
          lastActivityAt: g.lastActivityAt?.getTime() || 0,
          notes: g.notes || '',
        };
      } catch (error) {
        console.error('[WhatsApp] Error fetching group:', error);
        throw new Error('Failed to fetch group');
      }
    }),

  /**
   * Toggle group enable/disable
   */
  toggleGroupAccess: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        isEnabled: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        await db
          .update(whatsappAuthorizedGroups)
          .set({
            isEnabled: input.isEnabled,
            updatedAt: new Date(),
          })
          .where(eq(whatsappAuthorizedGroups.id as any, parseInt(input.groupId) as any));

        return {
          success: true,
          message: input.isEnabled
            ? 'Group enabled successfully'
            : 'Group disabled successfully',
        };
      } catch (error) {
        console.error('[WhatsApp] Error toggling group access:', error);
        throw new Error('Failed to toggle group access');
      }
    }),

  /**
   * Update group details
   */
  updateGroup: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        groupName: z.string().min(1),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        await db
          .update(whatsappAuthorizedGroups)
          .set({
            groupName: input.groupName,
            notes: input.notes || null,
            updatedAt: new Date(),
          })
          .where(eq(whatsappAuthorizedGroups.id as any, parseInt(input.groupId) as any));

        return {
          success: true,
          message: 'Group updated successfully',
        };
      } catch (error) {
        console.error('[WhatsApp] Error updating group:', error);
        throw new Error('Failed to update group');
      }
    }),

  /**
   * Delete group
   */
  deleteGroup: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        // Get group first to get chatId
        const groups = await db
          .select()
          .from(whatsappAuthorizedGroups)
          .where(eq(whatsappAuthorizedGroups.id as any, parseInt(input.groupId) as any));

        if (groups.length === 0) {
          throw new Error('Group not found');
        }

        const groupChatId = groups[0].groupChatId;

        // Delete message logs for this group
        await db
          .delete(whatsappMessagesLog)
          .where(eq(whatsappMessagesLog.groupChatId, groupChatId));

        // Delete group
        await db
          .delete(whatsappAuthorizedGroups)
          .where(eq(whatsappAuthorizedGroups.id as any, parseInt(input.groupId) as any));

        return {
          success: true,
          message: 'Group deleted successfully',
        };
      } catch (error) {
        console.error('[WhatsApp] Error deleting group:', error);
        throw new Error('Failed to delete group');
      }
    }),

  /**
   * Get group statistics
   */
  getGroupStatistics: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        // Get group info
        const groups = await db
          .select()
          .from(whatsappAuthorizedGroups)
          .where(eq(whatsappAuthorizedGroups.id as any, parseInt(input.groupId) as any));

        if (groups.length === 0) {
          throw new Error('Group not found');
        }

        const groupChatId = groups[0].groupChatId;

        // Get message logs
        const logs = await db
          .select()
          .from(whatsappMessagesLog)
          .where(eq(whatsappMessagesLog.groupChatId, groupChatId));

        // Calculate statistics
        const totalMessages = logs.length;
        const successCount = logs.filter(l => l.status === 'success').length;
        const errorCount = logs.filter(l => l.status === 'error').length;
        const unauthorizedCount = logs.filter(l => l.status === 'unauthorized').length;

        // Count by command type
        const commandCounts: Record<string, number> = {};
        logs.forEach(log => {
          if (log.commandType) {
            commandCounts[log.commandType] = (commandCounts[log.commandType] || 0) + 1;
          }
        });

        // Most used command
        const mostUsedCommand = Object.entries(commandCounts).sort(
          ([, a], [, b]) => b - a
        )[0];

        return {
          totalMessages,
          successCount,
          errorCount,
          unauthorizedCount,
          successRate: totalMessages > 0 ? (successCount / totalMessages) * 100 : 0,
          errorRate: totalMessages > 0 ? (errorCount / totalMessages) * 100 : 0,
          commandCounts,
          mostUsedCommand: mostUsedCommand ? mostUsedCommand[0] : null,
          mostUsedCommandCount: mostUsedCommand ? mostUsedCommand[1] : 0,
        };
      } catch (error) {
        console.error('[WhatsApp] Error getting group statistics:', error);
        throw new Error('Failed to get group statistics');
      }
    }),

  /**
   * Get all statistics
   */
  getAllStatistics: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
        if (!db) throw new Error("Database connection failed");

      // Get all logs
      const logs = await db.select().from(whatsappMessagesLog);

      // Get all groups
      const groups = await db.select().from(whatsappAuthorizedGroups);

      // Calculate statistics
      const totalMessages = logs.length;
      const successCount = logs.filter(l => l.status === 'success').length;
      const errorCount = logs.filter(l => l.status === 'error').length;
      const unauthorizedCount = logs.filter(l => l.status === 'unauthorized').length;

      // Count by command type
      const commandCounts: Record<string, number> = {};
      logs.forEach(log => {
        if (log.commandType) {
          commandCounts[log.commandType] = (commandCounts[log.commandType] || 0) + 1;
        }
      });

      // Count by group
      const groupCounts: Record<string, number> = {};
      logs.forEach(log => {
        groupCounts[log.groupChatId] = (groupCounts[log.groupChatId] || 0) + 1;
      });

      // Most used command
      const mostUsedCommand = Object.entries(commandCounts).sort(
        ([, a], [, b]) => b - a
      )[0];

      // Most active group
      const mostActiveGroup = Object.entries(groupCounts).sort(
        ([, a], [, b]) => b - a
      )[0];

      return {
        totalMessages,
        totalGroups: groups.length,
        enabledGroups: groups.filter(g => g.isEnabled).length,
        disabledGroups: groups.filter(g => !g.isEnabled).length,
        successCount,
        errorCount,
        unauthorizedCount,
        successRate: totalMessages > 0 ? (successCount / totalMessages) * 100 : 0,
        errorRate: totalMessages > 0 ? (errorCount / totalMessages) * 100 : 0,
        commandCounts,
        mostUsedCommand: mostUsedCommand ? mostUsedCommand[0] : null,
        mostUsedCommandCount: mostUsedCommand ? mostUsedCommand[1] : 0,
        groupCounts,
        mostActiveGroup: mostActiveGroup ? mostActiveGroup[0] : null,
        mostActiveGroupCount: mostActiveGroup ? mostActiveGroup[1] : 0,
      };
    } catch (error) {
      console.error('[WhatsApp] Error getting all statistics:', error);
      throw new Error('Failed to get statistics');
    }
  }),

  /**
   * Get message logs for group
   */
  getGroupMessageLogs: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        // Get group
        const groups = await db
          .select()
          .from(whatsappAuthorizedGroups)
          .where(eq(whatsappAuthorizedGroups.id as any, parseInt(input.groupId) as any));

        if (groups.length === 0) {
          throw new Error('Group not found');
        }

        const groupChatId = groups[0].groupChatId;

        // Get logs
        const logs = await db
          .select()
          .from(whatsappMessagesLog)
          .where(eq(whatsappMessagesLog.groupChatId, groupChatId))
          .orderBy(desc(whatsappMessagesLog.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return logs.map(log => ({
          id: log.id,
          groupChatId: log.groupChatId,
          senderPhoneNumber: log.senderPhoneNumber,
          messageText: log.messageText,
          commandType: log.commandType || '',
          responseText: log.responseText || '',
          status: log.status,
          errorMessage: log.errorMessage || '',
          createdAt: log.createdAt?.getTime() || 0,
        }));
      } catch (error) {
        console.error('[WhatsApp] Error getting message logs:', error);
        throw new Error('Failed to get message logs');
      }
    }),

  /**
   * Search message logs
   */
  searchMessageLogs: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        // Get all logs and filter in memory
        const logs = await db.select().from(whatsappMessagesLog);

        const filtered = logs.filter(
          log =>
            log.senderPhoneNumber.includes(input.query) ||
            log.messageText.toLowerCase().includes(input.query.toLowerCase()) ||
            log.commandType?.toLowerCase().includes(input.query.toLowerCase())
        );

        return filtered.slice(0, input.limit).map(log => ({
          id: log.id,
          groupChatId: log.groupChatId,
          senderPhoneNumber: log.senderPhoneNumber,
          messageText: log.messageText,
          commandType: log.commandType || '',
          responseText: log.responseText || '',
          status: log.status,
          errorMessage: log.errorMessage || '',
          createdAt: log.createdAt?.getTime() || 0,
        }));
      } catch (error) {
        console.error('[WhatsApp] Error searching message logs:', error);
        throw new Error('Failed to search message logs');
      }
    }),

  /**
   * Get webhook status
   */
  getWebhookStatus: protectedProcedure.query(async () => {
    try {
      // Check if webhook is configured
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const token = process.env.WHATSAPP_TOKEN;
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

      const isConfigured = !!(phoneNumberId && token && verifyToken);

      // Construct webhook URL
      const webhookUrl = `${process.env.VITE_APP_ID || 'https://your-domain.com'}/api/webhooks/whatsapp`;

      return {
        isConfigured,
        webhookUrl,
        phoneNumberId: phoneNumberId ? '***' : 'Not configured',
        hasToken: !!token,
        hasVerifyToken: !!verifyToken,
      };
    } catch (error) {
      console.error('[WhatsApp] Error getting webhook status:', error);
      throw new Error('Failed to get webhook status');
    }
  }),

  /**
   * Add new authorized group
   */
  addAuthorizedGroup: protectedProcedure
    .input(
      z.object({
        groupChatId: z.string(),
        groupName: z.string().min(1),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        // Check if group already exists
        const existing = await db
          .select()
          .from(whatsappAuthorizedGroups)
          .where(eq(whatsappAuthorizedGroups.groupChatId as any, input.groupChatId as any));
        
        if (existing.length > 0) {
          throw new Error('Group already authorized');
        }
        
        // Insert group and let database auto-generate ID
        const result = await db.insert(whatsappAuthorizedGroups).values({
          groupChatId: input.groupChatId,
          groupName: input.groupName,
          notes: input.notes || null,
          isEnabled: true,
        });

        return {
          success: true,
          message: 'Group added successfully',
          groupId: result.insertId,
        };
      } catch (error) {
        console.error('[WhatsApp] Error adding group:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to add group');
      }
    }),

  /**
   * Enable group
   */
  enableGroup: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        await db
          .update(whatsappAuthorizedGroups)
          .set({
            isEnabled: true,
            updatedAt: new Date(),
          })
          .where(eq(whatsappAuthorizedGroups.id as any, parseInt(input.groupId) as any));

        return {
          success: true,
          message: 'Group enabled successfully',
        };
      } catch (error) {
        console.error('[WhatsApp] Error enabling group:', error);
        throw new Error('Failed to enable group');
      }
    }),

  /**
   * Disable group
   */
  disableGroup: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        await db
          .update(whatsappAuthorizedGroups)
          .set({
            isEnabled: false,
            updatedAt: new Date(),
          })
          .where(eq(whatsappAuthorizedGroups.id as any, parseInt(input.groupId) as any));

        return {
          success: true,
          message: 'Group disabled successfully',
        };
      } catch (error) {
        console.error('[WhatsApp] Error disabling group:', error);
        throw new Error('Failed to disable group');
      }
    }),

  /**
   * Get statistics (alias for getAllStatistics)
   */
  getStatistics: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
        if (!db) throw new Error("Database connection failed");

      // Get all logs
      const logs = await db.select().from(whatsappMessagesLog);

      // Get all groups
      const groups = await db.select().from(whatsappAuthorizedGroups);

      // Calculate statistics
      const totalMessages = logs.length;
      const successCount = logs.filter(l => l.status === 'success').length;
      const errorCount = logs.filter(l => l.status === 'error').length;
      const unauthorizedCount = logs.filter(l => l.status === 'unauthorized').length;

      // Count by command type
      const commandCounts: Record<string, number> = {};
      logs.forEach(log => {
        if (log.commandType) {
          commandCounts[log.commandType] = (commandCounts[log.commandType] || 0) + 1;
        }
      });

      // Count by group
      const groupCounts: Record<string, number> = {};
      logs.forEach(log => {
        groupCounts[log.groupChatId] = (groupCounts[log.groupChatId] || 0) + 1;
      });

      // Most used command
      const mostUsedCommand = Object.entries(commandCounts).sort(
        ([, a], [, b]) => b - a
      )[0];

      // Most active group
      const mostActiveGroup = Object.entries(groupCounts).sort(
        ([, a], [, b]) => b - a
      )[0];

      return {
        totalMessages,
        totalGroups: groups.length,
        enabledGroups: groups.filter(g => g.isEnabled).length,
        disabledGroups: groups.filter(g => !g.isEnabled).length,
        successCount,
        errorCount,
        unauthorizedCount,
        successRate: totalMessages > 0 ? (successCount / totalMessages) * 100 : 0,
        errorRate: totalMessages > 0 ? (errorCount / totalMessages) * 100 : 0,
        commandCounts,
        mostUsedCommand: mostUsedCommand ? mostUsedCommand[0] : null,
        mostUsedCommandCount: mostUsedCommand ? mostUsedCommand[1] : 0,
        groupCounts,
        mostActiveGroup: mostActiveGroup ? mostActiveGroup[0] : null,
        mostActiveGroupCount: mostActiveGroup ? mostActiveGroup[1] : 0,
      };
    } catch (error) {
      console.error('[WhatsApp] Error getting statistics:', error);
      throw new Error('Failed to get statistics');
    }
  }),

  /**
   * Test webhook connectivity
   */
  /**
   * Send test message to a group
   */
  sendTestMessage: protectedProcedure
    .input(
      z.object({
        groupChatId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Import bot service
        const { getBot, isBotReady } = await import('../services/whatsappBotService');
        
        // Check if bot is ready
        if (!isBotReady()) {
          return {
            success: false,
            message: 'Bot is not connected. Please authenticate the bot first by scanning the QR code in the Bot Authentication tab.',
          };
        }

        // Get bot client
        const bot = getBot();
        if (!bot) {
          return {
            success: false,
            message: 'Bot client is not initialized',
          };
        }

        // Validate group chat ID format
        if (!input.groupChatId.includes('@g.us')) {
          return {
            success: false,
            message: 'Invalid group chat ID format. Expected format: 120363123456789@g.us',
          };
        }

        // Create test message
        const testMessage = `🤖 *WhatsApp Bot Test Message*

Hello! This is a test message from the Bolted Iron Hub WhatsApp Bot.

✅ Bot is connected and working!

You can now use commands like:
• /help - Show available commands
• /project - Get project information
• /status - Get project status
• /list - List all projects
• /weekly - Get weekly schedule
• /pending - Get pending projects
• /report - Get project report

Test sent at: ${new Date().toLocaleString()}`;

        // Send message via bot client
        try {
          await bot.sendMessage(input.groupChatId, testMessage);

          console.log('[WhatsApp] Test message sent successfully', {
            groupChatId: input.groupChatId,
            timestamp: new Date().toISOString(),
          });

          return {
            success: true,
            message: 'Test message sent successfully! Check your WhatsApp group.',
          };
        } catch (sendError) {
          const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown error';
          console.error('[WhatsApp] Error sending test message:', errorMessage);
          
          return {
            success: false,
            message: `Failed to send message: ${errorMessage}`,
          };
        }
      } catch (error) {
        console.error('[WhatsApp] Error in sendTestMessage:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to send test message',
        };
      }
    }),

  testWebhook: protectedProcedure.mutation(async () => {
    try {
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const token = process.env.WHATSAPP_TOKEN;

      if (!phoneNumberId || !token) {
        return {
          success: false,
          message: 'WhatsApp credentials not configured',
        };
      }

      // Try to make a test API call
      const response = await fetch(
        `https://graph.instagram.com/v18.0/${phoneNumberId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        return {
          success: true,
          message: 'Webhook connectivity test passed',
        };
      } else {
        return {
          success: false,
          message: `API returned status ${response.status}`,
        };
      }
    } catch (error) {
      console.error('[WhatsApp] Error testing webhook:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Test failed',
      };
    }
  }),
});
