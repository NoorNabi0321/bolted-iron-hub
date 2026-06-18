/**
 * WhatsApp Message Listener
 * Listens for incoming messages from WhatsApp Web client
 * Routes messages to command executor and handles responses
 */

import { getBot, isBotReady, waitForBotReady } from './whatsappBotService';
import { getAuthorizedGroup, hasCommandPermission } from './whatsappAuthService';
import { handleWhatsAppMessageAndRespond } from './whatsappResponseService';
import { logMessageEvent as logMessageEventToDb } from './whatsappMessageLogger';
import { Message, Chat } from 'whatsapp-web.js';

/**
 * Message listener result
 */
export interface MessageListenerResult {
  success: boolean;
  messageId?: string;
  groupChatId?: string;
  senderPhone?: string;
  commandType?: string | null;
  error?: string;
}

/**
 * Initialize message listener for WhatsApp bot
 * Listens for incoming messages and routes to command executor
 */
export async function initializeMessageListener(): Promise<void> {
  try {
    console.log('[WhatsApp Listener] Starting message listener initialization...');
    const bot = getBot();
    if (!bot) {
      throw new Error('Bot client is null. Cannot initialize message listener.');
    }

    // Attach message listener immediately
    // It will start processing messages once bot is authenticated
    console.log('[WhatsApp Listener] Attaching message listener to bot...');

    // Listen for incoming messages
    // Use 'message_create' event which fires for all new messages including group messages
    bot.on('message_create', async (message: Message) => {
      try {
        console.log('[WhatsApp Listener] Message event fired:', {
          from: message.from,
          body: message.body?.substring(0, 50),
        });
        await handleIncomingMessage(message);
      } catch (error) {
        console.error('[WhatsApp Listener] Error handling message:', error);
      }
    });

    console.log('[WhatsApp Listener] ✅ Message listener attached and ready to process messages');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[WhatsApp Listener] Failed to initialize message listener:', {
      message: errorMessage,
      stack: errorStack,
      error: error,
    });
    // Don't throw - let the server continue even if listener fails
    console.warn('[WhatsApp Listener] Message listener will retry when bot is ready');
  }
}

/**
 * Handle incoming WhatsApp message
 * @param message - WhatsApp message object
 */
export async function handleIncomingMessage(message: Message): Promise<MessageListenerResult> {
  const startTime = Date.now();

  try {
    // Get message details
    const messageText = message.body.trim();
    const senderPhone = message.from;
    const chat: Chat = await message.getChat();
    const groupChatId = chat.id._serialized;

    // Log message received
    console.log('[WhatsApp Listener] Message received', {
      from: senderPhone,
      groupChatId,
      text: messageText.substring(0, 50),
      timestamp: new Date().toISOString(),
    });

    // Check if message is a command
    if (!messageText.startsWith('/')) {
      console.log('[WhatsApp Listener] Non-command message received, ignoring');
      return {
        success: false,
        error: 'Not a command',
      };
    }

    // Check if group is authorized to use the bot
    const authorizedGroup = await getAuthorizedGroup(groupChatId);

    if (!authorizedGroup) {
      console.warn('[WhatsApp Listener] Unauthorized group attempt', {
        groupChatId,
        senderPhone,
      });

      // Log unauthorized attempt
      await logMessageEventToDb({
        groupChatId,
        senderPhoneNumber: senderPhone,
        messageText,
        status: 'unauthorized',
        commandType: null,
        responseText: 'Unauthorized access',
        errorMessage: 'This group is not authorized to use the bot',
      });

      // Send error response
      await message.reply('❌ This group is not authorized to use the bot. Contact an administrator.');

      return {
        success: false,
        groupChatId,
        senderPhone,
        error: 'Unauthorized group',
      };
    }

    // Extract command type from message
    const commandMatch = messageText.match(/^\/(\w+)/);
    const commandType = commandMatch ? commandMatch[1].toLowerCase() : null;

    // Check command permission (include the slash in the command name)
    if (commandType && !(await hasCommandPermission('admin', `/${commandType}`))) {
      console.warn('[WhatsApp Listener] Command permission denied', {
        senderPhone,
        commandType,
      });

      // Log permission denied
      await logMessageEventToDb({
        groupChatId,
        senderPhoneNumber: senderPhone,
        messageText,
        status: 'unauthorized',
        commandType,
        responseText: 'Command not permitted',
        errorMessage: `Command /${commandType} is not available`,
      });

      // Send error response
      await message.reply(`❌ Command /${commandType} is not available`);

      return {
        success: false,
        groupChatId,
        senderPhone,
        commandType,
        error: 'Permission denied',
      };
    }

    // Process message and send response
    const result = await handleWhatsAppMessageAndRespond(groupChatId, messageText);

    // Log successful command
    await logMessageEventToDb({
      groupChatId,
      senderPhoneNumber: senderPhone,
      messageText,
      status: result.success ? 'success' : 'error',
      commandType: result.commandType || null,
      responseText: result.message,
      errorMessage: result.error || null,
    });

    const duration = Date.now() - startTime;

    console.log('[WhatsApp Listener] Message processed successfully', {
      groupChatId,
      senderPhone,
      commandType: result.commandType,
      duration: `${duration}ms`,
      success: result.success,
    });

    return {
      success: result.success,
      messageId: result.messageId,
      groupChatId,
      senderPhone,
      commandType: result.commandType,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('[WhatsApp Listener] Error processing message', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    });

    // Send error response to user
    try {
      await message.reply('❌ An error occurred processing your command. Please try again.');
    } catch (replyError) {
      console.error('[WhatsApp Listener] Failed to send error reply:', replyError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Stop listening for messages
 */
export async function stopMessageListener(): Promise<void> {
  try {
    if (!isBotReady()) {
      console.warn('[WhatsApp Listener] Bot is not ready');
      return;
    }

    const bot = getBot();
    if (!bot) {
      console.warn('[WhatsApp Listener] Bot client is null');
      return;
    }
    bot.removeAllListeners('message');

    console.log('[WhatsApp Listener] Message listener stopped');
  } catch (error) {
    console.error('[WhatsApp Listener] Error stopping message listener:', error);
    throw error;
  }
}

/**
 * Get listener status
 */
export function getListenerStatus(): {
  isListening: boolean;
  botReady: boolean;
} {
  return {
    isListening: isBotReady(),
    botReady: isBotReady(),
  };
}

/**
 * Handle group message with authorization
 * @param message - WhatsApp message
 * @returns Processing result
 */
export async function handleGroupMessage(message: Message): Promise<MessageListenerResult> {
  // Only process messages from authorized groups
  const chat: Chat = await message.getChat();

  if (!chat.isGroup) {
    console.log('[WhatsApp Listener] Ignoring non-group message');
    return {
      success: false,
      error: 'Not a group message',
    };
  }

  return handleIncomingMessage(message);
}

/**
 * Batch process messages
 * @param messages - Array of WhatsApp messages
 * @returns Array of processing results
 */
export async function batchProcessMessages(messages: Message[]): Promise<MessageListenerResult[]> {
  const results: MessageListenerResult[] = [];

  for (const message of messages) {
    try {
      const result = await handleIncomingMessage(message);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}


