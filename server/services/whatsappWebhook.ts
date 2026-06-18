import crypto from 'crypto';

/**
 * WhatsApp message interface
 */
export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
}

/**
 * WhatsApp webhook payload interface
 */
export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: WhatsAppMessage[];
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
    }>;
  }>;
}

/**
 * Verify WhatsApp webhook signature using HMAC-SHA256
 * @param payload - Raw request body as string
 * @param signature - X-Hub-Signature-256 header value
 * @param token - WhatsApp access token
 * @returns boolean - True if signature is valid
 */
export function verifyWhatsAppSignature(
  payload: string,
  signature: string,
  token: string
): boolean {
  try {
    // Expected format: sha256=<hash>
    const [algorithm, hash] = signature.split('=');

    if (algorithm !== 'sha256') {
      console.error('[WhatsApp] Invalid signature algorithm:', algorithm);
      return false;
    }

    if (!hash) {
      console.error('[WhatsApp] Missing hash in signature');
      return false;
    }

    // Calculate expected hash
    const expectedHash = crypto
      .createHmac('sha256', token)
      .update(payload)
      .digest('hex');

    // Compare hashes using timing-safe comparison
    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(hash),
        Buffer.from(expectedHash)
      );
      return isValid;
    } catch {
      // timingSafeEqual throws if buffers are different length
      return false;
    }
  } catch (error) {
    console.error('[WhatsApp] Signature verification error:', error);
    return false;
  }
}

/**
 * Parse WhatsApp webhook payload and extract messages
 * @param payload - Webhook payload object
 * @returns Array of parsed messages
 */
export function parseWhatsAppPayload(payload: WhatsAppWebhookPayload): Array<{
  groupChatId: string;
  senderPhoneNumber: string;
  messageText: string;
  messageId: string;
  timestamp: Date;
}> {
  const messages: Array<{
    groupChatId: string;
    senderPhoneNumber: string;
    messageText: string;
    messageId: string;
    timestamp: Date;
  }> = [];

  try {
    if (!payload.entry || !Array.isArray(payload.entry)) {
      console.warn('[WhatsApp] Invalid payload structure: missing entry');
      return messages;
    }

    payload.entry.forEach((entry) => {
      if (!entry.changes || !Array.isArray(entry.changes)) {
        return;
      }

      entry.changes.forEach((change) => {
        const value = change.value;

        if (!value || !value.messages) {
          return;
        }

        value.messages.forEach((message) => {
          if (message.type === 'text' && message.text?.body) {
            messages.push({
              groupChatId: message.from,
              senderPhoneNumber: message.from,
              messageText: message.text.body.trim(),
              messageId: message.id,
              timestamp: new Date(parseInt(message.timestamp) * 1000),
            });
          }
        });
      });
    });
  } catch (error) {
    console.error('[WhatsApp] Error parsing payload:', error);
  }

  return messages;
}

/**
 * Validate message content
 * @param messageText - Message text to validate
 * @returns boolean - True if message is valid
 */
export function isValidMessage(messageText: string): boolean {
  if (!messageText || typeof messageText !== 'string') {
    return false;
  }

  const trimmed = messageText.trim();

  if (trimmed.length === 0) {
    return false;
  }

  if (trimmed.length > 4096) {
    return false;
  }

  return true;
}

/**
 * Extract command from message text
 * @param messageText - Message text
 * @returns Command string or null
 */
export function extractCommand(messageText: string): string | null {
  const trimmed = messageText.trim();

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  return null;
}
