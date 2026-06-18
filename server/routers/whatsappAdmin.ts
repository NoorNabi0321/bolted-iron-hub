/**
 * WhatsApp Group Admin Management Router
 * tRPC procedures for managing group-specific admins and command permissions
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { whatsappGroupAdmins, whatsappGroupCommandPermissions, whatsappAuthorizedGroups } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * WhatsApp Group Admin Management Router
 */
export const whatsappAdminRouter = router({
  /**
   * Get all admins for a group
   */
  getGroupAdmins: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        const admins = await db
          .select()
          .from(whatsappGroupAdmins)
          .where(
            and(
              eq(whatsappGroupAdmins.groupId, parseInt(input.groupId)),
              eq(whatsappGroupAdmins.isActive, true)
            )
          )
          .orderBy(desc(whatsappGroupAdmins.createdAt));

        return admins.map(admin => ({
          id: admin.id,
          groupId: admin.groupId,
          adminPhoneNumber: admin.adminPhoneNumber,
          adminName: admin.adminName || '',
          isActive: admin.isActive,
          createdAt: admin.createdAt?.getTime() || 0,
          updatedAt: admin.updatedAt?.getTime() || 0,
        }));
      } catch (error) {
        console.error('[WhatsApp Admin] Error fetching group admins:', error);
        throw new Error('Failed to fetch group admins');
      }
    }),

  /**
   * Add admin to group
   */
  addGroupAdmin: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        adminPhoneNumber: z.string().min(1),
        adminName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        // Check if group exists
        const group = await db
          .select()
          .from(whatsappAuthorizedGroups)
          .where(eq(whatsappAuthorizedGroups.id as any, parseInt(input.groupId)))
          .limit(1);

        if (group.length === 0) {
          throw new Error('Group not found');
        }

        // Check if admin already exists
        const existing = await db
          .select()
          .from(whatsappGroupAdmins)
          .where(
            and(
              eq(whatsappGroupAdmins.groupId, parseInt(input.groupId)),
              eq(whatsappGroupAdmins.adminPhoneNumber, input.adminPhoneNumber)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          throw new Error('Admin already exists for this group');
        }

        // Insert admin
        const result = await db.insert(whatsappGroupAdmins).values({
          groupId: parseInt(input.groupId),
          adminPhoneNumber: input.adminPhoneNumber,
          adminName: input.adminName || null,
          isActive: true,
        });

        return {
          success: true,
          message: 'Admin added successfully',
          adminId: result.insertId,
        };
      } catch (error) {
        console.error('[WhatsApp Admin] Error adding group admin:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to add admin');
      }
    }),

  /**
   * Remove admin from group
   */
  removeGroupAdmin: protectedProcedure
    .input(z.object({ adminId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        await db
          .update(whatsappGroupAdmins)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(whatsappGroupAdmins.id, parseInt(input.adminId)));

        return {
          success: true,
          message: 'Admin removed successfully',
        };
      } catch (error) {
        console.error('[WhatsApp Admin] Error removing group admin:', error);
        throw new Error('Failed to remove admin');
      }
    }),

  /**
   * Get command permissions for a group
   */
  getGroupCommandPermissions: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        const permissions = await db
          .select()
          .from(whatsappGroupCommandPermissions)
          .where(eq(whatsappGroupCommandPermissions.groupId, parseInt(input.groupId)))
          .orderBy(desc(whatsappGroupCommandPermissions.createdAt));

        return permissions.map(perm => ({
          id: perm.id,
          groupId: perm.groupId,
          command: perm.command,
          allowedForAdmins: perm.allowedForAdmins,
          allowedForMembers: perm.allowedForMembers,
          description: perm.description || '',
          createdAt: perm.createdAt?.getTime() || 0,
          updatedAt: perm.updatedAt?.getTime() || 0,
        }));
      } catch (error) {
        console.error('[WhatsApp Admin] Error fetching command permissions:', error);
        throw new Error('Failed to fetch command permissions');
      }
    }),

  /**
   * Update command permission for a group
   */
  updateCommandPermission: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        command: z.string(),
        allowedForAdmins: z.boolean(),
        allowedForMembers: z.boolean(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        // Check if permission exists
        const existing = await db
          .select()
          .from(whatsappGroupCommandPermissions)
          .where(
            and(
              eq(whatsappGroupCommandPermissions.groupId, parseInt(input.groupId)),
              eq(whatsappGroupCommandPermissions.command, input.command)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Update existing
          await db
            .update(whatsappGroupCommandPermissions)
            .set({
              allowedForAdmins: input.allowedForAdmins,
              allowedForMembers: input.allowedForMembers,
              description: input.description || null,
              updatedAt: new Date(),
            })
            .where(eq(whatsappGroupCommandPermissions.id, existing[0].id));
        } else {
          // Create new
          await db.insert(whatsappGroupCommandPermissions).values({
            groupId: parseInt(input.groupId),
            command: input.command,
            allowedForAdmins: input.allowedForAdmins,
            allowedForMembers: input.allowedForMembers,
            description: input.description || null,
          });
        }

        return {
          success: true,
          message: 'Command permission updated successfully',
        };
      } catch (error) {
        console.error('[WhatsApp Admin] Error updating command permission:', error);
        throw new Error('Failed to update command permission');
      }
    }),

  /**
   * Check if a phone number is admin in a group
   */
  isGroupAdmin: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        phoneNumber: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return false;

        const admin = await db
          .select()
          .from(whatsappGroupAdmins)
          .where(
            and(
              eq(whatsappGroupAdmins.groupId, parseInt(input.groupId)),
              eq(whatsappGroupAdmins.adminPhoneNumber, input.phoneNumber),
              eq(whatsappGroupAdmins.isActive, true)
            )
          )
          .limit(1);

        return admin.length > 0;
      } catch (error) {
        console.error('[WhatsApp Admin] Error checking admin status:', error);
        return false;
      }
    }),

  /**
   * Check if a command is allowed for a user in a group
   */
  canExecuteCommand: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        command: z.string(),
        phoneNumber: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return false;

        // Check if user is admin
        const isAdmin = await db
          .select()
          .from(whatsappGroupAdmins)
          .where(
            and(
              eq(whatsappGroupAdmins.groupId, parseInt(input.groupId)),
              eq(whatsappGroupAdmins.adminPhoneNumber, input.phoneNumber),
              eq(whatsappGroupAdmins.isActive, true)
            )
          )
          .limit(1);

        // Get command permission
        const permission = await db
          .select()
          .from(whatsappGroupCommandPermissions)
          .where(
            and(
              eq(whatsappGroupCommandPermissions.groupId, parseInt(input.groupId)),
              eq(whatsappGroupCommandPermissions.command, input.command)
            )
          )
          .limit(1);

        // If no permission set, default to admin-only
        if (permission.length === 0) {
          return isAdmin.length > 0;
        }

        // Check permissions
        if (isAdmin.length > 0) {
          return permission[0].allowedForAdmins;
        } else {
          return permission[0].allowedForMembers;
        }
      } catch (error) {
        console.error('[WhatsApp Admin] Error checking command permission:', error);
        return false;
      }
    }),
});
