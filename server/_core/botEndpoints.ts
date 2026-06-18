/**
 * WhatsApp Bot Endpoints
 * Provides REST endpoints for bot initialization and QR code display
 */

import { Express } from 'express';
import { getBot, isBotReady, getBotStatus, getLastQRCode } from '../services/whatsappBotService';

/**
 * Register bot endpoints
 */
export function registerBotEndpoints(app: Express): void {
  /**
   * GET /api/bot/status
   * Returns current bot status
   */
  app.get('/api/bot/status', (req, res) => {
    try {
      const status = getBotStatus();
      const bot = getBot();
      
      res.json({
        success: true,
        status: {
          isConnected: status.isConnected,
          isInitialized: status.isInitialized,
          isReady: status.isReady,
          timestamp: new Date().toISOString(),
        },
        message: status.isReady 
          ? 'Bot is ready and connected' 
          : 'Bot is initializing. Please scan QR code if needed.',
      });
    } catch (error) {
      console.error('[Bot Endpoint] Error getting status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get bot status',
      });
    }
  });

  /**
   * GET /api/bot/qr
   * Returns QR code data for authentication (if available)
   */
  app.get('/api/bot/qr', (req, res) => {
    try {
      const status = getBotStatus();
      
      if (status.isReady) {
        return res.json({
          success: true,
          authenticated: true,
          message: 'Bot is already authenticated',
        });
      }

      // QR code is displayed in console during initialization
      res.json({
        success: true,
        authenticated: false,
        message: 'Bot is initializing. Check server console for QR code.',
        instructions: [
          '1. Open WhatsApp on your phone',
          '2. Go to Settings > Linked Devices',
          '3. Scan the QR code shown in the server console',
          '4. Wait for authentication to complete',
          '5. Bot will be ready to receive messages',
        ],
      });
    } catch (error) {
      console.error('[Bot Endpoint] Error getting QR code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get QR code',
      });
    }
  });

  /**
   * GET /api/bot/qr-image
   * Returns QR code as PNG image for display on UI
   */
  app.get('/api/bot/qr-image', async (req, res) => {
    try {
      const status = getBotStatus();
      
      if (status.isReady) {
        return res.status(400).json({
          success: false,
          error: 'Bot is already authenticated',
        });
      }

      const qrData = getLastQRCode();
      if (!qrData) {
        return res.status(404).json({
          success: false,
          error: 'QR code not available. Bot is initializing...',
        });
      }

      // Generate QR code using QR Server API (free service)
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}`;
      
      // Redirect to the QR code image
      res.redirect(qrImageUrl);
    } catch (error) {
      console.error('[Bot Endpoint] Error generating QR image:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate QR image',
      });
    }
  });

  /**
   * POST /api/bot/initialize
   * Force bot reinitialization
   */
  app.post('/api/bot/initialize', async (req, res) => {
    try {
      const status = getBotStatus();
      
      if (status.isReady) {
        return res.json({
          success: true,
          message: 'Bot is already initialized and ready',
        });
      }

      res.json({
        success: true,
        message: 'Bot initialization in progress. Check server console for QR code.',
        status: status,
      });
    } catch (error) {
      console.error('[Bot Endpoint] Error initializing bot:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize bot',
      });
    }
  });

  /**
   * GET /api/bot/info
   * Returns bot information and available commands
   */
  app.get('/api/bot/info', (req, res) => {
    try {
      const status = getBotStatus();
      
      res.json({
        success: true,
        bot: {
          name: 'Bolted Iron Hub WhatsApp Bot',
          version: '1.0.0',
          status: status,
          isReady: status.isReady,
        },
        commands: [
          {
            name: '/help',
            description: 'Show available commands and usage',
            requiresAdmin: false,
          },
          {
            name: '/status',
            description: 'Get current bot status and statistics',
            requiresAdmin: true,
          },
          {
            name: '/list',
            description: 'List all active projects',
            requiresAdmin: true,
          },
          {
            name: '/project [id]',
            description: 'Get detailed information about a specific project',
            requiresAdmin: true,
          },
          {
            name: '/weekly',
            description: 'Get weekly schedule with all projects',
            requiresAdmin: true,
          },
          {
            name: '/pending',
            description: 'Get projects with pending statuses',
            requiresAdmin: true,
          },
          {
            name: '/report [type]',
            description: 'Generate project report (summary, active, completed)',
            requiresAdmin: true,
          },
        ],
        webhook: {
          url: 'https://boltediron-jvzmywuk.manus.space/api/webhooks/whatsapp',
          method: 'POST',
          description: 'Receives incoming WhatsApp messages',
        },
      });
    } catch (error) {
      console.error('[Bot Endpoint] Error getting bot info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get bot information',
      });
    }
  });

  console.log('[Bot Endpoints] Registered:');
  console.log('  - GET /api/bot/status (bot connection status)');
  console.log('  - GET /api/bot/qr (QR code instructions)');
  console.log('  - POST /api/bot/initialize (force reinitialization)');
  console.log('  - GET /api/bot/info (bot information and commands)');
}
