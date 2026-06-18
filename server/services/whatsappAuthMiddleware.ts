/**
 * WhatsApp Authorization Middleware
 * Provides authorization checks for message processing
 */

import { getAdminUser, hasCommandPermission } from './whatsappAuthService';
import { Message } from 'whatsapp-web.js';

/**
 * Authorization context
 */
export interface AuthorizationContext {
  isAuthorized: boolean;
  senderPhone: string;
  adminRole?: 'admin' | 'super_admin';
  adminId?: number;
  error?: string;
}

/**
 * Command authorization context
 */
export interface CommandAuthContext {
  isAuthorized: boolean;
  commandType: string;
  adminRole?: 'admin' | 'super_admin';
  error?: string;
}

/**
 * Check if sender is authorized admin
 * @param senderPhone - Sender phone number
 * @returns Authorization context
 */
export async function checkSenderAuthorization(senderPhone: string): Promise<AuthorizationContext> {
  try {
    // Normalize phone number - remove @lid, @g.us, and non-digits
    let normalizedPhone = senderPhone.replace(/@.*$/, '').replace(/\D/g, '');
    
    console.log('[WhatsApp Auth] Phone normalization', {
      original: senderPhone,
      normalized: normalizedPhone,
    });

    // Get admin user
    console.log('[WhatsApp Auth] Checking admin user for:', normalizedPhone);
    const adminUser = await getAdminUser(normalizedPhone);
    console.log('[WhatsApp Auth] Admin lookup result:', { found: !!adminUser, role: adminUser?.role });

    if (!adminUser) {
      console.warn('[WhatsApp Auth] Unauthorized sender:', normalizedPhone);
      return {
        isAuthorized: false,
        senderPhone: normalizedPhone,
        error: 'Sender is not an authorized admin',
      };
    }
    
    console.log('[WhatsApp Auth] Authorization successful for:', normalizedPhone);

    return {
      isAuthorized: true,
      senderPhone: normalizedPhone,
      adminRole: adminUser.role,
      adminId: adminUser.id,
    };
  } catch (error) {
    console.error('[WhatsApp Auth Middleware] Error checking sender authorization:', error);
    return {
      isAuthorized: false,
      senderPhone,
      error: error instanceof Error ? error.message : 'Authorization check failed',
    };
  }
}

/**
 * Check if sender has permission for a specific command
 * @param senderPhone - Sender phone number
 * @param commandType - Command type
 * @returns Command authorization context
 */
export async function checkCommandAuthorization(
  senderPhone: string,
  commandType: string
): Promise<CommandAuthContext> {
  try {
    // First check if sender is authorized
    const senderAuth = await checkSenderAuthorization(senderPhone);

    if (!senderAuth.isAuthorized) {
      return {
        isAuthorized: false,
        commandType,
        error: senderAuth.error,
      };
    }

    // Check command permission
    const hasPermission = await hasCommandPermission(
      senderAuth.adminRole || 'admin',
      commandType
    );

    if (!hasPermission) {
      return {
        isAuthorized: false,
        commandType,
        adminRole: senderAuth.adminRole,
        error: `Your role (${senderAuth.adminRole}) does not have permission for /${commandType}`,
      };
    }

    return {
      isAuthorized: true,
      commandType,
      adminRole: senderAuth.adminRole,
    };
  } catch (error) {
    console.error('[WhatsApp Auth Middleware] Error checking command authorization:', error);
    return {
      isAuthorized: false,
      commandType,
      error: error instanceof Error ? error.message : 'Command authorization check failed',
    };
  }
}

/**
 * Check if message sender is authorized
 * @param message - WhatsApp message
 * @returns Authorization context
 */
export async function checkMessageAuthorization(message: Message): Promise<AuthorizationContext> {
  try {
    const senderPhone = message.from;
    return checkSenderAuthorization(senderPhone);
  } catch (error) {
    console.error('[WhatsApp Auth Middleware] Error checking message authorization:', error);
    return {
      isAuthorized: false,
      senderPhone: message.from,
      error: error instanceof Error ? error.message : 'Authorization check failed',
    };
  }
}

/**
 * Extract command type from message
 * @param messageText - Message text
 * @returns Command type or null
 */
export function extractCommandType(messageText: string): string | null {
  const match = messageText.match(/^\/(\w+)/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Validate authorization and extract command
 * @param message - WhatsApp message
 * @returns Validation result with command type
 */
export async function validateMessageAuthorization(
  message: Message
): Promise<{
  isValid: boolean;
  commandType: string | null;
  senderPhone: string;
  adminRole?: 'admin' | 'super_admin';
  error?: string;
}> {
  try {
    const senderPhone = message.from;
    const messageText = message.body.trim();

    // Check sender authorization
    const senderAuth = await checkSenderAuthorization(senderPhone);

    if (!senderAuth.isAuthorized) {
      return {
        isValid: false,
        commandType: null,
        senderPhone,
        error: senderAuth.error,
      };
    }

    // Extract command type
    const commandType = extractCommandType(messageText);

    if (!commandType) {
      return {
        isValid: false,
        commandType: null,
        senderPhone,
        adminRole: senderAuth.adminRole,
        error: 'Message is not a command',
      };
    }

    // Check command permission
    const hasPermission = await hasCommandPermission(
      senderAuth.adminRole || 'admin',
      commandType
    );

    if (!hasPermission) {
      return {
        isValid: false,
        commandType,
        senderPhone,
        adminRole: senderAuth.adminRole,
        error: `You don't have permission to use /${commandType}`,
      };
    }

    return {
      isValid: true,
      commandType,
      senderPhone,
      adminRole: senderAuth.adminRole,
    };
  } catch (error) {
    console.error('[WhatsApp Auth Middleware] Error validating message authorization:', error);
    return {
      isValid: false,
      commandType: null,
      senderPhone: message.from,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Check if sender is super admin
 * @param senderPhone - Sender phone number
 * @returns boolean
 */
export async function isSuperAdmin(senderPhone: string): Promise<boolean> {
  try {
    const auth = await checkSenderAuthorization(senderPhone);
    return auth.isAuthorized && auth.adminRole === 'super_admin';
  } catch {
    return false;
  }
}

/**
 * Check if sender is admin or super admin
 * @param senderPhone - Sender phone number
 * @returns boolean
 */
export async function isAdmin(senderPhone: string): Promise<boolean> {
  try {
    const auth = await checkSenderAuthorization(senderPhone);
    return auth.isAuthorized && (auth.adminRole === 'admin' || auth.adminRole === 'super_admin');
  } catch {
    return false;
  }
}

/**
 * Get admin role for sender
 * @param senderPhone - Sender phone number
 * @returns Admin role or null
 */
export async function getAdminRole(senderPhone: string): Promise<'admin' | 'super_admin' | null> {
  try {
    const auth = await checkSenderAuthorization(senderPhone);
    return auth.isAuthorized ? auth.adminRole || null : null;
  } catch {
    return null;
  }
}

/**
 * Format authorization error message
 * @param error - Error message
 * @returns Formatted error message
 */
export function formatAuthorizationError(error: string): string {
  return `❌ Authorization Error: ${error}`;
}

/**
 * Format permission denied message
 * @param commandType - Command type
 * @param role - Admin role
 * @returns Formatted message
 */
export function formatPermissionDeniedMessage(commandType: string, role?: string): string {
  if (role) {
    return `❌ Permission Denied: Your role (${role}) does not have permission to use /${commandType}`;
  }
  return `❌ Permission Denied: You don't have permission to use /${commandType}`;
}

/**
 * Format unauthorized message
 * @returns Formatted message
 */
export function formatUnauthorizedMessage(): string {
  return '❌ Unauthorized: You are not authorized to use this bot. Contact an administrator.';
}

/**
 * Batch check authorization for multiple senders
 * @param senderPhones - Array of sender phone numbers
 * @returns Array of authorization contexts
 */
export async function batchCheckAuthorization(
  senderPhones: string[]
): Promise<AuthorizationContext[]> {
  return Promise.all(senderPhones.map(phone => checkSenderAuthorization(phone)));
}

/**
 * Get authorization summary
 * @param senderPhone - Sender phone number
 * @returns Authorization summary
 */
export async function getAuthorizationSummary(
  senderPhone: string
): Promise<{
  senderPhone: string;
  isAuthorized: boolean;
  adminRole?: string;
  permissions: string[];
}> {
  try {
    const auth = await checkSenderAuthorization(senderPhone);

    if (!auth.isAuthorized) {
      return {
        senderPhone,
        isAuthorized: false,
        permissions: [],
      };
    }

    // Get available commands for role
    const commands = ['help', 'status', 'list', 'project', 'weekly', 'pending', 'report'];
    const permissions: string[] = [];

    for (const command of commands) {
      const hasPermission = await hasCommandPermission(auth.adminRole || 'admin', command);
      if (hasPermission) {
        permissions.push(command);
      }
    }

    return {
      senderPhone,
      isAuthorized: true,
      adminRole: auth.adminRole,
      permissions,
    };
  } catch (error) {
    console.error('[WhatsApp Auth Middleware] Error getting authorization summary:', error);
    return {
      senderPhone,
      isAuthorized: false,
      permissions: [],
    };
  }
}
