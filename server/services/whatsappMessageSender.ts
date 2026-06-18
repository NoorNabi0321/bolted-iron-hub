/**
 * WhatsApp Message Sender Service
 * Sends messages via whatsapp-web.js bot client
 */

import { getBot } from './whatsappBotService';

/**
 * Message sending result
 */
export interface MessageSendResult {
  success: boolean;
  messageId?: string;
  timestamp?: number;
  error?: string;
  retries?: number;
}

/**
 * Send message to WhatsApp group or individual
 * @param recipientId - Recipient chat ID or phone number
 * @param messageText - Message text to send
 * @returns Send result
 */
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  recipientId: string,
  messageText: string,
  isGroup: boolean = false
): Promise<MessageSendResult> {
  try {
    // Validate inputs
    if (!recipientId || !messageText) {
      return {
        success: false,
        error: 'Missing required parameters: recipientId or messageText',
      };
    }

    // Validate message length
    if (messageText.length > 4096) {
      return {
        success: false,
        error: 'Message exceeds WhatsApp character limit (4096)',
      };
    }

    // Get bot client
    const bot = getBot();
    if (!bot) {
      return {
        success: false,
        error: 'WhatsApp bot client is not initialized',
      };
    }

    console.log('[WhatsApp] Sending message via whatsapp-web.js:', {
      recipientId,
      messageLength: messageText.length,
      isGroup,
    });

    try {
      // Send message using whatsapp-web.js
      const message = await bot.sendMessage(recipientId, messageText);

      console.log('[WhatsApp] Message sent successfully:', {
        messageId: message.id?.id,
        timestamp: Date.now(),
      });

      return {
        success: true,
        messageId: message.id?.id,
        timestamp: Date.now(),
      };
    } catch (sendError) {
      const errorMessage = sendError instanceof Error ? sendError.message : String(sendError);
      console.error('[WhatsApp] Error sending message:', {
        error: errorMessage,
        recipientId,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  } catch (error) {
    console.error('[WhatsApp] Error in sendWhatsAppMessage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending message',
    };
  }
}

/**
 * Send message to WhatsApp group
 * @param groupChatId - WhatsApp group chat ID
 * @param messageText - Message text
 * @returns Send result
 */
export async function sendGroupMessage(
  groupChatId: string,
  messageText: string
): Promise<MessageSendResult> {
  // For whatsapp-web.js, we don't need phone number ID
  // Just pass empty string as it's not used
  return sendWhatsAppMessage('', groupChatId, messageText, true);
}

/**
 * Send message to individual
 * @param phoneNumber - Recipient phone number
 * @param messageText - Message text
 * @returns Send result
 */
export async function sendIndividualMessage(
  phoneNumber: string,
  messageText: string
): Promise<MessageSendResult> {
  // For whatsapp-web.js, we don't need phone number ID
  // Just pass empty string as it's not used
  return sendWhatsAppMessage('', phoneNumber, messageText, false);
}

/**
 * Validate message for sending
 * @param messageText - Message text to validate
 * @returns Validation result
 */
export function validateMessage(messageText: string): { valid: boolean; error?: string } {
  if (!messageText || messageText.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (messageText.length > 4096) {
    return { valid: false, error: 'Message exceeds WhatsApp character limit (4096)' };
  }

  return { valid: true };
}

/**
 * Send formatted message
 * @param recipientId - Recipient chat ID
 * @param messageText - Formatted message text
 * @returns Send result
 */
export async function sendFormattedMessage(
  recipientId: string,
  messageText: string
): Promise<MessageSendResult> {
  return sendWhatsAppMessage('', recipientId, messageText, false);
}
