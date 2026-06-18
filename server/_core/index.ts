import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerChatRoutes } from "./chat";
import { handleWebhookVerification, handleIncomingMessage } from "./whatsappMiddleware";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeBot } from "../services/whatsappBotService";
import { initializeMessageListener } from "../services/whatsappMessageListener";
import { registerBotEndpoints } from "./botEndpoints";


function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Initialize WhatsApp Bot Service
  console.log('[WhatsApp Bot] Starting bot initialization...');
  try {
    await initializeBot();
    console.log('[WhatsApp Bot] Bot service initialized');
    
    // Initialize message listener in background after bot is ready
    // Don't await this - let it attach when bot is ready
    initializeMessageListener().then(() => {
      console.log('[WhatsApp Bot] Message listener activated and ready to process commands');
    }).catch((error) => {
      console.warn('[WhatsApp Bot] Message listener initialization warning:', error);
    });
  } catch (error) {
    console.warn('[WhatsApp Bot] Bot initialization warning:', error);
    console.log('[WhatsApp Bot] Bot will be available after QR code authentication');
  }
  
  // Log WhatsApp configuration
  console.log('[WhatsApp] Configuration:');
  console.log('  - Verify Token:', process.env.WHATSAPP_VERIFY_TOKEN);
  console.log('  - Phone Number ID:', process.env.WHATSAPP_PHONE_NUMBER_ID);
  console.log('  - Business ID:', process.env.WHATSAPP_BUSINESS_ID);
  
  // Middleware to capture raw body for WhatsApp signature verification
  // Only apply to POST requests for signature verification
  const whatsappRawBodyMiddleware = express.raw({ type: 'application/json', limit: '10mb' });
  app.post('/api/webhooks/whatsapp', whatsappRawBodyMiddleware, (req, res, next) => {
    req.rawBody = req.body;
    next();
  });
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Log webhook configuration
  console.log('[WhatsApp] Webhook configured:');
  console.log('  - GET /api/webhooks/whatsapp (verification)');
  console.log('  - POST /api/webhooks/whatsapp (messages)');
  // WhatsApp webhook routes (BEFORE tRPC routes)
  app.get('/api/webhooks/whatsapp', handleWebhookVerification);
  app.post('/api/webhooks/whatsapp', whatsappRawBodyMiddleware, handleIncomingMessage);
  
  // Bot endpoints for status and initialization
  registerBotEndpoints(app);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Chat API with streaming and tool calling
  registerChatRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`WhatsApp Webhook URL: https://boltediron-jvzmywuk.manus.space/api/webhooks/whatsapp`);
    console.log('[WhatsApp Bot] Bot ready to receive messages from authorized WhatsApp groups');
    console.log('[WhatsApp Bot] Scan QR code in bot dashboard to authenticate');
    console.log('[WhatsApp Bot] Available commands: /help, /status, /list, /project, /weekly, /pending, /report');
  });
}

startServer().catch(console.error);
