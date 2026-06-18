import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createChangeOrder,
  deleteChangeOrder,
  getChangeOrdersForProject,
  updateChangeOrder,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const changeOrdersRouter = router({
  list: adminProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return getChangeOrdersForProject(input.projectId);
    }),

  create: adminProcedure
    .input(
      z.object({
        projectId: z.number(),
        orderNumber: z.string().min(1),
        description: z.string().min(1),
        amount: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createChangeOrder({
        projectId: input.projectId,
        orderNumber: input.orderNumber,
        description: input.description,
        amount: input.amount as any,
        status: "pending",
        createdBy: ctx.user.name ?? "Unknown",
        notes: input.notes,
      });
      return { id };
    }),

  approve: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await updateChangeOrder(input.id, {
        status: "approved",
        approvedBy: ctx.user.name ?? "Unknown",
        approvedAt: new Date(),
      });
      return { success: true };
    }),

  reject: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await updateChangeOrder(input.id, { status: "rejected" });
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteChangeOrder(input.id);
      return { success: true };
    }),
});
