import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createFile,
  deleteFile,
  getFileById,
  getFilesForProject,
  getSubcontractorByUserId,
  isSubcontractorAssignedToProject,
} from "../db";
import { storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

export const filesRouter = router({
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
      return getFilesForProject(input.projectId, isAdmin);
    }),

  upload: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        fileName: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
        fileDataBase64: z.string(), // base64 encoded file
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

      const fileBuffer = Buffer.from(input.fileDataBase64, "base64");
      const fileKey = `projects/${input.projectId}/${input.fileName}-${randomSuffix()}`;
      const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

      const id = await createFile({
        projectId: input.projectId,
        uploaderId: ctx.user.id,
        uploaderName: ctx.user.name ?? "Unknown",
        fileName: input.fileName,
        fileKey,
        fileUrl: url,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        isAdminOnly: isAdmin ? (input.isAdminOnly ?? false) : false,
      });

      return { id, url };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const file = await getFileById(input.id);
      if (!file) {
        // File already deleted, return success gracefully
        return { success: true };
      }
      if (ctx.user.role !== "admin" && file.uploaderId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await deleteFile(input.id);
      return { success: true };
    }),
});
