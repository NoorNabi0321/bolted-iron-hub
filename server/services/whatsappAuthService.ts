/**
 * WhatsApp Authorization Service
 * Handles group-based authorization and command permission checking
 */

import { getDb } from '../db';
import { whatsappAdminUsers, whatsappCommandPermissions, whatsappAuthorizedGroups, whatsappGroupAdmins, whatsappGroupCommandPermissions } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Normalize phone number by removing @lid suffix and non-digits
 * @param phoneNumber - Phone number in any format
 * @returns Normalized phone number with only digits
 */
function normalizePhoneNumber(phoneNumber: string): string {
  // Remove @lid suffix if present
  const withoutLid = phoneNumber.replace(/@lid$/, '');
  // Remove all non-digits
  return withoutLid.replace(/\D/g, '');
}

/**
 * Check if a group is authorized to use the bot
 * @param groupChatId - Group chat ID (e.g., 120363423043835752@g.us)
 * @returns Authorized group data if authorized, null otherwise
 */
export async function getAuthorizedGroup(groupChatId: string): Promise<{
  id: number;
  groupChatId: string;
  groupName: string;
  isEnabled: boolean;
} | null> {
  try {
    const db = await getDb();
    if (!db) {
      return null;
    }
    
    const group = await db
      .select()
      .from(whatsappAuthorizedGroups)
      .where(
        and(
          eq(whatsappAuthorizedGroups.groupChatId, groupChatId),
          eq(whatsappAuthorizedGroups.isEnabled, true)
        )
      )
      .limit(1);

    return group.length > 0 ? group[0] : null;
  } catch (error) {
    console.error('[WhatsApp Auth] Error fetching authorized group:', error);
    return null;
  }
}

/**
 * Check if a phone number belongs to an authorized admin
 * @param phoneNumber - Phone number in format +XXXXXXXXXXX or XXXXXXXXXXX@lid
 * @returns Admin user data if authorized, null otherwise
 */
export async function getAdminUser(phoneNumber: string): Promise<{
  id: number;
  userId: number;
  phoneNumber: string;
  role: 'admin' | 'super_admin';
  isActive: boolean;
} | null> {
  try {
    const db = await getDb();
    if (!db) {
      return null;
    }
    
    // Normalize phone number (remove @lid, spaces, dashes, etc.)
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    console.log('[WhatsApp Auth] Checking admin user:', {
      original: phoneNumber,
      normalized: normalizedPhone,
    });

    const admin = await db
      .select()
      .from(whatsappAdminUsers)
      .where(
        and(
          eq(whatsappAdminUsers.phoneNumber, normalizedPhone),
          eq(whatsappAdminUsers.isActive, true)
        )
      )
      .limit(1);

    if (admin.length > 0) {
      console.log('[WhatsApp Auth] Admin user found:', admin[0].phoneNumber);
    } else {
      console.log('[WhatsApp Auth] Admin user not found for:', normalizedPhone);
    }

    return admin.length > 0 ? admin[0] : null;
  } catch (error) {
    console.error('[WhatsApp Auth] Error fetching admin user:', error);
    return null;
  }
}

/**
 * Check if a phone number is an admin in a specific group
 * @param groupChatId - Group chat ID
 * @param phoneNumber - Phone number to check
 * @returns true if user is admin in group, false otherwise
 */
export async function isGroupAdmin(
  groupChatId: string,
  phoneNumber: string
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    // First get the group ID from groupChatId
    const group = await db
      .select()
      .from(whatsappAuthorizedGroups)
      .where(eq(whatsappAuthorizedGroups.groupChatId, groupChatId))
      .limit(1);

    if (group.length === 0) return false;

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Check if phone is admin in this group
    const admin = await db
      .select()
      .from(whatsappGroupAdmins)
      .where(
        and(
          eq(whatsappGroupAdmins.groupId, group[0].id),
          eq(whatsappGroupAdmins.adminPhoneNumber, normalizedPhone),
          eq(whatsappGroupAdmins.isActive, true)
        )
      )
      .limit(1);

    return admin.length > 0;
  } catch (error) {
    console.error('[WhatsApp Auth] Error checking group admin status:', error);
    return false;
  }
}

/**
 * Check if a user can execute a command in a group
 * @param groupChatId - Group chat ID
 * @param phoneNumber - Phone number of user
 * @param command - Command name
 * @returns true if user can execute command, false otherwise
 */
export async function canExecuteCommandInGroup(
  groupChatId: string,
  phoneNumber: string,
  command: string
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    // Get group
    const group = await db
      .select()
      .from(whatsappAuthorizedGroups)
      .where(eq(whatsappAuthorizedGroups.groupChatId, groupChatId))
      .limit(1);

    if (group.length === 0) return false;

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const isAdmin = await isGroupAdmin(groupChatId, normalizedPhone);

    // Get command permission for this group
    const permission = await db
      .select()
      .from(whatsappGroupCommandPermissions)
      .where(
        and(
          eq(whatsappGroupCommandPermissions.groupId, group[0].id),
          eq(whatsappGroupCommandPermissions.command, command)
        )
      )
      .limit(1);

    // If no permission set, default to admin-only
    if (permission.length === 0) {
      return isAdmin;
    }

    // Check permission based on role
    if (isAdmin) {
      return permission[0].allowedForAdmins;
    } else {
      return permission[0].allowedForMembers;
    }
  } catch (error) {
    console.error('[WhatsApp Auth] Error checking command execution permission:', error);
    return false;
  }
}

/**
 * Check if an admin has permission to use a specific command
 * @param adminRole - Admin role (admin or super_admin)
 * @param command - Command name (e.g., '/help', '/status')
 * @returns true if authorized, false otherwise
 */
export async function hasCommandPermission(
  adminRole: 'admin' | 'super_admin',
  command: string
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      return false;
    }

    const permission = await db
      .select()
      .from(whatsappCommandPermissions)
      .where(
        and(
          eq(whatsappCommandPermissions.command, command),
          eq(whatsappCommandPermissions.isEnabled, true)
        )
      )
      .limit(1);

    if (permission.length === 0) {
      console.log('[WhatsApp Auth] Command not found or disabled:', command);
      return false;
    }

    const requiredRole = permission[0].requiredRole;

    // Super admin can use all commands
    if (adminRole === 'super_admin') {
      return true;
    }

    // Regular admin can use commands that require 'admin' role
    return requiredRole === 'admin';
  } catch (error) {
    console.error('[WhatsApp Auth] Error checking command permission:', error);
    return false;
  }
}

/**
 * Check if user is authorized to use the bot (group-based)
 * @param groupChatId - Group chat ID
 * @param command - Command being executed
 * @returns Authorization result with details
 */
export async function authorizeCommand(
  groupChatId: string,
  command: string
): Promise<{
  authorized: boolean;
  reason?: string;
}> {
  try {
    // Check if group is authorized
    const group = await getAuthorizedGroup(groupChatId);
    
    if (!group) {
      return {
        authorized: false,
        reason: 'This group is not authorized to use the bot',
      };
    }

    // Check if command is enabled
    const db = await getDb();
    if (!db) {
      return {
        authorized: false,
        reason: 'Database connection failed',
      };
    }

    const permission = await db
      .select()
      .from(whatsappCommandPermissions)
      .where(
        and(
          eq(whatsappCommandPermissions.command, command),
          eq(whatsappCommandPermissions.isEnabled, true)
        )
      )
      .limit(1);

    if (permission.length === 0) {
      return {
        authorized: false,
        reason: `Command ${command} is not available`,
      };
    }

    return {
      authorized: true,
    };
  } catch (error) {
    console.error('[WhatsApp Auth] Authorization error:', error);
    return {
      authorized: false,
      reason: 'Authorization check failed',
    };
  }
}

/**
 * Add a new authorized group
 * @param groupChatId - Group chat ID
 * @param groupName - Group name
 */
export async function addAuthorizedGroup(
  groupChatId: string,
  groupName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: 'Database connection failed' };
    }

    // Check if group already exists
    const existing = await db
      .select()
      .from(whatsappAuthorizedGroups)
      .where(eq(whatsappAuthorizedGroups.groupChatId, groupChatId))
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: 'Group is already authorized',
      };
    }

    // Add new authorized group
    await db.insert(whatsappAuthorizedGroups).values({
      groupChatId,
      groupName,
      isEnabled: true,
    });

    console.log(`[WhatsApp Auth] Added authorized group: ${groupChatId} (${groupName})`);
    return { success: true };
  } catch (error) {
    console.error('[WhatsApp Auth] Error adding authorized group:', error);
    return {
      success: false,
      error: 'Failed to add authorized group',
    };
  }
}

/**
 * Add a new admin user
 * @param userId - User ID from users table
 * @param phoneNumber - Phone number in format +XXXXXXXXXXX or XXXXXXXXXXX@lid
 * @param role - Admin role (admin or super_admin)
 */
export async function addAdminUser(
  userId: number,
  phoneNumber: string,
  role: 'admin' | 'super_admin' = 'admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: 'Database connection failed' };
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Check if admin already exists
    const existing = await db
      .select()
      .from(whatsappAdminUsers)
      .where(eq(whatsappAdminUsers.phoneNumber, normalizedPhone))
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: 'Admin user with this phone number already exists',
      };
    }

    // Add new admin
    await db.insert(whatsappAdminUsers).values({
      userId,
      phoneNumber: normalizedPhone,
      role,
      isActive: true,
    });

    console.log(`[WhatsApp Auth] Added admin user: ${normalizedPhone} (${role})`);
    return { success: true };
  } catch (error) {
    console.error('[WhatsApp Auth] Error adding admin user:', error);
    return {
      success: false,
      error: 'Failed to add admin user',
    };
  }
}

/**
 * Remove an authorized group
 * @param groupChatId - Group chat ID to remove
 */
export async function removeAuthorizedGroup(groupChatId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: 'Database connection failed' };
    }

    // Soft delete by marking as inactive
    await db
      .update(whatsappAuthorizedGroups)
      .set({ isEnabled: false })
      .where(eq(whatsappAuthorizedGroups.groupChatId, groupChatId));

    console.log(`[WhatsApp Auth] Removed authorized group: ${groupChatId}`);
    return { success: true };
  } catch (error) {
    console.error('[WhatsApp Auth] Error removing authorized group:', error);
    return {
      success: false,
      error: 'Failed to remove authorized group',
    };
  }
}

/**
 * Remove an admin user
 * @param phoneNumber - Phone number of admin to remove
 */
export async function removeAdminUser(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: 'Database connection failed' };
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Soft delete by marking as inactive
    await db
      .update(whatsappAdminUsers)
      .set({ isActive: false })
      .where(eq(whatsappAdminUsers.phoneNumber, normalizedPhone));

    console.log(`[WhatsApp Auth] Removed admin user: ${normalizedPhone}`);
    return { success: true };
  } catch (error) {
    console.error('[WhatsApp Auth] Error removing admin user:', error);
    return {
      success: false,
      error: 'Failed to remove admin user',
    };
  }
}

/**
 * Update admin user role
 * @param phoneNumber - Phone number of admin
 * @param newRole - New role (admin or super_admin)
 */
export async function updateAdminRole(
  phoneNumber: string,
  newRole: 'admin' | 'super_admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: 'Database connection failed' };
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    await db
      .update(whatsappAdminUsers)
      .set({ role: newRole })
      .where(eq(whatsappAdminUsers.phoneNumber, normalizedPhone));

    console.log(`[WhatsApp Auth] Updated admin role: ${normalizedPhone} -> ${newRole}`);
    return { success: true };
  } catch (error) {
    console.error('[WhatsApp Auth] Error updating admin role:', error);
    return {
      success: false,
      error: 'Failed to update admin role',
    };
  }
}

/**
 * Get all active admin users
 */
export async function getAllAdminUsers(): Promise<
  Array<{
    id: number;
    userId: number;
    phoneNumber: string;
    role: 'admin' | 'super_admin';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  try {
    const db = await getDb();
    if (!db) {
      return [];
    }

    const admins = await db
      .select()
      .from(whatsappAdminUsers)
      .where(eq(whatsappAdminUsers.isActive, true));

    return admins;
  } catch (error) {
    console.error('[WhatsApp Auth] Error fetching admin users:', error);
    return [];
  }
}

/**
 * Get all authorized groups
 */
export async function getAllAuthorizedGroups(): Promise<
  Array<{
    id: number;
    groupChatId: string;
    groupName: string;
    isEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastActivityAt: Date | null;
    notes: string | null;
  }>
> {
  try {
    const db = await getDb();
    if (!db) {
      return [];
    }

    const groups = await db
      .select()
      .from(whatsappAuthorizedGroups)
      .where(eq(whatsappAuthorizedGroups.isEnabled, true));

    return groups;
  } catch (error) {
    console.error('[WhatsApp Auth] Error fetching authorized groups:', error);
    return [];
  }
}

/**
 * Get all command permissions
 */
export async function getAllCommandPermissions(): Promise<
  Array<{
    id: number;
    command: string;
    requiredRole: 'admin' | 'super_admin';
    description: string | null;
    isEnabled: boolean;
    createdAt: Date;
  }>
> {
  try {
    const db = await getDb();
    if (!db) {
      return [];
    }

    const permissions = await db.select().from(whatsappCommandPermissions);

    return permissions;
  } catch (error) {
    console.error('[WhatsApp Auth] Error fetching command permissions:', error);
    return [];
  }
}

/**
 * Update command permission
 * @param command - Command name
 * @param isEnabled - Whether command is enabled
 */
export async function updateCommandPermission(
  command: string,
  isEnabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: 'Database connection failed' };
    }

    await db
      .update(whatsappCommandPermissions)
      .set({ isEnabled })
      .where(eq(whatsappCommandPermissions.command, command));

    console.log(`[WhatsApp Auth] Updated command permission: ${command} -> ${isEnabled ? 'enabled' : 'disabled'}`);
    return { success: true };
  } catch (error) {
    console.error('[WhatsApp Auth] Error updating command permission:', error);
    return {
      success: false,
      error: 'Failed to update command permission',
    };
  }
}
