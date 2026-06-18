import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createChecklist,
  createChecklistItem,
  deleteChecklist,
  deleteChecklistItem,
  getChecklistsForProject,
  getChecklistItemsForProject,
  getSubcontractorByUserId,
  isSubcontractorAssignedToProject,
  updateChecklist,
  updateChecklistItem,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const checklistsRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin) {
        const sub = await getSubcontractorByUserId(ctx.user.id);
        if (!sub) throw new TRPCError({ code: "FORBIDDEN" });
        const hasAccess = await isSubcontractorAssignedToProject(sub.id, input.projectId);
        if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Return checklist items (from project_checklist_items table)
      // This is the new system for checklist items extracted from proposals
      return getChecklistItemsForProject(input.projectId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin) {
        const sub = await getSubcontractorByUserId(ctx.user.id);
        if (!sub) throw new TRPCError({ code: "FORBIDDEN" });
        const hasAccess = await isSubcontractorAssignedToProject(sub.id, input.projectId);
        if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
      }
      const id = await createChecklist({
        projectId: input.projectId,
        title: input.title,
        description: input.description,
      });
      return { id };
    }),

  createItem: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        text: z.string().min(1),
        order: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin) {
        const sub = await getSubcontractorByUserId(ctx.user.id);
        if (!sub) throw new TRPCError({ code: "FORBIDDEN" });
        const hasAccess = await isSubcontractorAssignedToProject(sub.id, input.projectId);
        if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
      }
      const id = await createChecklistItem({
        projectId: input.projectId,
        text: input.text,
        isCompleted: false,
        order: input.order,
      });
      return { id };
    }),

  markComplete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Update the checklist item (from project_checklist_items table)
      await updateChecklistItem(input.id, {
        isCompleted: true,
      });
      return { success: true };
    }),

  updateCost: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        cost: z.string(), // decimal as string
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Both admins and subs can update costs
      if (ctx.user.role !== "admin") {
        const sub = await getSubcontractorByUserId(ctx.user.id);
        if (!sub) throw new TRPCError({ code: "FORBIDDEN" });
      }
      await updateChecklist(input.id, {
        cost: input.cost,
        costUpdatedBy: ctx.user.name ?? "Unknown",
        costUpdatedAt: new Date(),
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteChecklistItem(input.id);
      return { success: true };
    }),
});
