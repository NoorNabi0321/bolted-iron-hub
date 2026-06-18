import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createSubcontractor,
  deleteSubcontractor,
  getAllSubcontractors,
  getSubcontractorById,
  getSubcontractorByUserId,
  updateSubcontractor,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

const subInput = z.object({
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  trade: z.string().optional(),
  notes: z.string().optional(),
  userId: z.number().optional(),
});

export const subcontractorsRouter = router({
  list: adminProcedure.query(async () => {
    return getAllSubcontractors();
  }),

  get: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const sub = await getSubcontractorById(input.id);
    if (!sub) throw new TRPCError({ code: "NOT_FOUND" });
    return sub;
  }),

  // Subcontractor can get their own profile
  me: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") return null;
    return getSubcontractorByUserId(ctx.user.id);
  }),

  create: adminProcedure.input(subInput).mutation(async ({ input }) => {
    const id = await createSubcontractor(input);
    return { id };
  }),

  update: adminProcedure
    .input(z.object({ id: z.number(), data: subInput.partial() }))
    .mutation(async ({ input }) => {
      await updateSubcontractor(input.id, input.data);
      return { success: true };
    }),

  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await deleteSubcontractor(input.id);
    return { success: true };
  }),

  // Link a user account to a subcontractor profile
  linkUser: adminProcedure
    .input(z.object({ subcontractorId: z.number(), userId: z.number() }))
    .mutation(async ({ input }) => {
      await updateSubcontractor(input.subcontractorId, { userId: input.userId });
      return { success: true };
    }),
});
