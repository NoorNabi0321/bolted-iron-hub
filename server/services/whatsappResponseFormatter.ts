/**
 * WhatsApp Response Formatter Service
 * Formats responses for optimal WhatsApp readability
 */

/**
 * Response formatting options
 */
export interface FormattingOptions {
  maxLength?: number;
  includeEmojis?: boolean;
  useBold?: boolean;
  useLineBreaks?: boolean;
}

/**
 * Formatted message result
 */
export interface FormattedMessage {
  text: string;
  length: number;
  truncated: boolean;
  originalLength: number;
}

/**
 * Default formatting options
 */
const DEFAULT_OPTIONS: FormattingOptions = {
  maxLength: 4096, // WhatsApp message limit
  includeEmojis: true,
  useBold: true,
  useLineBreaks: true,
};

/**
 * Status emoji mapping
 */
const STATUS_EMOJI_MAP: Record<string, string> = {
  'Shop Drawings': '📋',
  'Fabrication': '🔨',
  'On-Site': '✅',
  'Installed': '⚙️',
  'Inspection Passed': '✔️',
};

/**
 * Format a response message for WhatsApp
 * @param message - Raw message text
 * @param options - Formatting options
 * @returns Formatted message
 */
export function formatResponseMessage(
  message: string,
  options: FormattingOptions = {}
): FormattedMessage {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!message) {
    return {
      text: '',
      length: 0,
      truncated: false,
      originalLength: 0,
    };
  }

  let formatted = message;
  const originalLength = message.length;

  // Truncate if necessary
  let truncated = false;
  if (opts.maxLength && formatted.length > opts.maxLength) {
    formatted = formatted.substring(0, opts.maxLength - 3) + '...';
    truncated = true;
  }

  return {
    text: formatted,
    length: formatted.length,
    truncated,
    originalLength,
  };
}

/**
 * Format error message for WhatsApp
 * @param error - Error message
 * @param suggestion - Helpful suggestion
 * @returns Formatted error message
 */
export function formatErrorMessage(error: string, suggestion?: string): string {
  let message = `❌ ${error}`;

  if (suggestion) {
    message += `\n\n💡 ${suggestion}`;
  }

  message += '\n\nType /help for available commands.';

  return message;
}

/**
 * Format success message for WhatsApp
 * @param message - Success message
 * @returns Formatted success message
 */
export function formatSuccessMessage(message: string): string {
  return `✅ ${message}`;
}

/**
 * Format project information for WhatsApp
 * @param projectName - Project name
 * @param status - Project status
 * @param info - Additional info
 * @returns Formatted project info
 */
export function formatProjectInfo(
  projectName: string,
  status: string,
  info?: Record<string, string | number>
): string {
  const emoji = STATUS_EMOJI_MAP[status] || '📌';
  let message = `*📋 ${projectName}*\n`;
  message += `Status: ${emoji} ${status}\n`;

  if (info) {
    for (const [key, value] of Object.entries(info)) {
      message += `${key}: ${value}\n`;
    }
  }

  return message;
}

/**
 * Format list for WhatsApp
 * @param title - List title
 * @param items - List items
 * @returns Formatted list
 */
export function formatList(title: string, items: string[]): string {
  let message = `*${title}*\n`;

  if (items.length === 0) {
    message += 'No items\n';
    return message;
  }

  for (const item of items) {
    message += `• ${item}\n`;
  }

  return message;
}

/**
 * Format checklist for WhatsApp
 * @param title - Checklist title
 * @param items - Checklist items with completion status
 * @returns Formatted checklist
 */
export function formatChecklist(
  title: string,
  items: Array<{ text: string; completed: boolean }>
): string {
  let message = `*${title}*\n`;

  if (items.length === 0) {
    message += 'No items\n';
    return message;
  }

  for (const item of items) {
    const status = item.completed ? '✅' : '⏳';
    message += `${status} ${item.text}\n`;
  }

  return message;
}

/**
 * Format table for WhatsApp (as text)
 * @param title - Table title
 * @param headers - Column headers
 * @param rows - Table rows
 * @returns Formatted table
 */
export function formatTable(
  title: string,
  headers: string[],
  rows: string[][]
): string {
  let message = `*${title}*\n`;

  // Format header
  message += headers.join(' | ') + '\n';
  message += '─'.repeat(headers.join(' | ').length) + '\n';

  // Format rows
  for (const row of rows) {
    message += row.join(' | ') + '\n';
  }

  return message;
}

/**
 * Format deadline information for WhatsApp
 * @param deadline - Deadline date
 * @param daysRemaining - Days remaining
 * @param status - Deadline status (On-track, At-risk, Overdue)
 * @returns Formatted deadline info
 */
export function formatDeadlineInfo(
  deadline: string,
  daysRemaining: number | null,
  status: string
): string {
  const indicator = getDeadlineIndicator(status);
  let message = `*📅 Deadline*\n`;
  message += `${indicator} ${deadline}\n`;

  if (daysRemaining !== null) {
    if (daysRemaining > 0) {
      message += `⏱️ ${daysRemaining} days remaining\n`;
    } else if (daysRemaining === 0) {
      message += `⏱️ Due today\n`;
    } else {
      message += `⏱️ ${Math.abs(daysRemaining)} days overdue\n`;
    }
  }

  message += `Status: ${status}\n`;

  return message;
}

/**
 * Get deadline status indicator
 * @param status - Deadline status
 * @returns Status indicator emoji
 */
function getDeadlineIndicator(status: string): string {
  const indicators: Record<string, string> = {
    'On-track': '✅',
    'At-risk': '⚠️',
    'Overdue': '❌',
  };

  return indicators[status] || '📌';
}

/**
 * Format team information for WhatsApp
 * @param teamMembers - Array of team member names
 * @returns Formatted team info
 */
export function formatTeamInfo(teamMembers: string[]): string {
  let message = `*👥 Team Members*\n`;

  if (teamMembers.length === 0) {
    message += 'No team members assigned\n';
    return message;
  }

  for (const member of teamMembers) {
    message += `👤 ${member}\n`;
  }

  return message;
}

/**
 * Format completion percentage for WhatsApp
 * @param completed - Completed items
 * @param total - Total items
 * @returns Formatted percentage
 */
export function formatCompletionPercentage(completed: number, total: number): string {
  if (total === 0) {
    return '0%';
  }

  const percentage = Math.round((completed / total) * 100);
  const progressBar = getProgressBar(percentage);

  return `${progressBar} ${percentage}% (${completed}/${total})`;
}

/**
 * Get progress bar for WhatsApp
 * @param percentage - Completion percentage
 * @returns Progress bar string
 */
function getProgressBar(percentage: number): string {
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;

  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Format notes for WhatsApp
 * @param notes - Array of notes
 * @returns Formatted notes
 */
export function formatNotes(notes: Array<{ date: string; author: string; text: string }>): string {
  let message = `*📝 Notes*\n`;

  if (notes.length === 0) {
    message += 'No notes\n';
    return message;
  }

  for (const note of notes) {
    message += `\n*${note.date}* - ${note.author}\n`;
    message += `${note.text}\n`;
  }

  return message;
}

/**
 * Format help message for WhatsApp
 * @param commands - Array of command info
 * @returns Formatted help message
 */
export function formatHelpMessage(
  commands: Array<{ command: string; description: string; example: string }>
): string {
  let message = `*📋 Available Commands*\n\n`;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    message += `*${i + 1}. ${cmd.command}*\n`;
    message += `${cmd.description}\n`;
    message += `Example: ${cmd.example}\n\n`;
  }

  message += 'Type any command to get started!';

  return message;
}

/**
 * Truncate message if too long
 * @param message - Message to truncate
 * @param maxLength - Maximum length
 * @returns Truncated message
 */
export function truncateMessage(message: string, maxLength: number = 4096): string {
  if (message.length <= maxLength) {
    return message;
  }

  return message.substring(0, maxLength - 3) + '...';
}

/**
 * Escape special WhatsApp characters
 * @param text - Text to escape
 * @returns Escaped text
 */
export function escapeWhatsAppText(text: string): string {
  // WhatsApp uses markdown-like formatting
  // Escape characters that might interfere
  return text
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`');
}

/**
 * Format response for WhatsApp with all best practices
 * @param title - Message title
 * @param content - Message content
 * @param footer - Optional footer
 * @returns Formatted message
 */
export function formatCompleteMessage(
  title: string,
  content: string,
  footer?: string
): string {
  let message = `*${title}*\n\n`;
  message += content;

  if (footer) {
    message += `\n\n_${footer}_`;
  }

  return message;
}

/**
 * Check if message exceeds WhatsApp limits
 * @param message - Message to check
 * @returns Object with limit info
 */
export function checkMessageLimits(message: string): {
  withinLimit: boolean;
  length: number;
  limit: number;
  remaining: number;
} {
  const limit = 4096;
  const length = message.length;

  return {
    withinLimit: length <= limit,
    length,
    limit,
    remaining: Math.max(0, limit - length),
  };
}

/**
 * Format message with safe defaults
 * @param message - Raw message
 * @returns Safe formatted message
 */
export function formatSafeMessage(message: string): string {
  // Truncate if needed
  const truncated = truncateMessage(message);

  // Escape special characters
  const escaped = escapeWhatsAppText(truncated);

  return escaped;
}
