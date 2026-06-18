import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import {
  verifyWhatsAppSignature,
  parseWhatsAppPayload,
  isValidMessage,
  extractCommand,
} from './services/whatsappWebhook';

describe('WhatsApp Webhook Service', () => {
  const testToken = 'test_token_12345';
  const testPayload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123456789',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '1234567890',
                phone_number_id: '9876543210',
              },
              messages: [
                {
                  from: '1234567890',
                  id: 'msg_123',
                  timestamp: '1234567890',
                  type: 'text',
                  text: {
                    body: '/project 274marcy',
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  });

  describe('verifyWhatsAppSignature', () => {
    it('should verify a valid signature', () => {
      const signature = `sha256=${crypto
        .createHmac('sha256', testToken)
        .update(testPayload)
        .digest('hex')}`;

      const isValid = verifyWhatsAppSignature(testPayload, signature, testToken);
      expect(isValid).toBe(true);
    });

    it('should reject an invalid signature', () => {
      const invalidSignature = 'sha256=invalid_hash_value';
      const isValid = verifyWhatsAppSignature(testPayload, invalidSignature, testToken);
      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong algorithm', () => {
      const wrongAlgoSignature = `md5=${crypto
        .createHmac('md5', testToken)
        .update(testPayload)
        .digest('hex')}`;

      const isValid = verifyWhatsAppSignature(testPayload, wrongAlgoSignature, testToken);
      expect(isValid).toBe(false);
    });

    it('should reject signature without hash', () => {
      const invalidSignature = 'sha256=';
      const isValid = verifyWhatsAppSignature(testPayload, invalidSignature, testToken);
      expect(isValid).toBe(false);
    });
  });

  describe('parseWhatsAppPayload', () => {
    it('should parse valid payload and extract messages', () => {
      const payload = JSON.parse(testPayload);
      const messages = parseWhatsAppPayload(payload);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        groupChatId: '1234567890',
        senderPhoneNumber: '1234567890',
        messageText: '/project 274marcy',
        messageId: 'msg_123',
        timestamp: expect.any(Date),
      });
    });

    it('should handle payload with no messages', () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456789',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '1234567890',
                    phone_number_id: '9876543210',
                  },
                },
              },
            ],
          },
        ],
      };

      const messages = parseWhatsAppPayload(payload);
      expect(messages).toHaveLength(0);
    });

    it('should handle non-text messages', () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456789',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '1234567890',
                    phone_number_id: '9876543210',
                  },
                  messages: [
                    {
                      from: '1234567890',
                      id: 'msg_123',
                      timestamp: '1234567890',
                      type: 'image',
                      image: {
                        id: 'image_123',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const messages = parseWhatsAppPayload(payload);
      expect(messages).toHaveLength(0);
    });

    it('should handle invalid payload structure', () => {
      const invalidPayload = {
        invalid: 'structure',
      };

      const messages = parseWhatsAppPayload(invalidPayload as any);
      expect(messages).toHaveLength(0);
    });
  });

  describe('isValidMessage', () => {
    it('should accept valid message', () => {
      expect(isValidMessage('/project 274marcy')).toBe(true);
      expect(isValidMessage('Hello World')).toBe(true);
      expect(isValidMessage('  /status  ')).toBe(true);
    });

    it('should reject empty message', () => {
      expect(isValidMessage('')).toBe(false);
      expect(isValidMessage('   ')).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(isValidMessage(null as any)).toBe(false);
      expect(isValidMessage(undefined as any)).toBe(false);
    });

    it('should reject message exceeding max length', () => {
      const longMessage = 'a'.repeat(4097);
      expect(isValidMessage(longMessage)).toBe(false);
    });

    it('should accept message at max length', () => {
      const maxMessage = 'a'.repeat(4096);
      expect(isValidMessage(maxMessage)).toBe(true);
    });
  });

  describe('extractCommand', () => {
    it('should extract command starting with /', () => {
      expect(extractCommand('/project 274marcy')).toBe('/project 274marcy');
      expect(extractCommand('/status')).toBe('/status');
      expect(extractCommand('  /help  ')).toBe('/help');
    });

    it('should return null for non-command messages', () => {
      expect(extractCommand('Hello World')).toBeNull();
      expect(extractCommand('Just a regular message')).toBeNull();
      expect(extractCommand('274marcy')).toBeNull();
    });

    it('should handle empty string', () => {
      expect(extractCommand('')).toBeNull();
    });
  });
});
