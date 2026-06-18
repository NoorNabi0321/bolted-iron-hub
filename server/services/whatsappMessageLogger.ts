/**
 * WhatsApp Message Logger
 * Logs message events to database for audit trail and analytics
 */

import { getDb } from '../db';
import { whatsappMessagesLog } from '../../drizzle/schema';
import { eq, desc, lt } from 'drizzle-orm';

/**
 * Message log entry interface
 */
export interface MessageLogEntry {
  groupChatId: string;
  senderPhoneNumber: string;
  messageText: string;
  status: 'success' | 'error' | 'unauthorized';
  commandType: string | null;
  responseText: string;
  errorMessage: string | null;
}

/**
 * Log a message event to the database
 * @param entry - Message log entry
 */
export async function logMessageEvent(entry: MessageLogEntry): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn('[WhatsApp Logger] Database connection not available');
      return;
    }

    await db.insert(whatsappMessagesLog).values({
      groupChatId: entry.groupChatId,
      senderPhoneNumber: entry.senderPhoneNumber,
      messageText: entry.messageText,
      status: entry.status,
      commandType: entry.commandType,
      responseText: entry.responseText,
      errorMessage: entry.errorMessage,
      createdAt: new Date(),
    });

    console.log('[WhatsApp Logger] Message event logged', {
      groupChatId: entry.groupChatId,
      senderPhone: entry.senderPhoneNumber,
      status: entry.status,
      commandType: entry.commandType,
    });
  } catch (error) {
    console.error('[WhatsApp Logger] Error logging message event:', error);
    // Don't throw - logging failures shouldn't break message processing
  }
}

/**
 * Get message logs for a group
 * @param groupChatId - WhatsApp group chat ID
 * @param limit - Maximum number of logs to retrieve
 */
export async function getGroupMessageLogs(
  groupChatId: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) {
      return [];
    }

    const logs = await db
      .select()
      .from(whatsappMessagesLog)
      .where(eq(whatsappMessagesLog.groupChatId, groupChatId))
      .orderBy(desc(whatsappMessagesLog.createdAt))
      .limit(limit);

    return logs;
  } catch (error) {
    console.error('[WhatsApp Logger] Error retrieving message logs:', error);
    return [];
  }
}

/**
 * Get message logs by status
 * @param status - Message status filter
 * @param limit - Maximum number of logs to retrieve
 */
export async function getMessageLogsByStatus(
  status: 'success' | 'error' | 'unauthorized',
  limit: number = 100
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) {
      return [];
    }

    const logs = await db
      .select()
      .from(whatsappMessagesLog)
      .where(eq(whatsappMessagesLog.status, status))
      .orderBy(desc(whatsappMessagesLog.createdAt))
      .limit(limit);

    return logs;
  } catch (error) {
    console.error('[WhatsApp Logger] Error retrieving logs by status:', error);
    return [];
  }
}

/**
 * Get message logs by command type
 * @param commandType - Command type filter
 * @param limit - Maximum number of logs to retrieve
 */
export async function getMessageLogsByCommand(
  commandType: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) {
      return [];
    }

    const logs = await db
      .select()
      .from(whatsappMessagesLog)
      .where(eq(whatsappMessagesLog.commandType, commandType))
      .orderBy(desc(whatsappMessagesLog.createdAt))
      .limit(limit);

    return logs;
  } catch (error) {
    console.error('[WhatsApp Logger] Error retrieving logs by command:', error);
    return [];
  }
}

/**
 * Get message logs for a sender
 * @param senderPhone - Sender phone number
 * @param limit - Maximum number of logs to retrieve
 */
export async function getSenderMessageLogs(
  senderPhone: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) {
      return [];
    }

    const logs = await (db as any)
      .select()
      .from(whatsappMessagesLog)
      .where((t: any) => t.senderPhoneNumber === senderPhone)
      .orderBy((t: any) => t.createdAt, 'desc')
      .limit(limit);

    return logs;
  } catch (error) {
    console.error('[WhatsApp Logger] Error retrieving sender logs:', error);
    return [];
  }
}

/**
 * Clear old message logs (older than specified days)
 * @param daysOld - Delete logs older than this many days
 */
export async function clearOldMessageLogs(daysOld: number = 30): Promise<number> {
  try {
    const db = await getDb();
    if (!db) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db
      .delete(whatsappMessagesLog)
      .where(lt(whatsappMessagesLog.createdAt, cutoffDate));

    console.log('[WhatsApp Logger] Old message logs cleared', {
      cutoffDate,
      daysOld,
    });

    return 0; // Return count if available
  } catch (error) {
    console.error('[WhatsApp Logger] Error clearing old logs:', error);
    return 0;
  }
}

/**
 * Get message statistics
 */
export async function getMessageStatistics(): Promise<{
  totalMessages: number;
  successCount: number;
  errorCount: number;
  unauthorizedCount: number;
  uniqueGroups: number;
  uniqueSenders: number;
}> {
  try {
    const db = await getDb();
    if (!db) {
      return {
        totalMessages: 0,
        successCount: 0,
        errorCount: 0,
        unauthorizedCount: 0,
        uniqueGroups: 0,
        uniqueSenders: 0,
      };
    }

    const allLogs = await db.select().from(whatsappMessagesLog);

    const stats = {
      totalMessages: allLogs.length,
      successCount: allLogs.filter((l: any) => l.status === 'success').length,
      errorCount: allLogs.filter((l: any) => l.status === 'error').length,
      unauthorizedCount: allLogs.filter((l: any) => l.status === 'unauthorized').length,
      uniqueGroups: new Set(allLogs.map((l: any) => l.groupChatId)).size,
      uniqueSenders: new Set(allLogs.map((l: any) => l.senderPhoneNumber)).size,
    };

    return stats;
  } catch (error) {
    console.error('[WhatsApp Logger] Error retrieving statistics:', error);
    return {
      totalMessages: 0,
      successCount: 0,
      errorCount: 0,
      unauthorizedCount: 0,
      uniqueGroups: 0,
      uniqueSenders: 0,
    };
  }
}
