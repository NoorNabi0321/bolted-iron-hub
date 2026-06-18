/**
 * WhatsApp Command Parameter Validator
 * Validates command parameters and provides helpful error messages
 */

import { getProjectById, getAllProjects } from '../db';
import { getCanonicalCommandName, requiresProjectName } from './whatsappCommandRegistry';

/**
 * Parameter validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errorMessage: string | null;
  projectName?: string | null;
}

/**
 * Validate command parameters
 * @param commandType - Command type
 * @param parameters - Command parameters
 * @returns Validation result
 */
export async function validateCommandParameters(
  commandType: string | null,
  parameters: string[]
): Promise<ValidationResult> {
  if (!commandType) {
    return {
      isValid: false,
      errorMessage: 'No command specified. Type /help to see available commands.',
    };
  }

  const canonicalCommand = getCanonicalCommandName(commandType);

  if (!canonicalCommand) {
    return {
      isValid: false,
      errorMessage: `Unknown command: /${commandType}. Type /help to see available commands.`,
    };
  }

  // Check if command requires project name
  if (requiresProjectName(canonicalCommand)) {
    if (!parameters || parameters.length === 0) {
      return {
        isValid: false,
        errorMessage: `Command /${canonicalCommand} requires a project name.\nUsage: /${canonicalCommand} <project-name>\nExample: /${canonicalCommand} 274marcy`,
      };
    }

    // Extract project name from parameters
    const projectName = parameters.join(' ').trim();

    if (projectName.length === 0) {
      return {
        isValid: false,
        errorMessage: `Project name cannot be empty.\nUsage: /${canonicalCommand} <project-name>`,
      };
    }

    if (projectName.length > 255) {
      return {
        isValid: false,
        errorMessage: 'Project name is too long (max 255 characters).',
      };
    }

    // Validate that project exists
    const project = await validateProjectExists(projectName);

    if (!project) {
      return {
        isValid: false,
        errorMessage: `Project not found: "${projectName}"\n\nTry:\n• Check spelling\n• Use project address (e.g., "274 Marcy")\n• Type /help for command syntax`,
      };
    }

    return {
      isValid: true,
      errorMessage: null,
      projectName: project.name,
    };
  }

  // Help command can optionally take a command name
  if (canonicalCommand === 'help') {
    if (parameters.length > 0) {
      const helpCommand = parameters[0].toLowerCase();
      const canonicalHelpCommand = getCanonicalCommandName(helpCommand);

      if (!canonicalHelpCommand) {
        return {
          isValid: false,
          errorMessage: `Unknown command: ${helpCommand}. Type /help to see all available commands.`,
        };
      }
    }

    return {
      isValid: true,
      errorMessage: null,
    };
  }

  return {
    isValid: true,
    errorMessage: null,
  };
}

/**
 * Validate that a project exists in the database
 * @param projectName - Project name to validate
 * @returns Project object or null
 */
async function validateProjectExists(projectName: string): Promise<any> {
  try {
    // Get all projects and do fuzzy matching
    const projects = await getAllProjects();

    if (!projects || projects.length === 0) {
      return null;
    }

    const searchTerm = projectName.toLowerCase().trim();

    // Try exact match first (case-insensitive)
    for (const project of projects) {
      if (project.name.toLowerCase() === searchTerm) {
        return project;
      }
    }

    // Try partial match (contains search term)
    for (const project of projects) {
      if (project.name.toLowerCase().includes(searchTerm)) {
        return project;
      }
    }

    // Try reverse match (search term contains project name)
    for (const project of projects) {
      if (searchTerm.includes(project.name.toLowerCase())) {
        return project;
      }
    }

    return null;
  } catch (error) {
    console.error('[WhatsApp] Error validating project:', error);
    return null;
  }
}

/**
 * Validate project name format
 * @param projectName - Project name to validate
 * @returns Validation result
 */
export function validateProjectNameFormat(projectName: string | null): ValidationResult {
  if (!projectName) {
    return {
      isValid: false,
      errorMessage: 'Project name is required.',
    };
  }

  const trimmed = projectName.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      errorMessage: 'Project name cannot be empty or whitespace only.',
    };
  }

  if (trimmed.length > 255) {
    return {
      isValid: false,
      errorMessage: 'Project name is too long (maximum 255 characters).',
    };
  }

  // Check for invalid characters (optional - can be customized)
  // Allow alphanumeric, spaces, hyphens, periods, and common address characters
  const validPattern = /^[a-zA-Z0-9\s\-.,#&()]+$/;
  if (!validPattern.test(trimmed)) {
    return {
      isValid: false,
      errorMessage: 'Project name contains invalid characters. Use only letters, numbers, spaces, and common punctuation.',
    };
  }

  return {
    isValid: true,
    errorMessage: null,
    projectName: trimmed,
  };
}

/**
 * Validate command has correct number of parameters
 * @param commandType - Command type
 * @param parameters - Command parameters
 * @returns Validation result
 */
export function validateParameterCount(
  commandType: string | null,
  parameters: string[]
): ValidationResult {
  if (!commandType) {
    return {
      isValid: false,
      errorMessage: 'No command specified.',
    };
  }

  const canonicalCommand = getCanonicalCommandName(commandType);

  if (!canonicalCommand) {
    return {
      isValid: false,
      errorMessage: `Unknown command: /${commandType}`,
    };
  }

  // Commands that require exactly one parameter (project name)
  const projectRequiredCommands = ['project', 'status', 'team', 'deadline', 'checklist', 'notes', 'changes'];

  if (projectRequiredCommands.includes(canonicalCommand)) {
    if (parameters.length === 0) {
      return {
        isValid: false,
        errorMessage: `Command /${canonicalCommand} requires a project name.`,
      };
    }
  }

  // Help command is optional
  if (canonicalCommand === 'help') {
    // Help can take 0 or 1 parameter
    if (parameters.length > 1) {
      return {
        isValid: false,
        errorMessage: 'Help command takes at most one parameter (command name).',
      };
    }
  }

  return {
    isValid: true,
    errorMessage: null,
  };
}

/**
 * Get helpful error message for missing project name
 * @param commandType - Command type
 * @returns Error message
 */
export function getMissingProjectNameError(commandType: string | null): string {
  const canonicalCommand = getCanonicalCommandName(commandType);

  if (!canonicalCommand) {
    return 'Unknown command.';
  }

  return `Command /${canonicalCommand} requires a project name.\n\nUsage: /${canonicalCommand} <project-name>\n\nExamples:\n• /${canonicalCommand} 274marcy\n• /${canonicalCommand} 149 Hewes Street\n• /${canonicalCommand} 216 East 201st`;
}

/**
 * Get helpful error message for project not found
 * @param projectName - Project name that was not found
 * @returns Error message
 */
export function getProjectNotFoundError(projectName: string): string {
  return `Project not found: "${projectName}"\n\nTroubleshooting:\n• Check spelling and capitalization\n• Try using the full address\n• Use project number if available\n\nExample: /project 274marcy`;
}

/**
 * Sanitize project name for database query
 * @param projectName - Project name to sanitize
 * @returns Sanitized project name
 */
export function sanitizeProjectName(projectName: string | null): string {
  if (!projectName) return '';

  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Validate parameters for specific command
 * @param commandType - Command type
 * @param parameters - Command parameters
 * @returns Validation result with specific error messages
 */
export function validateCommandSpecificParameters(
  commandType: string | null,
  parameters: string[]
): ValidationResult {
  const canonicalCommand = getCanonicalCommandName(commandType);

  if (!canonicalCommand) {
    return {
      isValid: false,
      errorMessage: `Unknown command: /${commandType}. Type /help for available commands.`,
    };
  }

  // Project-required commands validation
  if (['project', 'status', 'team', 'deadline', 'checklist', 'notes', 'changes'].includes(canonicalCommand)) {
    if (parameters.length === 0) {
      return {
        isValid: false,
        errorMessage: getMissingProjectNameError(canonicalCommand),
      };
    }

    const projectName = parameters.join(' ').trim();
    const formatValidation = validateProjectNameFormat(projectName);

    if (!formatValidation.isValid) {
      return formatValidation;
    }
  }

  // Help command validation
  if (canonicalCommand === 'help') {
    if (parameters.length > 1) {
      return {
        isValid: false,
        errorMessage: 'Help command takes at most one parameter (command name).',
      };
    }

    if (parameters.length === 1) {
      const helpCommand = parameters[0].toLowerCase();
      if (!getCanonicalCommandName(helpCommand)) {
        return {
          isValid: false,
          errorMessage: `Unknown command: ${helpCommand}. Type /help to see all commands.`,
        };
      }
    }
  }

  return {
    isValid: true,
    errorMessage: null,
  };
}
