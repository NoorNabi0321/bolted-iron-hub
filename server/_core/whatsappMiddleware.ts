import { Request, Response } from 'express';
import {
  verifyWhatsAppSignature,
  parseWhatsAppPayload,
  isValidMessage,
} from '../services/whatsappWebhook';
import {
  getAuthorizedGroupByChatId,
  createAuthorizedGroup,
  logWhatsAppMessage,
  updateGroupLastActivity,
} from '../db';

// Extend Express Request to include rawBody
declare global {
  namespace Express {
    interface Request {
      rawBody?: string | Buffer;
    }
  }
}

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'bolted_iron_hub_verify';

/**
 * Handle WhatsApp webhook verification (GET request)
 * WhatsApp sends this to verify the webhook endpoint
 */
export function handleWebhookVerification(req: Request, res: Response) {
  try {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    console.log('[WhatsApp] Webhook verification attempt:', {
      mode,
      hasToken: !!token,
      expectedToken: WHATSAPP_VERIFY_TOKEN,
    });

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      console.log('[WhatsApp] Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.error('[WhatsApp] Webhook verification failed - invalid token');
      res.status(403).send('Forbidden');
    }
  } catch (error) {
    console.error('[WhatsApp] Webhook verification error:', error);
    res.status(500).send('Internal Server Error');
  }
}

/**
 * Handle incoming WhatsApp messages (POST request)
 */
export async function handleIncomingMessage(req: Request, res: Response) {
  try {
    // Get raw body for signature verification
    let rawBody: string;

    if (req.rawBody) {
      // If middleware preserved raw body
      rawBody = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.rawBody);
    } else {
      // Fallback to stringifying current body
      rawBody = JSON.stringify(req.body);
    }

    const signature = req.headers['x-hub-signature-256'] as string;

    if (!signature) {
      console.error('[WhatsApp] Missing signature header');
      return res.status(403).send('Forbidden');
    }

    // Verify signature
    if (!WHATSAPP_TOKEN) {
      console.error('[WhatsApp] Missing WHATSAPP_TOKEN environment variable');
      return res.status(500).send('Internal Server Error');
    }

    if (!verifyWhatsAppSignature(rawBody, signature, WHATSAPP_TOKEN)) {
      console.error('[WhatsApp] Signature verification failed');
      return res.status(403).send('Forbidden');
    }

    // Acknowledge receipt immediately (WhatsApp expects 200 within 30 seconds)
    res.status(200).send('ok');

    // Parse payload asynchronously (don't wait for response)
    setImmediate(async () => {
      try {
        const payload = req.body;
        const messages = parseWhatsAppPayload(payload);

        console.log(`[WhatsApp] Processing ${messages.length} messages`);

        // Process each message
        for (const message of messages) {
          try {
            // Validate message
            if (!isValidMessage(message.messageText)) {
              console.warn('[WhatsApp] Invalid message received:', {
                group: message.groupChatId,
                text: message.messageText.substring(0, 50),
              });
              continue;
            }

            // Auto-register group if not exists
            const existingGroup = await getAuthorizedGroupByChatId(message.groupChatId);
            if (!existingGroup) {
              await createAuthorizedGroup({
                groupChatId: message.groupChatId,
                groupName: message.groupChatId,
                isEnabled: true,
              });
            }

            // Check if group is authorized
            const group = await getAuthorizedGroupByChatId(message.groupChatId);

            if (!group || !group.isEnabled) {
              // Log unauthorized access attempt
              await logWhatsAppMessage({
                groupChatId: message.groupChatId,
                senderPhoneNumber: message.senderPhoneNumber,
                messageText: message.messageText,
                commandType: null,
                responseText: null,
                status: 'unauthorized',
                errorMessage: null,
              });
              console.log('[WhatsApp] Message from unauthorized group:', message.groupChatId);
              continue;
            }

            // Update last activity
            await updateGroupLastActivity(message.groupChatId);

            // Log successful message reception
            await logWhatsAppMessage({
              groupChatId: message.groupChatId,
              senderPhoneNumber: message.senderPhoneNumber,
              messageText: message.messageText,
              commandType: null,
              responseText: null,
              status: 'success',
              errorMessage: null,
            });

            console.log('[WhatsApp] Valid message received:', {
              group: message.groupChatId,
              sender: message.senderPhoneNumber,
              text: message.messageText.substring(0, 50),
            });

            // Message will be processed by command handler (Phase 3-4)
            // For now, just log it
          } catch (error) {
            console.error('[WhatsApp] Error processing message:', error);
            try {
              await logWhatsAppMessage({
                groupChatId: message.groupChatId,
                senderPhoneNumber: message.senderPhoneNumber,
                messageText: message.messageText,
                commandType: null,
                responseText: null,
                status: 'error',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
              });
            } catch (logError) {
              console.error('[WhatsApp] Error logging message:', logError);
            }
          }
        }
      } catch (error) {
        console.error('[WhatsApp] Error in message processing:', error);
      }
    });
  } catch (error) {
    console.error('[WhatsApp] Webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
}
