/**
 * WhatsApp Command Parser Service
 * Parses user commands from WhatsApp messages
 * Pattern: /command [parameter1] [parameter2]
 * Examples: /project 274marcy, /status 274marcy, /help
 */

/**
 * Parsed command interface
 */
export interface ParsedCommand {
  isCommand: boolean;
  commandType: string | null;
  parameters: string[];
  rawMessage: string;
}

/**
 * Parse a WhatsApp message and extract command information
 * @param messageText - Raw message text from WhatsApp
 * @returns Parsed command object
 */
export function parseCommand(messageText: string): ParsedCommand {
  if (!messageText || typeof messageText !== 'string') {
    return {
      isCommand: false,
      commandType: null,
      parameters: [],
      rawMessage: messageText || '',
    };
  }

  const trimmed = messageText.trim();

  // Check if message starts with /
  if (!trimmed.startsWith('/')) {
    return {
      isCommand: false,
      commandType: null,
      parameters: [],
      rawMessage: messageText,
    };
  }

  // Split message into parts
  const parts = trimmed.split(/\s+/);
  const commandPart = parts[0].toLowerCase();

  // Extract command name (remove leading /)
  const commandType = commandPart.substring(1);

  // Extract parameters (everything after the command)
  const parameters = parts.slice(1);

  return {
    isCommand: true,
    commandType,
    parameters,
    rawMessage: messageText,
  };
}

/**
 * Validate if a command type is recognized
 * @param commandType - Command type to validate
 * @returns boolean - True if command is recognized
 */
export function isValidCommandType(commandType: string | null): boolean {
  if (!commandType) return false;

  const validCommands = ['project', 'status', 'team', 'checklist', 'notes', 'changes', 'list', 'count', 'insights', 'help'];
  return validCommands.includes(commandType.toLowerCase());
}

/**
 * Extract project name from command parameters
 * @param parameters - Command parameters
 * @returns Project name or null
 */
export function extractProjectName(parameters: string[]): string | null {
  if (!parameters || parameters.length === 0) {
    return null;
  }

  // Join all parameters as project name (handles multi-word project names)
  return parameters.join(' ').trim() || null;
}

/**
 * Validate command parameters
 * @param commandType - Command type
 * @param parameters - Command parameters
 * @returns Validation result with error message if invalid
 */
export function validateCommandParameters(
  commandType: string | null,
  parameters: string[]
): {
  isValid: boolean;
  errorMessage: string | null;
} {
  if (!commandType) {
    return {
      isValid: false,
      errorMessage: 'No command specified',
    };
  }

  const normalizedCommand = commandType.toLowerCase();

  // Commands that require a project name parameter
  const projectRequiredCommands = ['project', 'status', 'team', 'deadline', 'checklist', 'notes'];

  if (projectRequiredCommands.includes(normalizedCommand)) {
    if (parameters.length === 0) {
      return {
        isValid: false,
        errorMessage: `Command /${normalizedCommand} requires a project name. Usage: /${normalizedCommand} <project-name>`,
      };
    }
  }

  // /help command doesn't require parameters
  if (normalizedCommand === 'help') {
    // Help can optionally take a command name as parameter
    // but it's not required
  }

  return {
    isValid: true,
    errorMessage: null,
  };
}

/**
 * Get command description
 * @param commandType - Command type
 * @returns Command description
 */
export function getCommandDescription(commandType: string | null): string {
  if (!commandType) return '';

  const descriptions: Record<string, string> = {
    project: 'Get full project information (name, address, status, team, deadline, checklist, notes)',
    status: 'Get current project status only',
    team: 'List all assigned subcontractors',
    deadline: 'Show project deadline and days remaining',
    checklist: 'Show project checklist items and completion status',
    notes: 'Show additional project notes',
    help: 'List all available commands and their usage',
  };

  return descriptions[commandType.toLowerCase()] || 'Unknown command';
}

/**
 * Get command usage example
 * @param commandType - Command type
 * @returns Usage example
 */
export function getCommandUsage(commandType: string | null): string {
  if (!commandType) return '';

  const usages: Record<string, string> = {
    project: '/project 274marcy',
    status: '/status 274marcy',
    team: '/team 274marcy',
    deadline: '/deadline 274marcy',
    checklist: '/checklist 274marcy',
    notes: '/notes 274marcy',
    help: '/help',
  };

  return usages[commandType.toLowerCase()] || '';
}

/**
 * Format command help text
 * @returns Formatted help text
 */
export function formatHelpText(): string {
  const commands = [
    { name: 'project', usage: '/project <project-name>', desc: 'Get full project information' },
    { name: 'status', usage: '/status <project-name>', desc: 'Get current project status' },
    { name: 'team', usage: '/team <project-name>', desc: 'List assigned subcontractors' },
    { name: 'deadline', usage: '/deadline <project-name>', desc: 'Show project deadline' },
    { name: 'checklist', usage: '/checklist <project-name>', desc: 'Show checklist items' },
    { name: 'notes', usage: '/notes <project-name>', desc: 'Show project notes' },
    { name: 'help', usage: '/help', desc: 'List all available commands' },
  ];

  let helpText = '*Available Commands:*\n\n';

  for (const cmd of commands) {
    helpText += `*${cmd.usage}*\n${cmd.desc}\n\n`;
  }

  helpText += 'Example: /project 274marcy';

  return helpText;
}

/**
 * Normalize command for comparison
 * @param command - Command to normalize
 * @returns Normalized command
 */
export function normalizeCommand(command: string | null): string | null {
  if (!command) return null;
  return command.toLowerCase().trim();
}

/**
 * Check if command requires project name
 * @param commandType - Command type
 * @returns boolean - True if project name is required
 */
export function commandRequiresProjectName(commandType: string | null): boolean {
  if (!commandType) return false;

  const projectRequiredCommands = ['project', 'status', 'team', 'deadline', 'checklist', 'notes'];
  return projectRequiredCommands.includes(commandType.toLowerCase());
}
