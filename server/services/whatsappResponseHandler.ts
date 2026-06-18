/**
 * WhatsApp Response Handler
 * Handles sending responses to WhatsApp messages
 */

import { Message, Chat } from 'whatsapp-web.js';
import { getBot, isBotReady } from './whatsappBotService';
import {
  formatErrorMessage,
  formatCompleteMessage,
  checkMessageLimits,
} from './whatsappResponseFormatter';

/**
 * Response handler result
 */
export interface ResponseHandlerResult {
  success: boolean;
  messageId?: string;
  error?: string;
  duration: number;
}

/**
 * Send response to WhatsApp message
 * @param message - Original WhatsApp message
 * @param responseText - Response text to send
 * @returns Response handler result
 */
export async function sendResponseToMessage(
  message: Message,
  responseText: string
): Promise<ResponseHandlerResult> {
  const startTime = Date.now();

  try {
    if (!isBotReady()) {
      throw new Error('Bot is not ready');
    }

    // Validate message length
    const validation = checkMessageLimits(responseText);
    if (!validation.withinLimit) {
      return {
        success: false,
        error: `Response too long (${validation.length} chars, limit: ${validation.limit})`,
        duration: Date.now() - startTime,
      };
    }

    // Send reply
    const sentMessage = await message.reply(responseText);

    console.log('[WhatsApp Response] Response sent successfully', {
      messageId: sentMessage.id._serialized,
      responseLength: responseText.length,
      duration: `${Date.now() - startTime}ms`,
    });

    return {
      success: true,
      messageId: sentMessage.id._serialized,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[WhatsApp Response] Error sending response:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send response',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Send error response to message
 * @param message - Original WhatsApp message
 * @param errorMessage - Error message
 * @param suggestion - Helpful suggestion
 * @returns Response handler result
 */
export async function sendErrorToMessage(
  message: Message,
  errorMessage: string,
  suggestion?: string
): Promise<ResponseHandlerResult> {
  const startTime = Date.now();

  try {
    const formattedError = formatErrorMessage(errorMessage, suggestion);
    return sendResponseToMessage(message, formattedError);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send error response',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Send formatted response to message
 * @param message - Original WhatsApp message
 * @param title - Response title
 * @param content - Response content
 * @param footer - Optional footer text
 * @returns Response handler result
 */
export async function sendFormattedResponseToMessage(
  message: Message,
  title: string,
  content: string,
  footer?: string
): Promise<ResponseHandlerResult> {
  const startTime = Date.now();

  try {
    const formattedResponse = formatCompleteMessage(title, content, footer);
    return sendResponseToMessage(message, formattedResponse);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send formatted response',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Send response to group
 * @param groupChatId - WhatsApp group chat ID
 * @param responseText - Response text
 * @returns Response handler result
 */
export async function sendResponseToGroup(
  groupChatId: string,
  responseText: string
): Promise<ResponseHandlerResult> {
  const startTime = Date.now();

  try {
    if (!isBotReady()) {
      throw new Error('Bot is not ready');
    }

    // Validate message length
    const validation = checkMessageLimits(responseText);
    if (!validation.withinLimit) {
      return {
        success: false,
        error: `Response too long (${validation.length} chars, limit: ${validation.limit})`,
        duration: Date.now() - startTime,
      };
    }

    const bot = getBot();
    if (!bot) {
      return {
        success: false,
        error: 'Bot client is not initialized',
        duration: Date.now() - startTime,
      };
    }
    const sentMessage = await bot.sendMessage(groupChatId, responseText);

    console.log('[WhatsApp Response] Group message sent successfully', {
      groupChatId,
      messageId: sentMessage.id._serialized,
      responseLength: responseText.length,
      duration: `${Date.now() - startTime}ms`,
    });

    return {
      success: true,
      messageId: sentMessage.id._serialized,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[WhatsApp Response] Error sending group response:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send group response',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Send error response to group
 * @param groupChatId - WhatsApp group chat ID
 * @param errorMessage - Error message
 * @param suggestion - Helpful suggestion
 * @returns Response handler result
 */
export async function sendErrorToGroup(
  groupChatId: string,
  errorMessage: string,
  suggestion?: string
): Promise<ResponseHandlerResult> {
  const startTime = Date.now();

  try {
    const formattedError = formatErrorMessage(errorMessage, suggestion);
    return sendResponseToGroup(groupChatId, formattedError);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send error to group',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Send formatted response to group
 * @param groupChatId - WhatsApp group chat ID
 * @param title - Response title
 * @param content - Response content
 * @param footer - Optional footer text
 * @returns Response handler result
 */
export async function sendFormattedResponseToGroup(
  groupChatId: string,
  title: string,
  content: string,
  footer?: string
): Promise<ResponseHandlerResult> {
  const startTime = Date.now();

  try {
    const formattedResponse = formatCompleteMessage(title, content, footer);
    return sendResponseToGroup(groupChatId, formattedResponse);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send formatted response to group',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Send batch responses to group
 * @param groupChatId - WhatsApp group chat ID
 * @param responses - Array of response texts
 * @returns Array of response handler results
 */
export async function sendBatchResponsesToGroup(
  groupChatId: string,
  responses: string[]
): Promise<ResponseHandlerResult[]> {
  const results: ResponseHandlerResult[] = [];

  for (const response of responses) {
    try {
      const result = await sendResponseToGroup(groupChatId, response);
      results.push(result);

      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send response',
        duration: 0,
      });
    }
  }

  return results;
}

/**
 * Send typing indicator to message
 * @param message - Original WhatsApp message
 */
export async function sendTypingIndicator(message: Message): Promise<void> {
  try {
    if (!isBotReady()) {
      return;
    }

    const chat: Chat = await message.getChat();
    await chat.sendStateTyping();
  } catch (error) {
    console.error('[WhatsApp Response] Error sending typing indicator:', error);
  }
}

/**
 * Send read receipt for message
 * @param message - Original WhatsApp message
 */
export async function sendReadReceipt(message: Message): Promise<void> {
  try {
    if (!isBotReady()) {
      return;
    }

    await message.react('👍');
  } catch (error) {
    console.error('[WhatsApp Response] Error sending read receipt:', error);
  }
}

/**
 * Send help message to message
 * @param message - Original WhatsApp message
 * @returns Response handler result
 */
export async function sendHelpToMessage(message: Message): Promise<ResponseHandlerResult> {
  const helpText = `*📋 Bolted Iron Hub Bot Commands*

*Available Commands:*

1. /help - Show this message
2. /status - Get project status
3. /list - List all projects
4. /project <name> - Get project details
5. /weekly - Get weekly schedule
6. /pending - Get pending projects
7. /report [type] - Generate report

*Examples:*
/project 610 dekalb
/report active
/weekly

Type /help for more information`;

  return sendFormattedResponseToMessage(message, '📋 Bot Commands', helpText);
}

/**
 * Send command not found message
 * @param message - Original WhatsApp message
 * @param commandType - Unknown command type
 * @returns Response handler result
 */
export async function sendCommandNotFound(
  message: Message,
  commandType: string
): Promise<ResponseHandlerResult> {
  return sendErrorToMessage(
    message,
    `Unknown command: /${commandType}`,
    'Type /help for available commands'
  );
}

/**
 * Send permission denied message
 * @param message - Original WhatsApp message
 * @param commandType - Command type
 * @param role - Admin role
 * @returns Response handler result
 */
export async function sendPermissionDenied(
  message: Message,
  commandType: string,
  role?: string
): Promise<ResponseHandlerResult> {
  const suggestion = role
    ? `Your role (${role}) doesn't have permission for this command`
    : 'You don\'t have permission for this command';

  return sendErrorToMessage(message, `Permission denied for /${commandType}`, suggestion);
}

/**
 * Send unauthorized message
 * @param message - Original WhatsApp message
 * @returns Response handler result
 */
export async function sendUnauthorized(message: Message): Promise<ResponseHandlerResult> {
  return sendErrorToMessage(
    message,
    'You are not authorized to use this bot',
    'Contact an administrator for access'
  );
}

/**
 * Format response with command metadata
 * @param commandType - Command type
 * @param responseText - Response text
 * @returns Formatted response
 */
export function formatCommandResponse(commandType: string, responseText: string): string {
  return formatCompleteMessage(
    `📋 ${commandType.toUpperCase()} Response`,
    responseText,
    'Use /help for more commands'
  );
}

/**
 * Check if response can be sent
 * @returns boolean
 */
export function canSendResponse(): boolean {
  return isBotReady();
}

/**
 * Get response handler status
 * @returns Status object
 */
export function getResponseHandlerStatus(): {
  canSend: boolean;
  botReady: boolean;
} {
  return {
    canSend: canSendResponse(),
    botReady: isBotReady(),
  };
}
