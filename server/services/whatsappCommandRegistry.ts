/**
 * WhatsApp Command Registry
 * Defines all supported commands with metadata and handler references
 */

/**
 * Command metadata interface
 */
export interface CommandMetadata {
  name: string;
  aliases: string[];
  requiresProjectName: boolean;
  description: string;
  usage: string;
  examples: string[];
}

/**
 * Command registry type
 */
type CommandRegistry = Record<string, CommandMetadata>;

/**
 * All supported commands with metadata
 */
export const COMMAND_REGISTRY: CommandRegistry = {
  project: {
    name: 'project',
    aliases: ['p', 'info', 'details'],
    requiresProjectName: true,
    description: 'Get full project information including name, address, status, team, deadline, checklist, and notes',
    usage: '/project <project-name>',
    examples: ['/project 274marcy', '/project 149 Hewes Street', '/p 274marcy'],
  },

  team: {
    name: 'team',
    aliases: ['t', 'members', 'subcontractors', 'crew'],
    requiresProjectName: true,
    description: 'List all assigned subcontractors with their roles',
    usage: '/team <project-name>',
    examples: ['/team 274marcy', '/team 149 Hewes Street', '/t 274marcy'],
  },

  checklist: {
    name: 'checklist',
    aliases: ['c', 'items', 'tasks', 'todo'],
    requiresProjectName: true,
    description: 'Show all checklist items with Pending or Completed status',
    usage: '/checklist <project-name>',
    examples: ['/checklist 274marcy', '/checklist 149 Hewes Street', '/c 274marcy'],
  },
  notes: {
    name: 'notes',
    aliases: ['n', 'note', 'comments', 'remarks'],
    requiresProjectName: true,
    description: 'Show project notes',
    usage: '/notes <project-name>',
    examples: ['/notes 274marcy', '/notes 149 Hewes Street', '/n 274marcy'],
  },

  list: {
    name: 'list',
    aliases: ['l', 'projects', 'all'],
    requiresProjectName: false,
    description: 'List all projects or projects for a specific date (YYYY-MM-DD)',
    usage: '/list [date]',
    examples: ['/list', '/list 2026-03-17', '/l 2026-03-17'],
  },

  insights: {
    name: 'insights',
    aliases: ['i', 'dashboard', 'stats', 'analytics'],
    requiresProjectName: false,
    description: 'Show dashboard insights with project summary and pipeline status',
    usage: '/insights',
    examples: ['/insights', '/i', '/dashboard'],
  },
  help: {
    name: 'help',
    aliases: ['h', 'commands', 'usage', '?'],
    requiresProjectName: false,
    description: 'List all available commands with syntax and descriptions',
    usage: '/help',
    examples: ['/help', '/h', '/?'],
  },
};

/**
 * Get command metadata by command name
 * @param commandName - Command name to look up
 * @returns Command metadata or null if not found
 */
export function getCommandMetadata(commandName: string | null): CommandMetadata | null {
  if (!commandName) return null;

  const normalized = commandName.toLowerCase().trim();

  // Check if it's a direct command name
  if (COMMAND_REGISTRY[normalized]) {
    return COMMAND_REGISTRY[normalized];
  }

  // Check if it's an alias
  for (const [, metadata] of Object.entries(COMMAND_REGISTRY)) {
    if (metadata.aliases.includes(normalized)) {
      return metadata;
    }
  }

  return null;
}

/**
 * Get canonical command name from command or alias
 * @param commandName - Command name or alias
 * @returns Canonical command name or null
 */
export function getCanonicalCommandName(commandName: string | null): string | null {
  const metadata = getCommandMetadata(commandName);
  return metadata ? metadata.name : null;
}

/**
 * Check if a command exists (by name or alias)
 * @param commandName - Command name to check
 * @returns boolean - True if command exists
 */
export function commandExists(commandName: string | null): boolean {
  return getCommandMetadata(commandName) !== null;
}

/**
 * Get all command names
 * @returns Array of command names
 */
export function getAllCommandNames(): string[] {
  return Object.keys(COMMAND_REGISTRY);
}

/**
 * Get all commands with their metadata
 * @returns Array of command metadata
 */
export function getAllCommands(): CommandMetadata[] {
  return Object.values(COMMAND_REGISTRY);
}

/**
 * Get commands that require a project name
 * @returns Array of command names
 */
export function getProjectRequiredCommands(): string[] {
  return Object.values(COMMAND_REGISTRY)
    .filter(cmd => cmd.requiresProjectName)
    .map(cmd => cmd.name);
}

/**
 * Get commands that don't require a project name
 * @returns Array of command names
 */
export function getProjectOptionalCommands(): string[] {
  return Object.values(COMMAND_REGISTRY)
    .filter(cmd => !cmd.requiresProjectName)
    .map(cmd => cmd.name);
}

/**
 * Format command help for display
 * @param commandName - Optional command name to get help for specific command
 * @param enabledCommands - Optional list of enabled commands from database
 * @returns Formatted help text
 */
export function formatCommandHelp(commandName?: string | null, enabledCommands?: string[]): string {
  if (commandName) {
    const metadata = getCommandMetadata(commandName);
    if (!metadata) {
      return `Command not found: ${commandName}. Type /help to see all available commands.`;
    }

    let help = `*${metadata.usage}*\n`;
    help += `${metadata.description}\n\n`;

    if (metadata.aliases.length > 0) {
      help += `*Aliases:* ${metadata.aliases.map(a => `/${a}`).join(', ')}\n\n`;
    }

    help += `*Examples:*\n`;
    for (const example of metadata.examples) {
      help += `${example}\n`;
    }

    return help;
  }

  // Return general help for all commands
  let help = '*Available Commands:*\n\n';

  // If enabledCommands list is provided, only show those commands
  const commandsToShow = enabledCommands && enabledCommands.length > 0
    ? enabledCommands
    : Object.keys(COMMAND_REGISTRY);

  for (const cmdName of commandsToShow) {
    const cmd = COMMAND_REGISTRY[cmdName];
    if (cmd) {
      help += `*${cmd.usage}*\n${cmd.description}\n\n`;
    }
  }

  help += 'Type /help <command> for more details on a specific command.\n';
  help += 'Example: /help project';

  return help;
}

/**
 * Get command by name or alias (case-insensitive)
 * @param input - Command name or alias
 * @returns Command name or null
 */
export function resolveCommand(input: string | null): string | null {
  if (!input) return null;

  const normalized = input.toLowerCase().trim();

  // Direct match
  if (COMMAND_REGISTRY[normalized]) {
    return normalized;
  }

  // Alias match
  for (const [name, metadata] of Object.entries(COMMAND_REGISTRY)) {
    if (metadata.aliases.includes(normalized)) {
      return name;
    }
  }

  return null;
}

/**
 * Get command description
 * @param commandName - Command name
 * @returns Description or empty string
 */
export function getCommandDescription(commandName: string | null): string {
  const metadata = getCommandMetadata(commandName);
  return metadata ? metadata.description : '';
}

/**
 * Get command usage
 * @param commandName - Command name
 * @returns Usage string or empty string
 */
export function getCommandUsage(commandName: string | null): string {
  const metadata = getCommandMetadata(commandName);
  return metadata ? metadata.usage : '';
}

/**
 * Get command examples
 * @param commandName - Command name
 * @returns Array of examples
 */
export function getCommandExamples(commandName: string | null): string[] {
  const metadata = getCommandMetadata(commandName);
  return metadata ? metadata.examples : [];
}

/**
 * Check if command requires project name
 * @param commandName - Command name
 * @returns boolean - True if project name is required
 */
export function requiresProjectName(commandName: string | null): boolean {
  const metadata = getCommandMetadata(commandName);
  return metadata ? metadata.requiresProjectName : false;
}

/**
 * Get all aliases for a command
 * @param commandName - Command name
 * @returns Array of aliases
 */
export function getCommandAliases(commandName: string | null): string[] {
  const metadata = getCommandMetadata(commandName);
  return metadata ? metadata.aliases : [];
}
