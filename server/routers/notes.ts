import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createNote,
  deleteNote,
  getNotesForProject,
  getSubcontractorByUserId,
  isSubcontractorAssignedToProject,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const notesRouter = router({
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
      return getNotesForProject(input.projectId, isAdmin);
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        content: z.string().min(1),
        isAdminOnly: z.boolean().optional(),
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
      const id = await createNote({
        projectId: input.projectId,
        authorId: ctx.user.id,
        authorName: ctx.user.name ?? "Unknown",
        content: input.content,
        isAdminOnly: isAdmin ? (input.isAdminOnly ?? false) : false,
      });
      return { id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteNote(input.id);
      return { success: true };
    }),
});
