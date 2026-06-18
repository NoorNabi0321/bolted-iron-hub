/**
 * WhatsApp Response Service - Phase 5 Tests
 * Tests for response formatting, message sending, and integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatResponseMessage,
  formatErrorMessage,
  formatSuccessMessage,
  formatProjectInfo,
  formatList,
  formatChecklist,
  formatTable,
  formatDeadlineInfo,
  formatTeamInfo,
  formatCompletionPercentage,
  formatNotes,
  formatHelpMessage,
  truncateMessage,
  escapeWhatsAppText,
  formatCompleteMessage,
  checkMessageLimits,
  formatSafeMessage,
} from '../server/services/whatsappResponseFormatter';
import {
  validateMessage,
} from '../server/services/whatsappMessageSender';
import {
  handleWhatsAppMessageAndRespond,
  sendCommandResponse,
  sendErrorResponse,
  sendSuccessResponse,
  sendHelpMessage,
  sendBatchResponses,
  checkLimits,
  processWebhookMessageAndRespond,
} from '../server/services/whatsappResponseService';

describe('WhatsApp Response Service - Phase 5', () => {
  describe('Response Formatter', () => {
    describe('formatResponseMessage', () => {
      it('should format basic message', () => {
        const result = formatResponseMessage('Hello World');
        expect(result.text).toBe('Hello World');
        expect(result.length).toBe(11);
        expect(result.truncated).toBe(false);
      });

      it('should truncate long messages', () => {
        const longMessage = 'A'.repeat(5000);
        const result = formatResponseMessage(longMessage, { maxLength: 100 });
        expect(result.truncated).toBe(true);
        expect(result.length).toBeLessThanOrEqual(100);
      });

      it('should handle empty message', () => {
        const result = formatResponseMessage('');
        expect(result.text).toBe('');
        expect(result.length).toBe(0);
        expect(result.truncated).toBe(false);
      });
    });

    describe('formatErrorMessage', () => {
      it('should format error with emoji', () => {
        const message = formatErrorMessage('Something went wrong');
        expect(message).toContain('❌');
        expect(message).toContain('Something went wrong');
      });

      it('should include suggestion if provided', () => {
        const message = formatErrorMessage('Error', 'Try again');
        expect(message).toContain('Try again');
        expect(message).toContain('/help');
      });
    });

    describe('formatSuccessMessage', () => {
      it('should format success message', () => {
        const message = formatSuccessMessage('Operation completed');
        expect(message).toContain('✅');
        expect(message).toContain('Operation completed');
      });
    });

    describe('formatProjectInfo', () => {
      it('should format project information', () => {
        const message = formatProjectInfo('Test Project', 'On-Site', {
          'Address': 'Brooklyn, NY',
          'Status': 'Active',
        });
        expect(message).toContain('Test Project');
        expect(message).toContain('On-Site');
        expect(message).toContain('✅');
      });
    });

    describe('formatList', () => {
      it('should format list with items', () => {
        const message = formatList('Items', ['Item 1', 'Item 2', 'Item 3']);
        expect(message).toContain('Items');
        expect(message).toContain('• Item 1');
        expect(message).toContain('• Item 2');
        expect(message).toContain('• Item 3');
      });

      it('should handle empty list', () => {
        const message = formatList('Items', []);
        expect(message).toContain('No items');
      });
    });

    describe('formatChecklist', () => {
      it('should format checklist with status', () => {
        const items = [
          { text: 'Task 1', completed: true },
          { text: 'Task 2', completed: false },
        ];
        const message = formatChecklist('Checklist', items);
        expect(message).toContain('✅ Task 1');
        expect(message).toContain('⏳ Task 2');
      });
    });

    describe('formatTable', () => {
      it('should format table correctly', () => {
        const message = formatTable(
          'Data',
          ['Name', 'Status'],
          [['Item 1', 'Active'], ['Item 2', 'Inactive']]
        );
        expect(message).toContain('Name | Status');
        expect(message).toContain('Item 1 | Active');
      });
    });

    describe('formatDeadlineInfo', () => {
      it('should format deadline with days remaining', () => {
        const message = formatDeadlineInfo('Apr 30, 2026', 48, 'On-track');
        expect(message).toContain('Apr 30, 2026');
        expect(message).toContain('48 days');
        expect(message).toContain('✅');
      });

      it('should handle overdue deadline', () => {
        const message = formatDeadlineInfo('Mar 10, 2026', -3, 'Overdue');
        expect(message).toContain('3 days overdue');
        expect(message).toContain('❌');
      });
    });

    describe('formatTeamInfo', () => {
      it('should format team members', () => {
        const message = formatTeamInfo(['John Doe', 'Jane Smith']);
        expect(message).toContain('John Doe');
        expect(message).toContain('Jane Smith');
        expect(message).toContain('👤');
      });

      it('should handle empty team', () => {
        const message = formatTeamInfo([]);
        expect(message).toContain('No team members');
      });
    });

    describe('formatCompletionPercentage', () => {
      it('should format completion percentage', () => {
        const result = formatCompletionPercentage(8, 12);
        expect(result).toContain('67%');
        expect(result).toContain('8/12');
      });

      it('should handle zero total', () => {
        const result = formatCompletionPercentage(0, 0);
        expect(result).toBe('0%');
      });
    });

    describe('formatNotes', () => {
      it('should format notes with timestamps', () => {
        const notes = [
          { date: 'Mar 10', author: 'John', text: 'Note 1' },
          { date: 'Mar 09', author: 'Jane', text: 'Note 2' },
        ];
        const message = formatNotes(notes);
        expect(message).toContain('Mar 10');
        expect(message).toContain('John');
        expect(message).toContain('Note 1');
      });
    });

    describe('formatHelpMessage', () => {
      it('should format help message with commands', () => {
        const commands = [
          { command: '/help', description: 'Show help', example: '/help' },
        ];
        const message = formatHelpMessage(commands);
        expect(message).toContain('/help');
        expect(message).toContain('Show help');
      });
    });

    describe('truncateMessage', () => {
      it('should truncate long message', () => {
        const long = 'A'.repeat(5000);
        const result = truncateMessage(long, 100);
        expect(result.length).toBeLessThanOrEqual(100);
      });

      it('should not truncate short message', () => {
        const short = 'Hello';
        const result = truncateMessage(short, 100);
        expect(result).toBe('Hello');
      });
    });

    describe('escapeWhatsAppText', () => {
      it('should escape special characters', () => {
        const text = 'Hello *bold* _italic_ ~strikethrough~';
        const escaped = escapeWhatsAppText(text);
        expect(escaped).toContain('\\*');
        expect(escaped).toContain('\\_');
      });
    });

    describe('formatCompleteMessage', () => {
      it('should format complete message with title and footer', () => {
        const message = formatCompleteMessage(
          'Title',
          'Content',
          'Footer'
        );
        expect(message).toContain('Title');
        expect(message).toContain('Content');
        expect(message).toContain('Footer');
      });
    });

    describe('checkMessageLimits', () => {
      it('should check message within limits', () => {
        const result = checkMessageLimits('Hello');
        expect(result.withinLimit).toBe(true);
        expect(result.length).toBe(5);
      });

      it('should check message exceeding limits', () => {
        const long = 'A'.repeat(5000);
        const result = checkMessageLimits(long);
        expect(result.withinLimit).toBe(false);
      });
    });

    describe('formatSafeMessage', () => {
      it('should format message safely', () => {
        const message = formatSafeMessage('Hello *World*');
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
      });
    });
  });

  describe('Message Validation', () => {
    describe('validateMessage', () => {
      it('should validate correct message', () => {
        const result = validateMessage('Hello World');
        expect(result.valid).toBe(true);
      });

      it('should reject empty message', () => {
        const result = validateMessage('');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('empty');
      });

      it('should reject message exceeding limit', () => {
        const long = 'A'.repeat(5000);
        const result = validateMessage(long);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Response Service', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('handleWhatsAppMessageAndRespond', () => {
      it('should handle help command', async () => {
        const result = await handleWhatsAppMessageAndRespond('group123', '/help');
        expect(result.message).toBeDefined();
        expect(typeof result.message).toBe('string');
      });

      it('should handle invalid command', async () => {
        const result = await handleWhatsAppMessageAndRespond('group123', '/unknown');
        expect(result.message).toBeDefined();
      });
    });

    describe('sendCommandResponse', () => {
      it('should send command response', async () => {
        const result = await sendCommandResponse(
          'group123',
          'project',
          'Project information here'
        );
        expect(result.message).toBeDefined();
        expect(result.sentAt).toBeGreaterThan(0);
      });
    });

    describe('sendErrorResponse', () => {
      it('should send error response', async () => {
        const result = await sendErrorResponse(
          'group123',
          'Something went wrong',
          'Please try again'
        );
        expect(result.message).toContain('❌');
      });
    });

    describe('sendSuccessResponse', () => {
      it('should send success response', async () => {
        const result = await sendSuccessResponse(
          'group123',
          'Operation completed successfully'
        );
        expect(result.message).toContain('✅');
      });
    });

    describe('sendHelpMessage', () => {
      it('should send help message', async () => {
        const result = await sendHelpMessage('group123');
        expect(result.commandType).toBe('help');
        expect(result.message).toContain('Available Commands');
      });
    });

    describe('sendBatchResponses', () => {
      it('should send batch responses', async () => {
        const responses = [
          'Message 1',
          'Message 2',
          'Message 3',
        ];
        const results = await sendBatchResponses('group123', responses);
        expect(results.length).toBe(3);
        expect(results.every(r => r.sentAt > 0)).toBe(true);
      });

      it('should handle invalid messages in batch', async () => {
        const responses = [
          'Valid message',
          'A'.repeat(5000), // Too long
        ];
        const results = await sendBatchResponses('group123', responses);
        expect(results.length).toBe(2);
      });
    });

    describe('checkLimits', () => {
      it('should check message limits', () => {
        const result = checkLimits('Hello World');
        expect(result.withinLimit).toBe(true);
        expect(result.remaining).toBeGreaterThan(0);
      });
    });

    describe('processWebhookMessageAndRespond', () => {
      it('should process webhook message', async () => {
        const result = await processWebhookMessageAndRespond(
          'group123',
          '/help',
          '+1234567890'
        );
        expect(result.message).toBeDefined();
        expect(result.sentAt).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete message flow', async () => {
      const result = await handleWhatsAppMessageAndRespond('group123', '/help');
      expect(result.message).toBeDefined();
      expect(result.sentAt).toBeGreaterThan(0);
    });

    it('should format and send response', async () => {
      const formatted = formatCompleteMessage(
        'Test',
        'Content'
      );
      const validation = validateMessage(formatted);
      expect(validation.valid).toBe(true);
    });

    it('should handle error cases gracefully', async () => {
      const result = await sendErrorResponse(
        'group123',
        'Test error',
        'Test suggestion'
      );
      expect(result.message).toBeDefined();
    });

    it('should respect message limits', () => {
      const longMessage = 'A'.repeat(5000);
      const limits = checkLimits(longMessage);
      expect(limits.withinLimit).toBe(false);
    });
  });

  describe('Message Formatting Quality', () => {
    it('should format readable messages', () => {
      const message = formatCompleteMessage(
        'Project Status',
        'Status: Active\nDeadline: Apr 30, 2026',
        'Use /help for more'
      );
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain('Project Status');
    });

    it('should include helpful emojis', () => {
      const message = formatErrorMessage('Error occurred');
      expect(message).toContain('❌');
    });

    it('should format lists clearly', () => {
      const message = formatList('Commands', [
        '/project - Get project info',
        '/status - Get status',
        '/help - Show help',
      ]);
      expect(message).toContain('•');
    });

    it('should handle special characters safely', () => {
      const text = 'Project: 274 Marcy *Special* _Chars_';
      const safe = formatSafeMessage(text);
      expect(safe).toBeDefined();
      expect(typeof safe).toBe('string');
    });
  });

  describe('Performance', () => {
    it('should format message quickly', () => {
      const start = Date.now();
      formatCompleteMessage('Title', 'Content');
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should validate message quickly', () => {
      const start = Date.now();
      validateMessage('Test message');
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should handle batch responses efficiently', async () => {
      const responses = Array(10).fill('Test message');
      const start = Date.now();
      await sendBatchResponses('group123', responses);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Error Handling', () => {
    it('should handle null group chat ID', async () => {
      const result = await handleWhatsAppMessageAndRespond('', '/help');
      expect(result.message).toBeDefined();
    });

    it('should handle empty message', async () => {
      const result = await handleWhatsAppMessageAndRespond('group123', '');
      expect(result.message).toBeDefined();
    });

    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(10000);
      const result = await handleWhatsAppMessageAndRespond('group123', longMessage);
      expect(result.message).toBeDefined();
    });

    it('should handle special characters in group ID', async () => {
      const result = await handleWhatsAppMessageAndRespond('group-123_456', '/help');
      expect(result.message).toBeDefined();
    });
  });
});
