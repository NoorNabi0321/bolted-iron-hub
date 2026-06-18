/**
 * WhatsApp Command Handlers - Phase 4 Tests
 * Tests for all 7 command handlers
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  handleProjectCommand,
  handleStatusCommand,
  handleTeamCommand,
  handleDeadlineCommand,
  handleChecklistCommand,
  handleNotesCommand,
  handleHelpCommand,
  executeCommandHandler,
} from '../server/services/whatsappCommandHandlers';
import {
  executeWhatsAppCommand,
  processWhatsAppMessage,
  isWhatsAppCommand,
  validateCommand,
  getCommandTypeFromMessage,
  batchExecuteCommands,
  getCommandStatistics,
} from '../server/services/whatsappCommandExecutor';
import {
  lookupProjectByName,
  getProjectDeadlineInfo,
  getProjectChecklistInfo,
  getProjectNotesInfo,
  formatDateForWhatsApp,
  getStatusEmoji,
  getDeadlineStatusIndicator,
} from '../server/services/whatsappProjectLookup';

describe('WhatsApp Command Handlers - Phase 4', () => {
  describe('Project Lookup Service', () => {
    describe('formatDateForWhatsApp', () => {
      it('should format valid date correctly', () => {
        const date = new Date('2026-03-15');
        const formatted = formatDateForWhatsApp(date);
        expect(formatted).toContain('Mar');
        expect(formatted).toContain('2026');
      });

      it('should handle null date', () => {
        const formatted = formatDateForWhatsApp(null);
        expect(formatted).toBe('Not set');
      });
    });

    describe('getStatusEmoji', () => {
      it('should return correct emoji for Shop Drawings', () => {
        const emoji = getStatusEmoji('Shop Drawings');
        expect(emoji).toBe('📋');
      });

      it('should return correct emoji for Fabrication', () => {
        const emoji = getStatusEmoji('Fabrication');
        expect(emoji).toBe('🔨');
      });

      it('should return correct emoji for On-Site', () => {
        const emoji = getStatusEmoji('On-Site');
        expect(emoji).toBe('✅');
      });

      it('should return default emoji for unknown status', () => {
        const emoji = getStatusEmoji('Unknown');
        expect(emoji).toBe('📌');
      });
    });

    describe('getDeadlineStatusIndicator', () => {
      it('should return correct indicator for On-track', () => {
        const indicator = getDeadlineStatusIndicator('On-track');
        expect(indicator).toBe('✅');
      });

      it('should return correct indicator for At-risk', () => {
        const indicator = getDeadlineStatusIndicator('At-risk');
        expect(indicator).toBe('⚠️');
      });

      it('should return correct indicator for Overdue', () => {
        const indicator = getDeadlineStatusIndicator('Overdue');
        expect(indicator).toBe('❌');
      });

      it('should return default indicator for unknown status', () => {
        const indicator = getDeadlineStatusIndicator('Unknown');
        expect(indicator).toBe('📌');
      });
    });
  });

  describe('Command Handlers', () => {
    describe('handleProjectCommand', () => {
      it('should return error for non-existent project', async () => {
        const result = await handleProjectCommand('NonExistentProject123');
        expect(result).toContain('❌');
        expect(result).toContain('not found');
      });

      it('should handle project command gracefully', async () => {
        const result = await handleProjectCommand('274marcy');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should include project information in response', async () => {
        const result = await handleProjectCommand('274marcy');
        if (!result.includes('❌')) {
          expect(result).toContain('PROJECT INFORMATION');
        }
      });
    });

    describe('handleStatusCommand', () => {
      it('should return error for non-existent project', async () => {
        const result = await handleStatusCommand('NonExistentProject123');
        expect(result).toContain('❌');
        expect(result).toContain('not found');
      });

      it('should handle status command gracefully', async () => {
        const result = await handleStatusCommand('274marcy');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should include status in response', async () => {
        const result = await handleStatusCommand('274marcy');
        if (!result.includes('❌')) {
          expect(result).toContain('PROJECT STATUS');
        }
      });
    });

    describe('handleTeamCommand', () => {
      it('should return error for non-existent project', async () => {
        const result = await handleTeamCommand('NonExistentProject123');
        expect(result).toContain('❌');
        expect(result).toContain('not found');
      });

      it('should handle team command gracefully', async () => {
        const result = await handleTeamCommand('274marcy');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should include team information in response', async () => {
        const result = await handleTeamCommand('274marcy');
        if (!result.includes('❌')) {
          expect(result).toContain('PROJECT TEAM');
        }
      });
    });

    describe('handleDeadlineCommand', () => {
      it('should return error for non-existent project', async () => {
        const result = await handleDeadlineCommand('NonExistentProject123');
        expect(result).toContain('❌');
        expect(result).toContain('not found');
      });

      it('should handle deadline command gracefully', async () => {
        const result = await handleDeadlineCommand('274marcy');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should include deadline information in response', async () => {
        const result = await handleDeadlineCommand('274marcy');
        if (!result.includes('❌')) {
          expect(result).toContain('PROJECT DEADLINE');
        }
      });
    });

    describe('handleChecklistCommand', () => {
      it('should return error for non-existent project', async () => {
        const result = await handleChecklistCommand('NonExistentProject123');
        expect(result).toContain('❌');
        expect(result).toContain('not found');
      });

      it('should handle checklist command gracefully', async () => {
        const result = await handleChecklistCommand('274marcy');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should include checklist information in response', async () => {
        const result = await handleChecklistCommand('274marcy');
        if (!result.includes('❌')) {
          expect(result).toContain('PROJECT CHECKLIST');
        }
      });
    });

    describe('handleNotesCommand', () => {
      it('should return error for non-existent project', async () => {
        const result = await handleNotesCommand('NonExistentProject123');
        expect(result).toContain('❌');
        expect(result).toContain('not found');
      });

      it('should handle notes command gracefully', async () => {
        const result = await handleNotesCommand('274marcy');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should include notes information in response', async () => {
        const result = await handleNotesCommand('274marcy');
        if (!result.includes('❌')) {
          expect(result).toContain('PROJECT NOTES');
        }
      });
    });

    describe('handleHelpCommand', () => {
      it('should return help text', async () => {
        const result = await handleHelpCommand();
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });

      it('should include command list in help', async () => {
        const result = await handleHelpCommand();
        expect(result).toContain('project');
      });
    });

    describe('executeCommandHandler', () => {
      it('should execute project command', async () => {
        const result = await executeCommandHandler('project', '274marcy');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should execute help command without project name', async () => {
        const result = await executeCommandHandler('help');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should return error for unknown command', async () => {
        const result = await executeCommandHandler('unknown', 'test');
        expect(result).toContain('❌');
        expect(result).toContain('Unknown command');
      });

      it('should require project name for project command', async () => {
        const result = await executeCommandHandler('project');
        expect(result).toContain('❌');
        expect(result).toContain('required');
      });
    });
  });

  describe('Command Executor', () => {
    describe('executeWhatsAppCommand', () => {
      it('should execute valid command', async () => {
        const result = await executeWhatsAppCommand('/help');
        expect(result.success).toBe(true);
        expect(result.message).toBeDefined();
      });

      it('should handle invalid command', async () => {
        const result = await executeWhatsAppCommand('/unknown');
        expect(result.success).toBe(false);
        expect(result.message).toContain('Unknown command');
      });

      it('should handle non-command message', async () => {
        const result = await executeWhatsAppCommand('Hello world');
        expect(result.success).toBe(false);
        expect(result.message).toContain('Not a command');
      });
    });

    describe('processWhatsAppMessage', () => {
      it('should return response message', async () => {
        const message = await processWhatsAppMessage('/help');
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
      });

      it('should return error for invalid message', async () => {
        const message = await processWhatsAppMessage('/unknown');
        expect(message).toContain('Unknown command');
      });
    });

    describe('isWhatsAppCommand', () => {
      it('should return true for valid command', async () => {
        const result = await isWhatsAppCommand('/help');
        expect(result).toBe(true);
      });

      it('should return false for non-command', async () => {
        const result = await isWhatsAppCommand('Hello world');
        expect(result).toBe(false);
      });
    });

    describe('validateCommand', () => {
      it('should validate valid command', async () => {
        const result = await validateCommand('/help');
        expect(result.isValid).toBe(true);
      });

      it('should reject invalid command', async () => {
        const result = await validateCommand('/unknown');
        expect(result.isValid).toBe(false);
      });
    });

    describe('getCommandTypeFromMessage', () => {
      it('should extract command type', async () => {
        const type = await getCommandTypeFromMessage('/help');
        expect(type).toBe('help');
      });

      it('should return null for non-command', async () => {
        const type = await getCommandTypeFromMessage('Hello world');
        expect(type).toBeNull();
      });
    });

    describe('batchExecuteCommands', () => {
      it('should execute multiple commands', async () => {
        const messages = ['/help', '/help', '/help'];
        const results = await batchExecuteCommands(messages);
        expect(results.length).toBe(3);
        expect(results.every(r => r.success)).toBe(true);
      });

      it('should handle mixed valid and invalid commands', async () => {
        const messages = ['/help', '/unknown', 'Hello'];
        const results = await batchExecuteCommands(messages);
        expect(results.length).toBe(3);
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(false);
        expect(results[2].success).toBe(false);
      });
    });

    describe('getCommandStatistics', () => {
      it('should calculate statistics correctly', async () => {
        const messages = ['/help', '/help', '/unknown', 'Hello'];
        const stats = await getCommandStatistics(messages);
        expect(stats.totalMessages).toBe(4);
        expect(stats.validCommands).toBe(2);
        expect(stats.invalidMessages).toBe(2);
        expect(stats.commandTypes['help']).toBe(2);
      });

      it('should handle empty message array', async () => {
        const stats = await getCommandStatistics([]);
        expect(stats.totalMessages).toBe(0);
        expect(stats.validCommands).toBe(0);
        expect(stats.invalidMessages).toBe(0);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should execute complete command flow', async () => {
      const message = '/help';
      const result = await executeWhatsAppCommand(message);
      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should handle project command with lookup', async () => {
      const message = '/project 274marcy';
      const result = await executeWhatsAppCommand(message);
      // Project may or may not exist in DB, but command should execute
      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe('string');
    });

    it('should provide helpful error for missing project', async () => {
      const message = '/project NonExistentProject123';
      const result = await executeWhatsAppCommand(message);
      // Command executes, but project lookup fails
      expect(result.message).toBeDefined();
      expect(result.message).toContain('not found');
    });

    it('should handle all command types', async () => {
      const commands = [
        '/help',
        '/project 274marcy',
        '/status 274marcy',
        '/team 274marcy',
        '/deadline 274marcy',
        '/checklist 274marcy',
        '/notes 274marcy',
      ];

      for (const cmd of commands) {
        const result = await executeWhatsAppCommand(cmd);
        // All commands should return a message
        expect(result.message).toBeDefined();
        expect(typeof result.message).toBe('string');
        expect(result.message.length).toBeGreaterThan(0);
      }
    });

    it('should maintain consistency across multiple executions', async () => {
      const message = '/help';
      const result1 = await executeWhatsAppCommand(message);
      const result2 = await executeWhatsAppCommand(message);

      expect(result1.success).toBe(result2.success);
      expect(result1.message).toBe(result2.message);
    });

    it('should handle rapid command execution', async () => {
      const messages = Array(10).fill('/help');
      const results = await batchExecuteCommands(messages);

      expect(results.length).toBe(10);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should provide meaningful error messages', async () => {
      const testCases = [
        { message: '/unknown', expectedError: 'unknown command' },
        { message: 'Hello', expectedError: 'not a command' },
        { message: '/project', expectedError: 'project name' },
      ];

      for (const testCase of testCases) {
        const result = await executeWhatsAppCommand(testCase.message);
        expect(result.message.toLowerCase()).toContain(testCase.expectedError.toLowerCase());
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle null project name gracefully', async () => {
      const result = await executeCommandHandler('project', null);
      expect(result).toContain('❌');
    });

    it('should handle undefined project name gracefully', async () => {
      const result = await executeCommandHandler('project', undefined);
      expect(result).toContain('❌');
    });

    it('should handle empty message', async () => {
      const result = await executeWhatsAppCommand('');
      expect(result.success).toBe(false);
    });

    it('should handle very long project names', async () => {
      const longName = 'A'.repeat(1000);
      const result = await executeCommandHandler('project', longName);
      expect(result).toBeDefined();
    });

    it('should handle special characters in project name', async () => {
      const result = await executeCommandHandler('project', '@#$%^&*()');
      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should execute help command quickly', async () => {
      const start = Date.now();
      await executeWhatsAppCommand('/help');
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should execute batch commands efficiently', async () => {
      const messages = Array(20).fill('/help');
      const start = Date.now();
      await batchExecuteCommands(messages);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });
  });
});
