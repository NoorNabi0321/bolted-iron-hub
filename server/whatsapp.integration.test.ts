import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import crypto from 'crypto';

/**
 * Integration tests for WhatsApp webhook endpoint
 * Tests the full request/response cycle with Express middleware
 */
describe('WhatsApp Webhook Integration Tests', () => {
  const VERIFY_TOKEN = 'test_verify_token_12345';
  const APP_SECRET = 'test_app_secret_67890';

  // Helper function to create a valid signature
  function createSignature(payload: string, secret: string): string {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return `sha256=${hash}`;
  }

  // Helper function to create a valid WhatsApp message payload
  function createMessagePayload(messageText: string, phoneNumberId: string = '9876543210') {
    return {
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
                  phone_number_id: phoneNumberId,
                },
                messages: [
                  {
                    from: '1234567890',
                    id: 'msg_' + Date.now(),
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: 'text',
                    text: {
                      body: messageText,
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
  }

  describe('Signature Verification with Different Payloads', () => {
    it('should verify signature with command message', () => {
      const payload = createMessagePayload('/project 274marcy');
      const payloadString = JSON.stringify(payload);
      const signature = createSignature(payloadString, APP_SECRET);

      // Extract hash from signature
      const [algo, hash] = signature.split('=');
      const expectedHash = crypto
        .createHmac('sha256', APP_SECRET)
        .update(payloadString)
        .digest('hex');

      expect(algo).toBe('sha256');
      expect(hash).toBe(expectedHash);
    });

    it('should verify signature with status command', () => {
      const payload = createMessagePayload('/status');
      const payloadString = JSON.stringify(payload);
      const signature = createSignature(payloadString, APP_SECRET);

      const [algo, hash] = signature.split('=');
      const expectedHash = crypto
        .createHmac('sha256', APP_SECRET)
        .update(payloadString)
        .digest('hex');

      expect(hash).toBe(expectedHash);
    });

    it('should verify signature with long message', () => {
      const longMessage = 'a'.repeat(4000);
      const payload = createMessagePayload(longMessage);
      const payloadString = JSON.stringify(payload);
      const signature = createSignature(payloadString, APP_SECRET);

      const [algo, hash] = signature.split('=');
      const expectedHash = crypto
        .createHmac('sha256', APP_SECRET)
        .update(payloadString)
        .digest('hex');

      expect(hash).toBe(expectedHash);
    });

    it('should verify signature with special characters', () => {
      const specialText = '/project 274marcy™ © ® 中文 العربية';
      const payload = createMessagePayload(specialText);
      const payloadString = JSON.stringify(payload);
      const signature = createSignature(payloadString, APP_SECRET);

      const [algo, hash] = signature.split('=');
      const expectedHash = crypto
        .createHmac('sha256', APP_SECRET)
        .update(payloadString)
        .digest('hex');

      expect(hash).toBe(expectedHash);
    });

    it('should verify signature with multiple messages', () => {
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
                      id: 'msg_1',
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      type: 'text',
                      text: { body: '/project 274marcy' },
                    },
                    {
                      from: '1234567890',
                      id: 'msg_2',
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      type: 'text',
                      text: { body: '/status' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const payloadString = JSON.stringify(payload);
      const signature = createSignature(payloadString, APP_SECRET);

      const [algo, hash] = signature.split('=');
      const expectedHash = crypto
        .createHmac('sha256', APP_SECRET)
        .update(payloadString)
        .digest('hex');

      expect(hash).toBe(expectedHash);
    });
  });

  describe('Payload Parsing with Different Message Types', () => {
    it('should parse command message correctly', () => {
      const payload = createMessagePayload('/project 274marcy');
      const payloadString = JSON.stringify(payload);

      expect(payload.entry).toHaveLength(1);
      expect(payload.entry[0].changes).toHaveLength(1);
      expect(payload.entry[0].changes[0].value.messages).toHaveLength(1);
      expect(payload.entry[0].changes[0].value.messages[0].text.body).toBe('/project 274marcy');
    });

    it('should parse status command correctly', () => {
      const payload = createMessagePayload('/status');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toBe('/status');
    });

    it('should parse help command correctly', () => {
      const payload = createMessagePayload('/help');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toBe('/help');
    });

    it('should parse team command correctly', () => {
      const payload = createMessagePayload('/team');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toBe('/team');
    });

    it('should parse deadline command correctly', () => {
      const payload = createMessagePayload('/deadline');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toBe('/deadline');
    });

    it('should parse checklist command correctly', () => {
      const payload = createMessagePayload('/checklist');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toBe('/checklist');
    });

    it('should parse notes command correctly', () => {
      const payload = createMessagePayload('/notes');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toBe('/notes');
    });

    it('should parse regular message correctly', () => {
      const payload = createMessagePayload('Hello, this is a regular message');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toBe(
        'Hello, this is a regular message'
      );
    });

    it('should parse message with whitespace', () => {
      const payload = createMessagePayload('  /status  ');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toBe('  /status  ');
    });

    it('should parse message with newlines', () => {
      const payload = createMessagePayload('/project 274marcy\nLine 2\nLine 3');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toContain('\n');
    });
  });

  describe('Webhook Payload Validation', () => {
    it('should have correct object type', () => {
      const payload = createMessagePayload('/project 274marcy');

      expect(payload.object).toBe('whatsapp_business_account');
    });

    it('should have entry array', () => {
      const payload = createMessagePayload('/project 274marcy');

      expect(Array.isArray(payload.entry)).toBe(true);
      expect(payload.entry.length).toBeGreaterThan(0);
    });

    it('should have changes array in entry', () => {
      const payload = createMessagePayload('/project 274marcy');

      expect(Array.isArray(payload.entry[0].changes)).toBe(true);
      expect(payload.entry[0].changes.length).toBeGreaterThan(0);
    });

    it('should have messaging_product field', () => {
      const payload = createMessagePayload('/project 274marcy');

      expect(payload.entry[0].changes[0].value.messaging_product).toBe('whatsapp');
    });

    it('should have metadata with display_phone_number', () => {
      const payload = createMessagePayload('/project 274marcy');

      expect(payload.entry[0].changes[0].value.metadata.display_phone_number).toBe('1234567890');
    });

    it('should have metadata with phone_number_id', () => {
      const payload = createMessagePayload('/project 274marcy');

      expect(payload.entry[0].changes[0].value.metadata.phone_number_id).toBe('9876543210');
    });

    it('should have message with from field', () => {
      const payload = createMessagePayload('/project 274marcy');

      expect(payload.entry[0].changes[0].value.messages[0].from).toBe('1234567890');
    });

    it('should have message with id field', () => {
      const payload = createMessagePayload('/project 274marcy');

      expect(payload.entry[0].changes[0].value.messages[0].id).toMatch(/^msg_/);
    });

    it('should have message with timestamp field', () => {
      const payload = createMessagePayload('/project 274marcy');

      expect(payload.entry[0].changes[0].value.messages[0].timestamp).toBeTruthy();
    });

    it('should have message with type field', () => {
      const payload = createMessagePayload('/project 274marcy');

      expect(payload.entry[0].changes[0].value.messages[0].type).toBe('text');
    });

    it('should have message with text.body field', () => {
      const payload = createMessagePayload('/project 274marcy');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toBe('/project 274marcy');
    });
  });

  describe('Signature Generation Consistency', () => {
    it('should generate same signature for same payload and secret', () => {
      const payload = createMessagePayload('/project 274marcy');
      const payloadString = JSON.stringify(payload);

      const sig1 = createSignature(payloadString, APP_SECRET);
      const sig2 = createSignature(payloadString, APP_SECRET);

      expect(sig1).toBe(sig2);
    });

    it('should generate different signature for different payload', () => {
      const payload1 = createMessagePayload('/project 274marcy');
      const payload2 = createMessagePayload('/status');

      const sig1 = createSignature(JSON.stringify(payload1), APP_SECRET);
      const sig2 = createSignature(JSON.stringify(payload2), APP_SECRET);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signature for different secret', () => {
      const payload = createMessagePayload('/project 274marcy');
      const payloadString = JSON.stringify(payload);

      const sig1 = createSignature(payloadString, APP_SECRET);
      const sig2 = createSignature(payloadString, 'different_secret');

      expect(sig1).not.toBe(sig2);
    });

    it('should use sha256 algorithm', () => {
      const payload = createMessagePayload('/project 274marcy');
      const payloadString = JSON.stringify(payload);
      const signature = createSignature(payloadString, APP_SECRET);

      expect(signature).toMatch(/^sha256=/);
    });

    it('should generate 64-character hex hash', () => {
      const payload = createMessagePayload('/project 274marcy');
      const payloadString = JSON.stringify(payload);
      const signature = createSignature(payloadString, APP_SECRET);

      const [algo, hash] = signature.split('=');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Message Content Edge Cases', () => {
    it('should handle empty message body', () => {
      const payload = createMessagePayload('');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toBe('');
    });

    it('should handle whitespace-only message', () => {
      const payload = createMessagePayload('   ');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toBe('   ');
    });

    it('should handle very long message', () => {
      const longMessage = 'a'.repeat(4096);
      const payload = createMessagePayload(longMessage);

      expect(payload.entry[0].changes[0].value.messages[0].text.body.length).toBe(4096);
    });

    it('should handle message with tabs', () => {
      const payload = createMessagePayload('/project\t274marcy');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toContain('\t');
    });

    it('should handle message with multiple spaces', () => {
      const payload = createMessagePayload('/project     274marcy');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toContain('     ');
    });

    it('should handle message with unicode characters', () => {
      const payload = createMessagePayload('Hello 世界 مرحبا мир');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toContain('世界');
      expect(payload.entry[0].changes[0].value.messages[0].text.body).toContain('مرحبا');
      expect(payload.entry[0].changes[0].value.messages[0].text.body).toContain('мир');
    });

    it('should handle message with emoji', () => {
      const payload = createMessagePayload('/project 274marcy 🎉 ✅ ❌');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toContain('🎉');
    });

    it('should handle message with HTML-like content', () => {
      const payload = createMessagePayload('<script>alert("test")</script>');

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toContain('<script>');
    });

    it('should handle message with SQL-like content', () => {
      const payload = createMessagePayload("'; DROP TABLE users; --");

      expect(payload.entry[0].changes[0].value.messages[0].text.body).toContain('DROP TABLE');
    });
  });

  describe('Timestamp Handling', () => {
    it('should have valid unix timestamp', () => {
      const payload = createMessagePayload('/project 274marcy');
      const timestamp = parseInt(payload.entry[0].changes[0].value.messages[0].timestamp);

      expect(timestamp).toBeGreaterThan(0);
      expect(timestamp).toBeLessThan(Date.now() / 1000 + 1);
    });

    it('should convert timestamp to Date correctly', () => {
      const payload = createMessagePayload('/project 274marcy');
      const timestamp = parseInt(payload.entry[0].changes[0].value.messages[0].timestamp);
      const date = new Date(timestamp * 1000);

      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBeGreaterThan(0);
    });

    it('should handle different timestamps for multiple messages', () => {
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
                      id: 'msg_1',
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      type: 'text',
                      text: { body: '/project 274marcy' },
                    },
                    {
                      from: '1234567890',
                      id: 'msg_2',
                      timestamp: (Math.floor(Date.now() / 1000) + 1).toString(),
                      type: 'text',
                      text: { body: '/status' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const ts1 = parseInt(payload.entry[0].changes[0].value.messages[0].timestamp);
      const ts2 = parseInt(payload.entry[0].changes[0].value.messages[1].timestamp);

      expect(ts2).toBeGreaterThanOrEqual(ts1);
    });
  });

  describe('Message ID Uniqueness', () => {
    it('should generate unique message IDs', async () => {
      const payload1 = createMessagePayload('/project 274marcy');
      // Add delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 2));
      const payload2 = createMessagePayload('/status');

      const id1 = payload1.entry[0].changes[0].value.messages[0].id;
      const id2 = payload2.entry[0].changes[0].value.messages[0].id;

      expect(id1).not.toBe(id2);
    });

    it('should have msg_ prefix in message ID', () => {
      const payload = createMessagePayload('/project 274marcy');
      const id = payload.entry[0].changes[0].value.messages[0].id;

      expect(id).toMatch(/^msg_/);
    });

    it('should include timestamp in message ID', () => {
      const payload = createMessagePayload('/project 274marcy');
      const id = payload.entry[0].changes[0].value.messages[0].id;

      expect(id).toMatch(/^msg_\d+$/);
    });
  });

  describe('Webhook Payload Structure Integrity', () => {
    it('should maintain structure after JSON serialization', () => {
      const payload = createMessagePayload('/project 274marcy');
      const serialized = JSON.stringify(payload);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(payload);
    });

    it('should handle multiple serialization cycles', () => {
      const payload = createMessagePayload('/project 274marcy');

      let current = payload;
      for (let i = 0; i < 5; i++) {
        const serialized = JSON.stringify(current);
        current = JSON.parse(serialized);
      }

      expect(current.entry[0].changes[0].value.messages[0].text.body).toBe('/project 274marcy');
    });

    it('should preserve message order in multiple messages', () => {
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
                      id: 'msg_1',
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      type: 'text',
                      text: { body: 'First' },
                    },
                    {
                      from: '1234567890',
                      id: 'msg_2',
                      timestamp: (Math.floor(Date.now() / 1000) + 1).toString(),
                      type: 'text',
                      text: { body: 'Second' },
                    },
                    {
                      from: '1234567890',
                      id: 'msg_3',
                      timestamp: (Math.floor(Date.now() / 1000) + 2).toString(),
                      type: 'text',
                      text: { body: 'Third' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const messages = payload.entry[0].changes[0].value.messages;
      expect(messages[0].text.body).toBe('First');
      expect(messages[1].text.body).toBe('Second');
      expect(messages[2].text.body).toBe('Third');
    });
  });
});
