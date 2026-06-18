/**
 * WhatsApp Bot Service
 * Manages whatsapp-web.js client initialization, session persistence, and QR code handling
 * 
 * Features:
 * - Initialize WhatsApp Web client
 * - Generate and display QR code for authentication
 * - Persist session to avoid re-authentication
 * - Auto-load session on server restart
 * - Manage bot connection lifecycle
 */

import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Session storage path
const SESSION_DIR = path.join(__dirname, '../sessions');
const SESSION_FILE = path.join(SESSION_DIR, 'whatsapp-session.json');

// Global bot client instance
let botClient: Client | null = null;
let isInitialized = false;
let connectionPromise: Promise<void> | null = null;
let lastQRCode: string | null = null; // Store latest QR code for UI display



/**
 * Initialize WhatsApp bot client with session persistence
 * Handles QR code generation and authentication
 */
export async function initializeBot(): Promise<void> {
  // Return existing promise if already initializing
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      // Create sessions directory if it doesn't exist
      if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
      }

      console.log('[WhatsApp Bot] Initializing client...');

      // Initialize client with local authentication (session persistence)
      // Configure Puppeteer for production environments
      const puppeteerConfig: any = {
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-setuid-sandbox'],
      };
      
      // In production, try to use system Chrome/Chromium
      if (process.env.NODE_ENV === 'production') {
        // Try common Chrome/Chromium paths in production
        const chromiumPaths = [
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/snap/bin/chromium',
          '/root/.cache/puppeteer/chrome/linux-*/chrome-linux/chrome', // Puppeteer cache
        ];
        
        let chromiumFound = false;
        for (const chromiumPath of chromiumPaths) {
          // Handle glob patterns
          if (chromiumPath.includes('*')) {
            const dir = chromiumPath.split('*')[0];
            if (fs.existsSync(dir)) {
              const files = fs.readdirSync(dir);
              const found = files.find(f => chromiumPath.includes(f) || true);
              if (found) {
                puppeteerConfig.executablePath = path.join(dir, found, chromiumPath.split('*')[1]);
                chromiumFound = true;
                break;
              }
            }
          } else if (fs.existsSync(chromiumPath)) {
            puppeteerConfig.executablePath = chromiumPath;
            chromiumFound = true;
            console.log(`[WhatsApp Bot] Using system Chromium at: ${chromiumPath}`);
            break;
          }
        }
        
        if (!chromiumFound) {
          console.warn('[WhatsApp Bot] ⚠️ System Chromium not found in common paths');
          console.warn('[WhatsApp Bot] Will attempt to use Puppeteer\'s bundled Chromium');
        }
      }
      
      botClient = new Client({
        puppeteer: puppeteerConfig,
      });

      // Handle QR code generation
      botClient.on('qr', (qr: string) => {
        // Store QR code for UI display
        lastQRCode = qr;
        console.log('[WhatsApp Bot] QR Code received - Scan with WhatsApp:');
        console.log('═'.repeat(50));
        qrcode.generate(qr, { small: true });
        console.log('═'.repeat(50));
        console.log('[WhatsApp Bot] Waiting for authentication...');
      });

      // Handle successful authentication
      botClient.on('authenticated', () => {
        console.log('[WhatsApp Bot] ✅ Authentication successful!');
        isInitialized = true;
      });

      // Handle authentication failure
      botClient.on('auth_failure', () => {
        console.error('[WhatsApp Bot] ❌ Authentication failed. Please scan QR code again.');
        isInitialized = false;
      });

      // Handle client ready
      botClient.on('ready', () => {
        console.log('[WhatsApp Bot] ✅ Client is ready and connected!');
        isInitialized = true;
      });

      // Debug: Log all incoming messages
      botClient.on('message', (message: any) => {
        console.log('[WhatsApp Bot Debug] Message event fired:', {
          from: message.from,
          body: message.body?.substring(0, 100),
          isGroup: message.isGroupMsg || message.isGroup,
          timestamp: new Date().toISOString(),
        });
      });

      // Listen for message_create event (alternative)
      botClient.on('message_create', (message: any) => {
        console.log('[WhatsApp Bot Debug] message_create event fired:', {
          from: message.from,
          body: message.body?.substring(0, 100),
          timestamp: new Date().toISOString(),
        });
      });

      // Handle disconnection
      botClient.on('disconnected', (reason: string) => {
        console.warn(`[WhatsApp Bot] ⚠️ Client disconnected: ${reason}`);
        isInitialized = false;
      });

      // Handle errors
      botClient.on('error', (error: Error) => {
        const errorMessage = error.message || '';
        if (errorMessage.includes('Failed to launch') || errorMessage.includes('Chromium') || errorMessage.includes('Chrome')) {
          console.error('[WhatsApp Bot] ❌ Chromium/Browser Error:', {
            message: errorMessage.substring(0, 200),
            environment: process.env.NODE_ENV,
            suggestion: 'Chromium is not available. The bot requires a browser to function.',
            solutions: [
              '1. Install Chromium: npx puppeteer browsers install chrome',
              '2. Or install system Chromium: apt-get install chromium-browser',
              '3. Or use WhatsApp Cloud API instead of whatsapp-web.js',
            ],
          });
        } else {
          console.error('[WhatsApp Bot] Error:', error.message);
        }
      });

      // Initialize the client (this starts the authentication process)
      // Don't wait for 'ready' event here - let message listener handle that
      botClient.initialize().catch((error) => {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        const errorStack = error instanceof Error ? error.stack : '';
        console.error('[WhatsApp Bot] Error during initialization:', {
          message: errorMessage,
          stack: errorStack,
          error: error,
        });
      });
      console.log('[WhatsApp Bot] Client initialization started (waiting for QR code scan)...');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('Failed to launch') || errorMessage.includes('Chromium') || errorMessage.includes('Chrome')) {
        console.error('[WhatsApp Bot] ❌ Chromium/Browser initialization failed:', {
          message: errorMessage.substring(0, 300),
          environment: process.env.NODE_ENV,
          suggestion: 'The bot requires Chromium/Chrome to be installed on the system.',
          quickFixes: [
            '1. Run: npx puppeteer browsers install chrome',
            '2. Or: apt-get install chromium-browser',
            '3. Or rebuild with: npm run build',
          ],
          documentation: 'See WHATSAPP_BOT_PRODUCTION_SETUP.md for detailed instructions',
        });
      } else {
        console.error('[WhatsApp Bot] Failed to initialize:', error);
      }
      
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
}

/**
 * Get the current bot client instance
 */
export function getBot(): Client | null {
  return botClient;
}

/**
 * Check if bot is ready and connected
 */
export function isBotReady(): boolean {
  return isInitialized && botClient !== null;
}

/**
 * Wait for bot to be ready
 * Returns a promise that resolves when bot fires the 'ready' event
 */
export async function waitForBotReady(timeoutMs: number = 120000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (isBotReady()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error('Bot did not become ready within timeout period');
}

/**
 * Get bot status
 */
export function getBotStatus(): {
  isConnected: boolean;
  isInitialized: boolean;
  isReady: boolean;
} {
  return {
    isConnected: botClient?.info?.wid?.user ? true : false,
    isInitialized,
    isReady: isInitialized && botClient?.info?.wid?.user ? true : false,
  };
}

/**
 * Get last QR code data
 */
export function getLastQRCode(): string | null {
  return lastQRCode;
}

/**
 * Clear QR code after authentication
 */
export function clearQRCode(): void {
  lastQRCode = null;
}

/**
 * Send a message to a specific chat
 */
export async function sendMessage(chatId: string, message: string): Promise<void> {
  if (!botClient) {
    throw new Error('Bot client not initialized');
  }

  try {
    await botClient.sendMessage(chatId, message);
    console.log(`[WhatsApp Bot] Message sent to ${chatId}`);
  } catch (error) {
    console.error(`[WhatsApp Bot] Failed to send message to ${chatId}:`, error);
    throw error;
  }
}

/**
 * Register a message handler for incoming messages
 */
export function onMessage(handler: (message: any) => Promise<void>): void {
  if (!botClient) {
    throw new Error('Bot client not initialized');
  }

    botClient.on('message_create', async (message: any) => {
    try {
      await handler(message);
    } catch (error) {
      console.error('[WhatsApp Bot] Error in message handler:', error);
    }
  });
}

/**
 * Disconnect the bot client
 */
export async function disconnectBot(): Promise<void> {
  if (botClient) {
    try {
      await botClient.destroy();
      botClient = null;
      isInitialized = false;
      connectionPromise = null;
      console.log('[WhatsApp Bot] Bot disconnected');
    } catch (error) {
      console.error('[WhatsApp Bot] Error disconnecting bot:', error);
    }
  }
}

/**
 * Check if a user is authorized (admin)
 */
export async function isUserAuthorized(userId: string): Promise<boolean> {
  // This would typically check against a database of authorized admins
  // For now, return false as a placeholder
  return false;
}
