import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

export const messagesRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin";

      // If not admin, verify sub is assigned to this project
      if (!isAdmin) {
        const sub = await db.getSubcontractorByUserId(ctx.user.id);
        if (!sub) throw new TRPCError({ code: "FORBIDDEN", message: "Not a subcontractor" });
        const assigned = await db.isSubcontractorAssignedToProject(sub.id, input.projectId);
        if (!assigned) throw new TRPCError({ code: "FORBIDDEN", message: "Not assigned to this project" });
      }

      return db.getMessagesForProject(input.projectId, isAdmin);
    }),

  send: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        content: z.string().min(1).max(5000),
        mentions: z.string().optional(),
        isAdminOnly: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin";

      // If not admin, verify sub is assigned and cannot send admin-only messages
      if (!isAdmin) {
        const sub = await db.getSubcontractorByUserId(ctx.user.id);
        if (!sub) throw new TRPCError({ code: "FORBIDDEN", message: "Not a subcontractor" });
        const assigned = await db.isSubcontractorAssignedToProject(sub.id, input.projectId);
        if (!assigned) throw new TRPCError({ code: "FORBIDDEN", message: "Not assigned to this project" });
        if (input.isAdminOnly) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot send admin-only messages" });
      }

      const id = await db.createMessage({
        projectId: input.projectId,
        senderId: ctx.user.id,
        senderName: ctx.user.name || "Unknown",
        content: input.content,
        mentions: input.mentions || null,
        isAdminOnly: input.isAdminOnly || false,
      });

      return { id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete messages" });
      }
      await db.deleteMessage(input.id);
      return { success: true };
    }),

  /** Get all users/subs that can be @mentioned in a project */
  mentionableUsers: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin";

      // Get all admin users
      const allUsers = await db.getAllUsers();
      const admins = allUsers
        .filter((u) => u.role === "admin")
        .map((u) => ({ id: u.id, name: u.name || u.email || "Admin", type: "admin" as const }));

      // Get assigned subcontractors for this project
      const assignments = await db.getAssignmentsForProject(input.projectId);
      const subs: { id: number; name: string; type: "sub" }[] = [];
      for (const a of assignments) {
        const sub = await db.getSubcontractorById(a.subcontractorId);
        if (sub) {
          subs.push({ id: sub.userId || 0, name: sub.contactName || sub.companyName, type: "sub" });
        }
      }

      return [...admins, ...subs.filter((s) => s.id > 0)];
    }),
});
