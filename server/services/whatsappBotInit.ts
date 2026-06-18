/**
 * WhatsApp Bot Initialization Module
 * Integrates bot startup with Express server lifecycle
 */

import { initializeBot, disconnectBot, isBotReady } from './whatsappBotService';

let botInitialized = false;

/**
 * Start the WhatsApp bot service
 * Called during server startup
 */
export async function startWhatsAppBot(): Promise<void> {
  if (botInitialized) {
    console.log('[WhatsApp Bot] Bot already initialized');
    return;
  }

  try {
    console.log('[WhatsApp Bot] Starting WhatsApp bot service...');
    await initializeBot();
    botInitialized = true;
    console.log('[WhatsApp Bot] ✅ WhatsApp bot service started successfully');
  } catch (error) {
    console.error('[WhatsApp Bot] Failed to start bot service:', error);
    // Don't throw - allow server to continue without bot
    botInitialized = false;
  }
}

/**
 * Stop the WhatsApp bot service
 * Called during server shutdown
 */
export async function stopWhatsAppBot(): Promise<void> {
  if (!botInitialized) {
    return;
  }

  try {
    console.log('[WhatsApp Bot] Stopping WhatsApp bot service...');
    await disconnectBot();
    botInitialized = false;
    console.log('[WhatsApp Bot] ✅ WhatsApp bot service stopped');
  } catch (error) {
    console.error('[WhatsApp Bot] Error stopping bot service:', error);
  }
}

/**
 * Check if bot is initialized and ready
 */
export function isBotServiceReady(): boolean {
  return botInitialized && isBotReady();
}

/**
 * Get bot service status
 */
export function getBotServiceStatus(): {
  initialized: boolean;
  ready: boolean;
  message: string;
} {
  const ready = isBotReady();
  return {
    initialized: botInitialized,
    ready,
    message: ready
      ? 'Bot is connected and ready'
      : botInitialized
        ? 'Bot is initializing, waiting for QR scan'
        : 'Bot service not started',
  };
}
