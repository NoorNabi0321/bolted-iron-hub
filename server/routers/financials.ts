import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getFinancialByProjectId, upsertFinancial } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const financialsRouter = router({
  get: adminProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const result = await getFinancialByProjectId(input.projectId);
      return result ?? null;
    }),

  upsert: adminProcedure
    .input(
      z.object({
        projectId: z.number(),
        contractValue: z.string().optional(),
        amountBilled: z.string().optional(),
        amountReceived: z.string().optional(),
        subcontractorPayout: z.string().optional(),
        billingStatus: z
          .enum(["Not Started", "Partial", "Fully Billed", "Paid"])
          .optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await upsertFinancial({
        projectId: input.projectId,
        contractValue: input.contractValue ?? null,
        amountBilled: input.amountBilled ?? null,
        amountReceived: input.amountReceived ?? null,
        subcontractorPayout: input.subcontractorPayout ?? null,
        billingStatus: input.billingStatus,
        notes: input.notes,
      });
      return { success: true };
    }),
});
