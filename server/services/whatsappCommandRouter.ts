/**
 * WhatsApp Command Router
 * Routes parsed commands to appropriate handlers
 */

import { parseCommand, isValidCommandType } from './whatsappCommandParser';
import { getCanonicalCommandName, formatCommandHelp } from './whatsappCommandRegistry';
import { validateCommandParameters } from './whatsappParameterValidator';

/**
 * Command routing result
 */
export interface CommandRoutingResult {
  isValid: boolean;
  commandType: string | null;
  parameters: string[];
  projectName?: string | null;
  errorMessage: string | null;
  helpText?: string | null;
}

/**
 * Route a WhatsApp message to the appropriate command handler
 * @param messageText - Raw message text from WhatsApp
 * @returns Command routing result
 */
export async function routeCommand(messageText: string): Promise<CommandRoutingResult> {
  // Parse the message
  const parsed = parseCommand(messageText);

  // If not a command, return error
  if (!parsed.isCommand) {
    return {
      isValid: false,
      commandType: null,
      parameters: [],
      errorMessage: 'Not a command. Commands start with /. Type /help for available commands.',
      helpText: formatCommandHelp(),
    };
  }

  // Validate command type
  if (!isValidCommandType(parsed.commandType)) {
    return {
      isValid: false,
      commandType: parsed.commandType,
      parameters: parsed.parameters,
      errorMessage: `Unknown command: /${parsed.commandType}. Type /help for available commands.`,
      helpText: formatCommandHelp(),
    };
  }

  // Get canonical command name
  const canonicalCommand = getCanonicalCommandName(parsed.commandType);

  if (!canonicalCommand) {
    return {
      isValid: false,
      commandType: parsed.commandType,
      parameters: parsed.parameters,
      errorMessage: `Unknown command: /${parsed.commandType}. Type /help for available commands.`,
    };
  }

  // Validate parameters
  const validation = await validateCommandParameters(canonicalCommand, parsed.parameters);

  if (!validation.isValid) {
    return {
      isValid: false,
      commandType: canonicalCommand,
      parameters: parsed.parameters,
      errorMessage: validation.errorMessage,
    };
  }

  // Command is valid and ready to be handled
  return {
    isValid: true,
    commandType: canonicalCommand,
    parameters: parsed.parameters,
    projectName: validation.projectName || null,
    errorMessage: null,
  };
}

/**
 * Get the handler function for a command
 * @param commandType - Command type
 * @returns Handler function name or null
 */
export function getCommandHandler(commandType: string | null): string | null {
  if (!commandType) return null;

  const canonicalCommand = getCanonicalCommandName(commandType);

  if (!canonicalCommand) return null;

  // Map commands to handler names
  const handlerMap: Record<string, string> = {
    project: 'handleProjectCommand',
    status: 'handleStatusCommand',
    team: 'handleTeamCommand',
    checklist: 'handleChecklistCommand',
    notes: 'handleNotesCommand',
    changes: 'handleChangesCommand',
    list: 'handleListCommand',
    count: 'handleCountCommand',
    insights: 'handleInsightsCommand',
    help: 'handleHelpCommand',
  };

  return handlerMap[canonicalCommand] || null;
}

/**
 * Check if a command requires project name
 * @param commandType - Command type
 * @returns boolean - True if project name is required
 */
export function commandRequiresProjectName(commandType: string | null): boolean {
  if (!commandType) return false;

  const canonicalCommand = getCanonicalCommandName(commandType);

  if (!canonicalCommand) return false;

  const projectRequiredCommands = ['project', 'status', 'team', 'checklist', 'notes', 'changes'];

  return projectRequiredCommands.includes(canonicalCommand);
}

/**
 * Format routing error message
 * @param error - Error message
 * @returns Formatted error message
 */
export function formatRoutingError(error: string): string {
  return `Error: ${error}`;
}

/**
 * Format routing success message
 * @param commandType - Command type
 * @returns Success message
 */
export function formatRoutingSuccess(commandType: string | null): string {
  if (!commandType) return '';

  const canonicalCommand = getCanonicalCommandName(commandType);

  if (!canonicalCommand) return '';

  const messages: Record<string, string> = {
    project: 'Fetching project information...',
    status: 'Fetching project status...',
    team: 'Fetching team information...',
    deadline: 'Fetching deadline information...',
    checklist: 'Fetching checklist items...',
    notes: 'Fetching project notes...',
    help: 'Showing available commands...',
  };

  return messages[canonicalCommand] || 'Processing command...';
}

/**
 * Validate routing result
 * @param result - Routing result to validate
 * @returns boolean - True if routing result is valid
 */
export function isValidRoutingResult(result: CommandRoutingResult): boolean {
  return result.isValid && result.commandType !== null && result.errorMessage === null;
}

/**
 * Get command info from routing result
 * @param result - Routing result
 * @returns Command info object
 */
export function getCommandInfo(result: CommandRoutingResult): {
  command: string | null;
  parameters: string[];
  projectName: string | null;
} {
  return {
    command: result.commandType,
    parameters: result.parameters,
    projectName: result.projectName || null,
  };
}

/**
 * Route command and get handler name
 * @param messageText - Raw message text
 * @returns Handler name or error message
 */
export async function getCommandHandlerName(messageText: string): Promise<string | null> {
  const routing = await routeCommand(messageText);

  if (!routing.isValid) {
    return null;
  }

  return getCommandHandler(routing.commandType);
}

/**
 * Check if message is a valid command
 * @param messageText - Message text to check
 * @returns boolean - True if message is a valid command
 */
export async function isValidCommand(messageText: string): Promise<boolean> {
  const routing = await routeCommand(messageText);
  return routing.isValid;
}

/**
 * Get command type from message
 * @param messageText - Message text
 * @returns Command type or null
 */
export function getCommandTypeFromMessage(messageText: string): string | null {
  const parsed = parseCommand(messageText);
  return parsed.isCommand ? getCanonicalCommandName(parsed.commandType) : null;
}

/**
 * Get parameters from message
 * @param messageText - Message text
 * @returns Parameters array
 */
export function getParametersFromMessage(messageText: string): string[] {
  const parsed = parseCommand(messageText);
  return parsed.parameters;
}
