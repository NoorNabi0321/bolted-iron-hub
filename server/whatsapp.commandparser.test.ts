import { describe, it, expect } from 'vitest';
import {
  parseCommand,
  isValidCommandType,
  extractProjectName,
  validateCommandParameters,
  getCommandDescription,
  getCommandUsage,
  formatHelpText,
  normalizeCommand,
  commandRequiresProjectName,
} from './services/whatsappCommandParser';
import {
  getCommandMetadata,
  getCanonicalCommandName,
  commandExists,
  getAllCommandNames,
  getAllCommands,
  getProjectRequiredCommands,
  getProjectOptionalCommands,
  formatCommandHelp,
  resolveCommand,
  getCommandDescription as getRegDescription,
  getCommandUsage as getRegUsage,
  getCommandExamples,
  requiresProjectName as regRequiresProjectName,
  getCommandAliases,
} from './services/whatsappCommandRegistry';
import {
  validateProjectNameFormat,
  validateParameterCount,
  getMissingProjectNameError,
  getProjectNotFoundError,
  sanitizeProjectName,
  validateCommandSpecificParameters,
} from './services/whatsappParameterValidator';
import {
  routeCommand,
  getCommandHandler,
  commandRequiresProjectName as routerRequiresProjectName,
  formatRoutingError,
  formatRoutingSuccess,
  isValidRoutingResult,
  getCommandInfo,
  getCommandTypeFromMessage,
  getParametersFromMessage,
} from './services/whatsappCommandRouter';

describe('WhatsApp Command Parser - Phase 3', () => {
  describe('Command Parser Service', () => {
    describe('parseCommand', () => {
      it('should parse command with parameters', () => {
        const result = parseCommand('/project 274marcy');
        expect(result.isCommand).toBe(true);
        expect(result.commandType).toBe('project');
        expect(result.parameters).toEqual(['274marcy']);
      });

      it('should parse command without parameters', () => {
        const result = parseCommand('/help');
        expect(result.isCommand).toBe(true);
        expect(result.commandType).toBe('help');
        expect(result.parameters).toEqual([]);
      });

      it('should parse command with multiple parameters', () => {
        const result = parseCommand('/project 149 Hewes Street');
        expect(result.isCommand).toBe(true);
        expect(result.commandType).toBe('project');
        expect(result.parameters).toEqual(['149', 'Hewes', 'Street']);
      });

      it('should handle case-insensitivity', () => {
        const result = parseCommand('/PROJECT 274marcy');
        expect(result.isCommand).toBe(true);
        expect(result.commandType).toBe('project');
      });

      it('should handle whitespace', () => {
        const result = parseCommand('  /project  274marcy  ');
        expect(result.isCommand).toBe(true);
        expect(result.commandType).toBe('project');
      });

      it('should reject non-command messages', () => {
        const result = parseCommand('Hello world');
        expect(result.isCommand).toBe(false);
        expect(result.commandType).toBeNull();
      });

      it('should handle empty message', () => {
        const result = parseCommand('');
        expect(result.isCommand).toBe(false);
        expect(result.commandType).toBeNull();
      });

      it('should handle null message', () => {
        const result = parseCommand(null as any);
        expect(result.isCommand).toBe(false);
        expect(result.commandType).toBeNull();
      });
    });

    describe('isValidCommandType', () => {
      it('should validate known commands', () => {
        expect(isValidCommandType('project')).toBe(true);
        expect(isValidCommandType('status')).toBe(true);
        expect(isValidCommandType('help')).toBe(true);
      });

      it('should reject unknown commands', () => {
        expect(isValidCommandType('unknown')).toBe(false);
        expect(isValidCommandType('invalid')).toBe(false);
      });

      it('should handle null', () => {
        expect(isValidCommandType(null)).toBe(false);
      });
    });

    describe('extractProjectName', () => {
      it('should extract single word project name', () => {
        const result = extractProjectName(['274marcy']);
        expect(result).toBe('274marcy');
      });

      it('should extract multi-word project name', () => {
        const result = extractProjectName(['149', 'Hewes', 'Street']);
        expect(result).toBe('149 Hewes Street');
      });

      it('should handle empty parameters', () => {
        const result = extractProjectName([]);
        expect(result).toBeNull();
      });

      it('should handle whitespace-only parameters', () => {
        const result = extractProjectName(['   ']);
        expect(result).toBeNull();
      });
    });

    describe('validateCommandParameters', () => {
      it('should validate project command with parameters', async () => {
        const result = await validateCommandParameters('project', ['274marcy']);
        expect(result.isValid).toBe(true);
      });

      it('should reject project command without parameters', async () => {
        const result = await validateCommandParameters('project', []);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('requires a project name');
      });

      it('should validate help command without parameters', async () => {
        const result = await validateCommandParameters('help', []);
        expect(result.isValid).toBe(true);
      });

      it('should handle null command', async () => {
        const result = await validateCommandParameters(null, []);
        expect(result.isValid).toBe(false);
      });
    });

    describe('getCommandDescription', () => {
      it('should return description for known command', () => {
        const desc = getCommandDescription('project');
        expect(desc).toContain('project information');
      });

      it('should return description for unknown command', () => {
        const desc = getCommandDescription('unknown');
        expect(desc).toBeDefined();
      });
    });

    describe('getCommandUsage', () => {
      it('should return usage for known command', () => {
        const usage = getCommandUsage('project');
        expect(usage).toContain('/project');
      });

      it('should return empty string for unknown command', () => {
        const usage = getCommandUsage('unknown');
        expect(usage).toBe('');
      });
    });

    describe('formatHelpText', () => {
      it('should format help text with all commands', () => {
        const help = formatHelpText();
        expect(help).toContain('/project');
        expect(help).toContain('/status');
        expect(help).toContain('/team');
        expect(help).toContain('/deadline');
        expect(help).toContain('/checklist');
        expect(help).toContain('/notes');
        expect(help).toContain('/help');
      });

      it('should include command descriptions', () => {
        const help = formatHelpText();
        expect(help).toContain('project information');
        expect(help).toContain('status');
      });
    });

    describe('normalizeCommand', () => {
      it('should normalize command to lowercase', () => {
        expect(normalizeCommand('PROJECT')).toBe('project');
        expect(normalizeCommand('Project')).toBe('project');
      });

      it('should trim whitespace', () => {
        expect(normalizeCommand('  project  ')).toBe('project');
      });

      it('should handle null', () => {
        expect(normalizeCommand(null)).toBeNull();
      });
    });

    describe('commandRequiresProjectName', () => {
      it('should return true for project-required commands', () => {
        expect(commandRequiresProjectName('project')).toBe(true);
        expect(commandRequiresProjectName('status')).toBe(true);
        expect(commandRequiresProjectName('team')).toBe(true);
      });

      it('should return false for help command', () => {
        expect(commandRequiresProjectName('help')).toBe(false);
      });

      it('should handle null', () => {
        expect(commandRequiresProjectName(null)).toBe(false);
      });
    });
  });

  describe('Command Registry Service', () => {
    describe('getCommandMetadata', () => {
      it('should get metadata for known command', () => {
        const metadata = getCommandMetadata('project');
        expect(metadata).toBeDefined();
        expect(metadata?.name).toBe('project');
        expect(metadata?.requiresProjectName).toBe(true);
      });

      it('should get metadata by alias', () => {
        const metadata = getCommandMetadata('p');
        expect(metadata).toBeDefined();
        expect(metadata?.name).toBe('project');
      });

      it('should return null for unknown command', () => {
        const metadata = getCommandMetadata('unknown');
        expect(metadata).toBeNull();
      });
    });

    describe('getCanonicalCommandName', () => {
      it('should return canonical name for command', () => {
        expect(getCanonicalCommandName('project')).toBe('project');
      });

      it('should return canonical name for alias', () => {
        expect(getCanonicalCommandName('p')).toBe('project');
        expect(getCanonicalCommandName('s')).toBe('status');
      });

      it('should return null for unknown command', () => {
        expect(getCanonicalCommandName('unknown')).toBeNull();
      });
    });

    describe('commandExists', () => {
      it('should return true for existing commands', () => {
        expect(commandExists('project')).toBe(true);
        expect(commandExists('status')).toBe(true);
        expect(commandExists('help')).toBe(true);
      });

      it('should return true for aliases', () => {
        expect(commandExists('p')).toBe(true);
        expect(commandExists('s')).toBe(true);
      });

      it('should return false for unknown commands', () => {
        expect(commandExists('unknown')).toBe(false);
      });
    });

    describe('getAllCommandNames', () => {
      it('should return all command names', () => {
        const names = getAllCommandNames();
        expect(names).toContain('project');
        expect(names).toContain('status');
        expect(names).toContain('team');
        expect(names).toContain('deadline');
        expect(names).toContain('checklist');
        expect(names).toContain('notes');
        expect(names).toContain('help');
      });

      it('should return 7 commands', () => {
        const names = getAllCommandNames();
        expect(names.length).toBe(7);
      });
    });

    describe('getAllCommands', () => {
      it('should return all command metadata', () => {
        const commands = getAllCommands();
        expect(commands.length).toBe(7);
        expect(commands[0]).toHaveProperty('name');
        expect(commands[0]).toHaveProperty('aliases');
        expect(commands[0]).toHaveProperty('requiresProjectName');
      });
    });

    describe('getProjectRequiredCommands', () => {
      it('should return commands that require project name', () => {
        const commands = getProjectRequiredCommands();
        expect(commands).toContain('project');
        expect(commands).toContain('status');
        expect(commands).toContain('team');
        expect(commands).toContain('deadline');
        expect(commands).toContain('checklist');
        expect(commands).toContain('notes');
        expect(commands).not.toContain('help');
      });

      it('should return 6 commands', () => {
        const commands = getProjectRequiredCommands();
        expect(commands.length).toBe(6);
      });
    });

    describe('getProjectOptionalCommands', () => {
      it('should return commands that do not require project name', () => {
        const commands = getProjectOptionalCommands();
        expect(commands).toContain('help');
        expect(commands).not.toContain('project');
      });

      it('should return 1 command', () => {
        const commands = getProjectOptionalCommands();
        expect(commands.length).toBe(1);
      });
    });

    describe('formatCommandHelp', () => {
      it('should format help for specific command', () => {
        const help = formatCommandHelp('project');
        expect(help).toContain('/project');
        expect(help).toContain('project information');
      });

      it('should format general help', () => {
        const help = formatCommandHelp();
        expect(help).toContain('/project');
        expect(help).toContain('/status');
        expect(help).toContain('/help');
      });

      it('should return error for unknown command', () => {
        const help = formatCommandHelp('unknown');
        expect(help).toContain('not found');
      });
    });

    describe('resolveCommand', () => {
      it('should resolve command name', () => {
        expect(resolveCommand('project')).toBe('project');
      });

      it('should resolve alias', () => {
        expect(resolveCommand('p')).toBe('project');
        expect(resolveCommand('s')).toBe('status');
      });

      it('should handle case-insensitivity', () => {
        expect(resolveCommand('PROJECT')).toBe('project');
        expect(resolveCommand('P')).toBe('project');
      });

      it('should return null for unknown', () => {
        expect(resolveCommand('unknown')).toBeNull();
      });
    });

    describe('getCommandExamples', () => {
      it('should return examples for known command', () => {
        const examples = getCommandExamples('project');
        expect(examples.length).toBeGreaterThan(0);
        expect(examples[0]).toContain('/project');
      });

      it('should return empty array for unknown command', () => {
        const examples = getCommandExamples('unknown');
        expect(examples).toEqual([]);
      });
    });

    describe('getCommandAliases', () => {
      it('should return aliases for known command', () => {
        const aliases = getCommandAliases('project');
        expect(aliases).toContain('p');
        expect(aliases).toContain('info');
      });

      it('should return empty array for unknown command', () => {
        const aliases = getCommandAliases('unknown');
        expect(aliases).toEqual([]);
      });
    });
  });

  describe('Parameter Validator Service', () => {
    describe('validateProjectNameFormat', () => {
      it('should validate valid project name', () => {
        const result = validateProjectNameFormat('274marcy');
        expect(result.isValid).toBe(true);
      });

      it('should validate multi-word project name', () => {
        const result = validateProjectNameFormat('149 Hewes Street');
        expect(result.isValid).toBe(true);
      });

      it('should reject empty project name', () => {
        const result = validateProjectNameFormat('');
        expect(result.isValid).toBe(false);
      });

      it('should reject whitespace-only project name', () => {
        const result = validateProjectNameFormat('   ');
        expect(result.isValid).toBe(false);
      });

      it('should reject null project name', () => {
        const result = validateProjectNameFormat(null);
        expect(result.isValid).toBe(false);
      });

      it('should reject project name exceeding max length', () => {
        const longName = 'a'.repeat(256);
        const result = validateProjectNameFormat(longName);
        expect(result.isValid).toBe(false);
      });
    });

    describe('validateParameterCount', () => {
      it('should validate project command with parameters', () => {
        const result = validateParameterCount('project', ['274marcy']);
        expect(result.isValid).toBe(true);
      });

      it('should reject project command without parameters', () => {
        const result = validateParameterCount('project', []);
        expect(result.isValid).toBe(false);
      });

      it('should validate help command without parameters', () => {
        const result = validateParameterCount('help', []);
        expect(result.isValid).toBe(true);
      });

      it('should validate help command with one parameter', () => {
        const result = validateParameterCount('help', ['project']);
        expect(result.isValid).toBe(true);
      });

      it('should reject help command with multiple parameters', () => {
        const result = validateParameterCount('help', ['project', 'extra']);
        expect(result.isValid).toBe(false);
      });
    });

    describe('getMissingProjectNameError', () => {
      it('should return error message for project command', () => {
        const error = getMissingProjectNameError('project');
        expect(error).toContain('/project');
        expect(error).toContain('requires a project name');
      });

      it('should include usage example', () => {
        const error = getMissingProjectNameError('status');
        expect(error).toContain('/status');
        expect(error).toContain('274marcy');
      });
    });

    describe('getProjectNotFoundError', () => {
      it('should return error message for project not found', () => {
        const error = getProjectNotFoundError('unknown');
        expect(error).toContain('Project not found');
        expect(error).toContain('unknown');
      });

      it('should include troubleshooting tips', () => {
        const error = getProjectNotFoundError('test');
        expect(error).toContain('Check spelling');
      });
    });

    describe('sanitizeProjectName', () => {
      it('should trim whitespace', () => {
        expect(sanitizeProjectName('  274marcy  ')).toBe('274marcy');
      });

      it('should convert to lowercase', () => {
        expect(sanitizeProjectName('274MARCY')).toBe('274marcy');
      });

      it('should normalize whitespace', () => {
        expect(sanitizeProjectName('149  Hewes   Street')).toBe('149 hewes street');
      });

      it('should handle null', () => {
        expect(sanitizeProjectName(null)).toBe('');
      });
    });
  });

  describe('Command Router Service', () => {
    describe('routeCommand', () => {
      it('should route valid command', async () => {
        const result = await routeCommand('/project 274marcy');
        // Project validation will fail because project doesn't exist in DB
        // But command routing itself should work
        expect(result.commandType).toBe('project');
        expect(result.parameters).toEqual(['274marcy']);
      });

      it('should reject non-command message', async () => {
        const result = await routeCommand('Hello world');
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('Not a command');
      });

      it('should reject unknown command', async () => {
        const result = await routeCommand('/unknown');
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('Unknown command');
      });

      it('should reject command missing required parameter', async () => {
        const result = await routeCommand('/project');
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('requires a project name');
      });

      it('should route help command', async () => {
        const result = await routeCommand('/help');
        expect(result.isValid).toBe(true);
        expect(result.commandType).toBe('help');
      });
    });

    describe('getCommandHandler', () => {
      it('should return handler for known command', () => {
        const handler = getCommandHandler('project');
        expect(handler).toBe('handleProjectCommand');
      });

      it('should return handler for all commands', () => {
        expect(getCommandHandler('project')).toBe('handleProjectCommand');
        expect(getCommandHandler('status')).toBe('handleStatusCommand');
        expect(getCommandHandler('team')).toBe('handleTeamCommand');
        expect(getCommandHandler('deadline')).toBe('handleDeadlineCommand');
        expect(getCommandHandler('checklist')).toBe('handleChecklistCommand');
        expect(getCommandHandler('notes')).toBe('handleNotesCommand');
        expect(getCommandHandler('help')).toBe('handleHelpCommand');
      });

      it('should return null for unknown command', () => {
        const handler = getCommandHandler('unknown');
        expect(handler).toBeNull();
      });
    });

    describe('commandRequiresProjectName', () => {
      it('should return true for project-required commands', () => {
        expect(routerRequiresProjectName('project')).toBe(true);
        expect(routerRequiresProjectName('status')).toBe(true);
      });

      it('should return false for help command', () => {
        expect(routerRequiresProjectName('help')).toBe(false);
      });
    });

    describe('formatRoutingError', () => {
      it('should format error message', () => {
        const error = formatRoutingError('Test error');
        expect(error).toContain('Error');
        expect(error).toContain('Test error');
      });
    });

    describe('formatRoutingSuccess', () => {
      it('should format success message for project command', () => {
        const success = formatRoutingSuccess('project');
        expect(success).toContain('Fetching');
      });

      it('should format success message for all commands', () => {
        expect(formatRoutingSuccess('project')).toContain('Fetching');
        expect(formatRoutingSuccess('status')).toContain('Fetching');
        expect(formatRoutingSuccess('help')).toContain('Showing');
      });
    });

    describe('isValidRoutingResult', () => {
      it('should return true for valid result', async () => {
        const result = await routeCommand('/help');
        expect(isValidRoutingResult(result)).toBe(true);
      });

      it('should return false for invalid result', async () => {
        const result = await routeCommand('not a command');
        expect(isValidRoutingResult(result)).toBe(false);
      });
    });

    describe('getCommandInfo', () => {
      it('should extract command info from routing result', async () => {
        const routing = await routeCommand('/project 274marcy');
        const info = getCommandInfo(routing);
        expect(info.command).toBe('project');
        expect(info.parameters).toEqual(['274marcy']);
      });
    });

    describe('getCommandTypeFromMessage', () => {
      it('should extract command type from message', () => {
        const type = getCommandTypeFromMessage('/project 274marcy');
        expect(type).toBe('project');
      });

      it('should return null for non-command message', () => {
        const type = getCommandTypeFromMessage('Hello world');
        expect(type).toBeNull();
      });
    });

    describe('getParametersFromMessage', () => {
      it('should extract parameters from message', () => {
        const params = getParametersFromMessage('/project 274marcy');
        expect(params).toEqual(['274marcy']);
      });

      it('should extract multiple parameters', () => {
        const params = getParametersFromMessage('/project 149 Hewes Street');
        expect(params).toEqual(['149', 'Hewes', 'Street']);
      });

      it('should return empty array for command without parameters', () => {
        const params = getParametersFromMessage('/help');
        expect(params).toEqual([]);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should parse, validate, and route a complete command flow', async () => {
      const message = '/help';

      // Parse
      const parsed = parseCommand(message);
      expect(parsed.isCommand).toBe(true);

      // Route
      const routed = await routeCommand(message);
      expect(routed.isValid).toBe(true);
      expect(routed.commandType).toBe('help');

      // Get handler
      const handler = getCommandHandler(routed.commandType);
      expect(handler).toBe('handleHelpCommand');
    });

    it('should handle command with alias', async () => {
      const message = '/p';

      const parsed = parseCommand(message);
      expect(parsed.commandType).toBe('p');

      const canonical = getCanonicalCommandName(parsed.commandType);
      expect(canonical).toBe('project');

      // Note: routing will fail because project requires a parameter
      // but parsing and canonical resolution work
    });

    it('should handle invalid command gracefully', async () => {
      const message = '/unknown param';

      const routed = await routeCommand(message);
      expect(routed.isValid).toBe(false);
      expect(routed.errorMessage).toBeDefined();
      expect(routed.helpText).toBeDefined();
    });

    it('should handle help command', async () => {
      const message = '/help';

      const routed = await routeCommand(message);
      expect(routed.isValid).toBe(true);
      expect(routed.commandType).toBe('help');

      const handler = getCommandHandler(routed.commandType);
      expect(handler).toBe('handleHelpCommand');
    });

    it('should handle help for specific command', async () => {
      const message = '/help project';

      const routed = await routeCommand(message);
      expect(routed.isValid).toBe(true);
      expect(routed.commandType).toBe('help');
      expect(routed.parameters).toEqual(['project']);
    });
  });
});
