/**
 * WhatsApp Admins Router
 * tRPC procedures for managing WhatsApp admin users and permissions
 */

import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../_core/trpc';
import {
  addAdminUser,
  removeAdminUser,
  updateAdminRole,
  getAllAdminUsers,
  getAllCommandPermissions,
  updateCommandPermission,
} from '../services/whatsappAuthService';

export const whatsappAdminsRouter = router({
  /**
   * Get all authorized admin users
   */
  getAllAdmins: adminProcedure.query(async () => {
    try {
      const admins = await getAllAdminUsers();
      return {
        success: true,
        data: admins.map((admin) => ({
          id: admin.id,
          userId: admin.userId,
          phoneNumber: admin.phoneNumber,
          role: admin.role,
          isActive: admin.isActive,
          createdAt: admin.createdAt.getTime(),
          updatedAt: admin.updatedAt.getTime(),
        })),
      };
    } catch (error) {
      console.error('[WhatsApp Admins] Error fetching admins:', error);
      return {
        success: false,
        error: 'Failed to fetch admin users',
      };
    }
  }),

  /**
   * Add a new admin user
   */
  addAdmin: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        phoneNumber: z.string().min(10, 'Invalid phone number'),
        role: z.enum(['admin', 'super_admin']).default('admin'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await addAdminUser(input.userId, input.phoneNumber, input.role);

        if (!result.success) {
          return {
            success: false,
            error: result.error || 'Failed to add admin user',
          };
        }

        return {
          success: true,
          message: `Admin user ${input.phoneNumber} added successfully`,
        };
      } catch (error) {
        console.error('[WhatsApp Admins] Error adding admin:', error);
        return {
          success: false,
          error: 'Failed to add admin user',
        };
      }
    }),

  /**
   * Remove an admin user
   */
  removeAdmin: adminProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await removeAdminUser(input.phoneNumber);

        if (!result.success) {
          return {
            success: false,
            error: result.error || 'Failed to remove admin user',
          };
        }

        return {
          success: true,
          message: `Admin user ${input.phoneNumber} removed successfully`,
        };
      } catch (error) {
        console.error('[WhatsApp Admins] Error removing admin:', error);
        return {
          success: false,
          error: 'Failed to remove admin user',
        };
      }
    }),

  /**
   * Update admin user role
   */
  updateAdminRole: adminProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        role: z.enum(['admin', 'super_admin']),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await updateAdminRole(input.phoneNumber, input.role);

        if (!result.success) {
          return {
            success: false,
            error: result.error || 'Failed to update admin role',
          };
        }

        return {
          success: true,
          message: `Admin role updated to ${input.role}`,
        };
      } catch (error) {
        console.error('[WhatsApp Admins] Error updating admin role:', error);
        return {
          success: false,
          error: 'Failed to update admin role',
        };
      }
    }),

  /**
   * Get all command permissions
   */
  getAllCommands: adminProcedure.query(async () => {
    try {
      const commands = await getAllCommandPermissions();
      return {
        success: true,
        data: commands.map((cmd) => ({
          id: cmd.id,
          command: cmd.command,
          requiredRole: cmd.requiredRole,
          description: cmd.description,
          isEnabled: cmd.isEnabled,
          createdAt: cmd.createdAt.getTime(),
        })),
      };
    } catch (error) {
      console.error('[WhatsApp Admins] Error fetching commands:', error);
      return {
        success: false,
        error: 'Failed to fetch command permissions',
      };
    }
  }),

  /**
   * Update command permission (enable/disable)
   */
  updateCommandPermission: adminProcedure
    .input(
      z.object({
        command: z.string(),
        isEnabled: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await updateCommandPermission(input.command, input.isEnabled);

        if (!result.success) {
          return {
            success: false,
            error: result.error || 'Failed to update command permission',
          };
        }

        return {
          success: true,
          message: `Command ${input.command} ${input.isEnabled ? 'enabled' : 'disabled'}`,
        };
      } catch (error) {
        console.error('[WhatsApp Admins] Error updating command permission:', error);
        return {
          success: false,
          error: 'Failed to update command permission',
        };
      }
    }),
});
