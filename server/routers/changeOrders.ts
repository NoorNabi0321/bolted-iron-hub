import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createChangeOrder,
  createChecklistItem,
  deleteChangeOrder,
  getChangeOrderById,
  getChangeOrdersForProject,
  getChecklistItemsForProject,
  touchProject,
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
        isChecklistItem: z.boolean().optional(),
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
        isChecklistItem: input.isChecklistItem ?? false,
      });
      await touchProject(input.projectId);
      return { id };
    }),

  approve: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Snapshot before approving so we only add the checklist item once.
      const order = await getChangeOrderById(input.id);
      await updateChangeOrder(input.id, {
        status: "approved",
        approvedBy: ctx.user.name ?? "Unknown",
        approvedAt: new Date(),
      });
      // On first approval, add the change order to the checklist as a green,
      // active item showing only the description + inches.
      if (order && order.status !== "approved") {
        const items = await getChecklistItemsForProject(order.projectId);
        const maxOrder = items.reduce((m, i) => Math.max(m, i.order), 0);
        // Length in inches, trimmed of trailing zeros, shown with the inch mark (").
        const inches = parseFloat(Number(order.amount ?? 0).toFixed(2)).toString();
        await createChecklistItem({
          projectId: order.projectId,
          text: `${order.description} — ${inches}"`,
          isCompleted: false,
          progress: 0,
          order: maxOrder + 1,
          source: "extracted",
          isActive: true,
          isUserAdded: true,
        });
      }
      if (order) await touchProject(order.projectId);
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
