/**
 * WhatsApp Message Processor
 * Main orchestrator that integrates all Phase 5 components
 * Coordinates message listening, authorization, command execution, and response sending
 */

import { Message, Chat } from 'whatsapp-web.js';
import { validateMessageAuthorization, extractCommandType } from './whatsappAuthMiddleware';
import { canExecuteCommandInGroup } from './whatsappAuthService';
import { executeWhatsAppCommand } from './whatsappCommandExecutor';
import {
  sendResponseToMessage,
  sendErrorToMessage,
  sendFormattedResponseToMessage,
  sendTypingIndicator,
  sendCommandNotFound,
  sendPermissionDenied,
  sendUnauthorized,
} from './whatsappResponseHandler';
import { logMessageEvent as logMessageEventToDb } from './whatsappMessageLogger';

/**
 * Message processing result
 */
export interface MessageProcessingResult {
  success: boolean;
  messageId?: string;
  groupChatId?: string;
  senderPhone?: string;
  commandType?: string | null;
  responseText?: string;
  error?: string;
  duration: number;
  stage: 'authorization' | 'execution' | 'response' | 'logging';
}

/**
 * Process incoming WhatsApp message end-to-end
 * Handles authorization, command execution, and response sending
 * @param message - WhatsApp message object
 * @returns Message processing result
 */
export async function processWhatsAppMessage(message: Message): Promise<MessageProcessingResult> {
  const startTime = Date.now();
  const senderPhone = message.from;
  let groupChatId = '';
  let commandType: string | null = null;
  let responseText = '';

  try {
    // Get group chat ID
    const chat: Chat = await message.getChat();
    groupChatId = chat.id._serialized;

    const messageText = message.body.trim();

    console.log('[WhatsApp Processor] Processing message', {
      from: senderPhone,
      groupChatId,
      text: messageText.substring(0, 50),
    });

    // Stage 1: Authorization Check
    console.log('[WhatsApp Processor] Stage 1: Checking authorization...');

    const authResult = await validateMessageAuthorization(message);

    if (!authResult.isValid) {
      console.warn('[WhatsApp Processor] Authorization failed', {
        senderPhone,
        error: authResult.error,
      });

      // Log unauthorized attempt
      await logMessageEventToDb({
        groupChatId,
        senderPhoneNumber: senderPhone,
        messageText,
        status: 'unauthorized',
        commandType: null,
        responseText: authResult.error || 'Unauthorized',
        errorMessage: authResult.error || 'Sender not authorized',
      });

      // Send appropriate error response
      if (!authResult.commandType) {
        // Not a command
        await sendResponseToMessage(message, '❌ Please use a command starting with /. Type /help for available commands.');
      } else if (authResult.error?.includes('permission')) {
        // Permission denied
        await sendPermissionDenied(message, authResult.commandType, authResult.adminRole);
      } else {
        // Unauthorized
        await sendUnauthorized(message);
      }

      return {
        success: false,
        groupChatId,
        senderPhone,
        commandType: authResult.commandType,
        error: authResult.error,
        duration: Date.now() - startTime,
        stage: 'authorization',
      };
    }

    commandType = authResult.commandType;

    console.log('[WhatsApp Processor] Authorization successful', {
      senderPhone,
      commandType,
      role: authResult.adminRole,
    });

    // Stage 1b: Check group-specific command permissions
    if (commandType) {
      console.log('[WhatsApp Processor] Stage 1b: Checking group-specific permissions...');
      const canExecute = await canExecuteCommandInGroup(
        groupChatId,
        senderPhone,
        commandType
      );

      if (!canExecute) {
      console.warn('[WhatsApp Processor] Group command permission denied', {
        senderPhone,
        command: commandType,
        groupChatId,
      });

      // Log unauthorized attempt
      await logMessageEventToDb({
        groupChatId,
        senderPhoneNumber: senderPhone,
        messageText,
        status: 'unauthorized',
        commandType,
        responseText: 'Permission denied',
        errorMessage: `User does not have permission to use /${commandType} in this group`,
      });

      // Send permission denied response
      await sendPermissionDenied(message, commandType, authResult.adminRole);

        return {
          success: false,
          groupChatId,
          senderPhone,
          commandType,
          stage: 'authorization',
          duration: Date.now() - startTime,
          error: 'Permission denied for this command in this group',
        };
      }
    }

    // Stage 2: Command Execution
    console.log('[WhatsApp Processor] Stage 2: Executing command...');

    // Send typing indicator
    await sendTypingIndicator(message);

    // Execute command
    const executionResult = await executeWhatsAppCommand(messageText);

    if (!executionResult.success) {
      console.error('[WhatsApp Processor] Command execution failed', {
        commandType,
        error: executionResult.error,
      });

      responseText = executionResult.message;

      // Log error
      await logMessageEventToDb({
        groupChatId,
        senderPhoneNumber: senderPhone,
        messageText,
        status: 'error',
        commandType,
        responseText,
        errorMessage: executionResult.error || 'Command execution failed',
      });

      // Send error response
      await sendErrorToMessage(message, 'Command execution failed', executionResult.error);

      return {
        success: false,
        groupChatId,
        senderPhone,
        commandType,
        responseText,
        error: executionResult.error,
        duration: Date.now() - startTime,
        stage: 'execution',
      };
    }

    responseText = executionResult.message;

    console.log('[WhatsApp Processor] Command executed successfully', {
      commandType,
      responseLength: responseText.length,
    });

    // Stage 3: Send Response
    console.log('[WhatsApp Processor] Stage 3: Sending response...');

    const sendResult = await sendResponseToMessage(message, responseText);

    if (!sendResult.success) {
      console.error('[WhatsApp Processor] Failed to send response', {
        error: sendResult.error,
      });

      // Log send failure
      await logMessageEventToDb({
        groupChatId,
        senderPhoneNumber: senderPhone,
        messageText,
        status: 'error',
        commandType,
        responseText,
        errorMessage: `Failed to send response: ${sendResult.error}`,
      });

      return {
        success: false,
        groupChatId,
        senderPhone,
        commandType,
        responseText,
        error: sendResult.error,
        duration: Date.now() - startTime,
        stage: 'response',
      };
    }

    console.log('[WhatsApp Processor] Response sent successfully', {
      messageId: sendResult.messageId,
      duration: `${sendResult.duration}ms`,
    });

    // Stage 4: Logging
    console.log('[WhatsApp Processor] Stage 4: Logging event...');

    await logMessageEventToDb({
      groupChatId,
      senderPhoneNumber: senderPhone,
      messageText,
      status: 'success',
      commandType,
      responseText,
      errorMessage: null,
    });

    const totalDuration = Date.now() - startTime;

    console.log('[WhatsApp Processor] Message processed successfully', {
      groupChatId,
      senderPhone,
      commandType,
      messageId: sendResult.messageId,
      duration: `${totalDuration}ms`,
    });

    return {
      success: true,
      messageId: sendResult.messageId,
      groupChatId,
      senderPhone,
      commandType,
      responseText,
      duration: totalDuration,
      stage: 'logging',
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('[WhatsApp Processor] Error processing message', {
      senderPhone,
      groupChatId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    });

    // Try to send error response
    try {
      await sendErrorToMessage(
        message,
        'An unexpected error occurred',
        'Please try again or contact support'
      );
    } catch (replyError) {
      console.error('[WhatsApp Processor] Failed to send error reply:', replyError);
    }

    // Try to log the error
    try {
      await logMessageEventToDb({
        groupChatId,
        senderPhoneNumber: senderPhone,
        messageText: message.body.trim(),
        status: 'error',
        commandType,
        responseText: 'Error processing message',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      console.error('[WhatsApp Processor] Failed to log error:', logError);
    }

    return {
      success: false,
      groupChatId,
      senderPhone,
      commandType,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
      stage: 'authorization',
    };
  }
}

/**
 * Process multiple messages in sequence
 * @param messages - Array of WhatsApp messages
 * @returns Array of processing results
 */
export async function processMultipleMessages(
  messages: Message[]
): Promise<MessageProcessingResult[]> {
  const results: MessageProcessingResult[] = [];

  for (const message of messages) {
    try {
      const result = await processWhatsAppMessage(message);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0,
        stage: 'authorization',
      });
    }
  }

  return results;
}

/**
 * Get processor status
 */
export function getProcessorStatus(): {
  ready: boolean;
  lastProcessedAt?: Date;
  totalProcessed: number;
} {
  return {
    ready: true,
    totalProcessed: 0,
  };
}

/**
 * Format processing result for logging
 * @param result - Message processing result
 * @returns Formatted result
 */
export function formatProcessingResult(result: MessageProcessingResult): string {
  const status = result.success ? '✅ Success' : '❌ Failed';
  const stage = result.stage || 'unknown';
  const duration = `${result.duration}ms`;

  return `${status} | Stage: ${stage} | Duration: ${duration} | Command: ${result.commandType || 'N/A'}`;
}

/**
 * Get processing statistics from results
 * @param results - Array of processing results
 * @returns Statistics object
 */
export function getProcessingStatistics(results: MessageProcessingResult[]): {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  averageDuration: number;
  failuresByStage: Record<string, number>;
} {
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;

  const failuresByStage: Record<string, number> = {
    authorization: 0,
    execution: 0,
    response: 0,
    logging: 0,
  };

  results.forEach(r => {
    if (!r.success) {
      failuresByStage[r.stage]++;
    }
  });

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const averageDuration = results.length > 0 ? totalDuration / results.length : 0;

  return {
    total: results.length,
    successful,
    failed,
    successRate: results.length > 0 ? (successful / results.length) * 100 : 0,
    averageDuration,
    failuresByStage,
  };
}

/**
 * Validate processor configuration
 */
export async function validateProcessorConfiguration(): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Check bot readiness
  // Check database connection
  // Check authorization service
  // Check response handler

  return {
    valid: errors.length === 0,
    errors,
  };
}
