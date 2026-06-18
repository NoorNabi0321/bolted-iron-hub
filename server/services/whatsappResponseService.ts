/**
 * WhatsApp Response Service
 * Integrates response formatting and message sending
 */

import {
  formatResponseMessage,
  formatErrorMessage,
  formatCompleteMessage,
  checkMessageLimits,
} from './whatsappResponseFormatter';
import {
  sendGroupMessage,
  sendIndividualMessage,
  sendFormattedMessage,
  validateMessage,
} from './whatsappMessageSender';
import { executeWhatsAppCommand } from './whatsappCommandExecutor';

/**
 * Full response result
 */
export interface FullResponseResult {
  success: boolean;
  messageId?: string;
  message: string;
  commandType?: string | null;
  sentAt: number;
  error?: string;
}

/**
 * Handle WhatsApp message and send response
 * @param groupChatId - WhatsApp group chat ID
 * @param messageText - Incoming message text
 * @returns Response result
 */
export async function handleWhatsAppMessageAndRespond(
  groupChatId: string,
  messageText: string
): Promise<FullResponseResult> {
  const startTime = Date.now();

  try {
    // Execute the command
    const commandResult = await executeWhatsAppCommand(messageText);

    // Format the response
    const formattedMessage = formatCompleteMessage(
      '📱 WhatsApp Bot Response',
      commandResult.message,
      'Use /help for available commands'
    );

    // Validate message
    const validation = validateMessage(formattedMessage);

    if (!validation.valid) {
      return {
        success: false,
        message: formatErrorMessage(
          'Response too long',
          'Try a more specific command'
        ),
        sentAt: Date.now(),
        error: validation.error,
      };
    }

    // Send the message
    const sendResult = await sendGroupMessage(groupChatId, formattedMessage);

    if (!sendResult.success) {
      return {
        success: false,
        message: formatErrorMessage(
          'Failed to send message',
          'Please try again later'
        ),
        sentAt: Date.now(),
        error: sendResult.error,
      };
    }

    return {
      success: true,
      messageId: sendResult.messageId,
      message: formattedMessage,
      commandType: commandResult.commandType,
      sentAt: Date.now(),
    };
  } catch (error) {
    console.error('[WhatsApp] Error handling message and responding:', error);

    return {
      success: false,
      message: formatErrorMessage(
        'An unexpected error occurred',
        'Please try again'
      ),
      sentAt: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send command response to group
 * @param groupChatId - WhatsApp group chat ID
 * @param commandType - Type of command executed
 * @param responseText - Response text to send
 * @returns Send result
 */
export async function sendCommandResponse(
  groupChatId: string,
  commandType: string,
  responseText: string
): Promise<FullResponseResult> {
  try {
    // Format the response
    const formattedMessage = formatCompleteMessage(
      `📋 ${commandType.toUpperCase()} Response`,
      responseText,
      'Use /help for more commands'
    );

    // Validate message
    const validation = validateMessage(formattedMessage);

    if (!validation.valid) {
      return {
        success: false,
        message: formatErrorMessage(
          'Response too long',
          'Try a different command'
        ),
        sentAt: Date.now(),
        error: validation.error,
      };
    }

    // Send the message
    const sendResult = await sendGroupMessage(groupChatId, formattedMessage);

    if (!sendResult.success) {
      return {
        success: false,
        message: formatErrorMessage(
          'Failed to send message',
          'Please try again'
        ),
        sentAt: Date.now(),
        error: sendResult.error,
      };
    }

    return {
      success: true,
      messageId: sendResult.messageId,
      message: formattedMessage,
      commandType,
      sentAt: Date.now(),
    };
  } catch (error) {
    console.error('[WhatsApp] Error sending command response:', error);

    return {
      success: false,
      message: formatErrorMessage(
        'An error occurred',
        'Please try again'
      ),
      sentAt: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send error response to group
 * @param groupChatId - WhatsApp group chat ID
 * @param errorMessage - Error message
 * @param suggestion - Helpful suggestion
 * @returns Send result
 */
export async function sendErrorResponse(
  groupChatId: string,
  errorMessage: string,
  suggestion?: string
): Promise<FullResponseResult> {
  try {
    // Format error message
    const formattedMessage = formatErrorMessage(errorMessage, suggestion);

    // Send the message
    const sendResult = await sendGroupMessage(groupChatId, formattedMessage);

    if (!sendResult.success) {
      console.error('[WhatsApp] Failed to send error response:', sendResult.error);
    }

    return {
      success: sendResult.success,
      messageId: sendResult.messageId,
      message: formattedMessage,
      sentAt: Date.now(),
      error: sendResult.error,
    };
  } catch (error) {
    console.error('[WhatsApp] Error sending error response:', error);

    return {
      success: false,
      message: 'An error occurred',
      sentAt: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send success response to group
 * @param groupChatId - WhatsApp group chat ID
 * @param message - Success message
 * @returns Send result
 */
export async function sendSuccessResponse(
  groupChatId: string,
  message: string
): Promise<FullResponseResult> {
  try {
    // Format success message
    const formattedMessage = formatCompleteMessage(
      '✅ Success',
      message
    );

    // Send the message
    const sendResult = await sendGroupMessage(groupChatId, formattedMessage);

    return {
      success: sendResult.success,
      messageId: sendResult.messageId,
      message: formattedMessage,
      sentAt: Date.now(),
      error: sendResult.error,
    };
  } catch (error) {
    console.error('[WhatsApp] Error sending success response:', error);

    return {
      success: false,
      message: 'An error occurred',
      sentAt: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send help message to group
 * @param groupChatId - WhatsApp group chat ID
 * @returns Send result
 */
export async function sendHelpMessage(groupChatId: string): Promise<FullResponseResult> {
  try {
    const helpText = `*📋 WhatsApp Bot Commands*

*Available Commands:*

1. /project <name> - Get full project info
2. /status <name> - Get project status
3. /team <name> - List team members
4. /deadline <name> - Show deadline
5. /checklist <name> - Show checklist
6. /notes <name> - Show notes
7. /help - Show this message

_Example: /project 274marcy_`;

    // Send the message
    const sendResult = await sendGroupMessage(groupChatId, helpText);

    return {
      success: sendResult.success,
      messageId: sendResult.messageId,
      message: helpText,
      commandType: 'help',
      sentAt: Date.now(),
      error: sendResult.error,
    };
  } catch (error) {
    console.error('[WhatsApp] Error sending help message:', error);

    return {
      success: false,
      message: 'An error occurred',
      sentAt: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send batch responses to group
 * @param groupChatId - WhatsApp group chat ID
 * @param responses - Array of response messages
 * @returns Array of send results
 */
export async function sendBatchResponses(
  groupChatId: string,
  responses: string[]
): Promise<FullResponseResult[]> {
  const results: FullResponseResult[] = [];

  for (const response of responses) {
    try {
      // Validate message
      const validation = validateMessage(response);

      if (!validation.valid) {
        results.push({
          success: false,
          message: response,
          sentAt: Date.now(),
          error: validation.error,
        });
        continue;
      }

      // Send the message
      const sendResult = await sendGroupMessage(groupChatId, response);

      results.push({
        success: sendResult.success,
        messageId: sendResult.messageId,
        message: response,
        sentAt: Date.now(),
        error: sendResult.error,
      });

      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.push({
        success: false,
        message: response,
        sentAt: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Check message limits before sending
 * @param message - Message to check
 * @returns Limit check result
 */
export function checkLimits(message: string): {
  withinLimit: boolean;
  length: number;
  limit: number;
  remaining: number;
} {
  return checkMessageLimits(message);
}

/**
 * Process webhook message and send response
 * @param groupChatId - Group chat ID from webhook
 * @param messageText - Message text from webhook
 * @param senderPhone - Sender phone number
 * @returns Processing result
 */
export async function processWebhookMessageAndRespond(
  groupChatId: string,
  messageText: string,
  senderPhone: string
): Promise<FullResponseResult> {
  try {
    console.log('[WhatsApp] Processing webhook message', {
      groupChatId,
      senderPhone,
      messageLength: messageText.length,
    });

    // Handle the message and send response
    const result = await handleWhatsAppMessageAndRespond(groupChatId, messageText);

    console.log('[WhatsApp] Webhook message processed', {
      success: result.success,
      messageId: result.messageId,
      commandType: result.commandType,
    });

    return result;
  } catch (error) {
    console.error('[WhatsApp] Error processing webhook message:', error);

    return {
      success: false,
      message: 'An error occurred processing your message',
      sentAt: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
