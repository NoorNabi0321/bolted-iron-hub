import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getAllUsers } from "../db";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const adminUsersRouter = router({
  list: adminProcedure.query(async () => {
    return getAllUsers();
  }),

  setRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  setPermission: adminProcedure
    .input(z.object({ userId: z.number(), permission: z.enum(["view", "edit", "admin"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ permission: input.permission as any }).where(eq(users.id, input.userId));
      return { success: true };
    }),
});
