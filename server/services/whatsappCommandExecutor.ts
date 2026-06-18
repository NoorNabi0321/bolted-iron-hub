/**
 * WhatsApp Command Executor
 * Integrates command router with handlers
 */

import { routeCommand } from './whatsappCommandRouter';
import { executeCommandHandler } from './whatsappCommandHandlers';

/**
 * Execution result
 */
export interface CommandExecutionResult {
  success: boolean;
  commandType: string | null | undefined;
  message: string;
  error?: string | undefined;
}

/**
 * Execute a WhatsApp message as a command
 * @param messageText - Raw message text from WhatsApp
 * @returns Execution result with response message
 */
export async function executeWhatsAppCommand(messageText: string): Promise<CommandExecutionResult> {
  try {
    // Route the command
    const routing = await routeCommand(messageText);

    // If routing failed, return error
    if (!routing.isValid) {
      const errorResult: CommandExecutionResult = {
        success: false,
        commandType: undefined,
        message: routing.errorMessage || 'Invalid command',
        error: routing.errorMessage || undefined,
      };
      return errorResult;
    }

    // Execute the handler
    const commandType = routing.commandType || 'help';
    const handlerResult = await executeCommandHandler(
      commandType,
      routing.projectName || undefined
    );

    const result: CommandExecutionResult = {
      success: true,
      commandType: routing.commandType as any,
      message: handlerResult,
    };
    return result;
  } catch (error) {
    console.error('[WhatsApp] Error executing command:', error);
    return {
      success: false,
      commandType: undefined,
      message: '❌ An unexpected error occurred. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a WhatsApp message and get response
 * @param messageText - Raw message text
 * @returns Response message for WhatsApp
 */
export async function processWhatsAppMessage(messageText: string): Promise<string> {
  const result = await executeWhatsAppCommand(messageText);
  return result.message;
}

/**
 * Check if message is a command
 * @param messageText - Message text to check
 * @returns boolean - True if message is a command
 */
export async function isWhatsAppCommand(messageText: string): Promise<boolean> {
  try {
    const result = await executeWhatsAppCommand(messageText);
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Get command type from message
 * @param messageText - Message text
 * @returns Command type or null
 */
export async function getCommandTypeFromMessage(messageText: string): Promise<string | null | undefined> {
  const routing = await routeCommand(messageText);
  return routing.commandType;
}

/**
 * Validate command before execution
 * @param messageText - Message text to validate
 * @returns Validation result
 */
export async function validateCommand(messageText: string): Promise<{
  isValid: boolean;
  commandType: string | null | undefined;
  error?: string;
}> {
  const routing = await routeCommand(messageText);

  return {
    isValid: routing.isValid,
    commandType: routing.commandType,
    error: routing.errorMessage || undefined,
  };
}

/**
 * Execute command with logging
 * @param messageText - Message text
 * @param groupChatId - WhatsApp group chat ID
 * @param senderPhone - Sender phone number
 * @returns Execution result with logging
 */
export async function executeCommandWithLogging(
  messageText: string,
  groupChatId: string,
  senderPhone: string
): Promise<CommandExecutionResult> {
  const startTime = Date.now();

  try {
    const result = await executeWhatsAppCommand(messageText);

    const duration = Date.now() - startTime;

    console.log('[WhatsApp] Command executed', {
      groupChatId,
      senderPhone,
      commandType: result.commandType,
      success: result.success,
      duration: `${duration}ms`,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('[WhatsApp] Command execution failed', {
      groupChatId,
      senderPhone,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    });

    return {
      success: false,
      commandType: null,
      message: '❌ An error occurred while processing your command.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch execute multiple commands
 * @param messages - Array of message texts
 * @returns Array of execution results
 */
export async function batchExecuteCommands(messages: string[]): Promise<CommandExecutionResult[]> {
  return Promise.all(messages.map(msg => executeWhatsAppCommand(msg)));
}

/**
 * Get command statistics
 * @param messages - Array of message texts
 * @returns Statistics object
 */
export async function getCommandStatistics(messages: string[]): Promise<{
  totalMessages: number;
  validCommands: number;
  invalidMessages: number;
  commandTypes: Record<string, number>;
}> {
  const results = await batchExecuteCommands(messages);

  const stats = {
    totalMessages: messages.length,
    validCommands: 0,
    invalidMessages: 0,
    commandTypes: {} as Record<string, number>,
  };

  for (const result of results) {
    if (result.success) {
      stats.validCommands++;
      if (result.commandType) {
        stats.commandTypes[result.commandType] = (stats.commandTypes[result.commandType] || 0) + 1;
      }
    } else {
      stats.invalidMessages++;
    }
  }

  return stats;
}
