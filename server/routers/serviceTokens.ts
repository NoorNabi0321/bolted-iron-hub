import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { serviceTokens } from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

/**
 * Generate a random service token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export const serviceTokensRouter = router({
  /**
   * Create a new service token for bot or service-to-service authentication
   * Only admin can create service tokens
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).describe("Name of the service token"),
        expiresInDays: z
          .number()
          .int()
          .positive()
          .default(365)
          .describe("Days until token expires"),
      })
    )
    .mutation(async ({ input }) => {
      // Generate random token
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      const db = await getDb();
      if (!db) throw new Error("Database not connected");
      const result = await db!.insert(serviceTokens).values({
        name: input.name,
        token,
        expiresAt,
        isActive: true,
      });

      console.log(
        `[Service Token] Created token "${input.name}" (ID: ${result.insertId})`
      );

      return {
        id: result.insertId,
        token, // Only return token once on creation
        name: input.name,
        expiresAt,
        message:
          "⚠️ Save this token securely. You won't be able to see it again!",
      };
    }),

  /**
   * List all service tokens (admin only)
   */
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not connected");
    const tokens = await db.select().from(serviceTokens);
    // Don't return the actual token values in list
    return tokens.map((t) => ({
      id: t.id,
      name: t.name,
      isActive: t.isActive,
      expiresAt: t.expiresAt,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      isExpired: t.expiresAt < new Date(),
    }));
  }),

  /**
   * Get a specific service token by ID (admin only)
   */
  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");
      const token = await db
        .select()
        .from(serviceTokens)
        .where(eq(serviceTokens.id, input.id))
        .limit(1);

      if (token.length === 0) {
        throw new Error("Service token not found");
      }

      const t = token[0];
      return {
        id: t.id,
        name: t.name,
        isActive: t.isActive,
        expiresAt: t.expiresAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        isExpired: t.expiresAt < new Date(),
      };
    }),

  /**
   * Revoke a service token (admin only)
   */
  revoke: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");
      const token = await db
        .select()
        .from(serviceTokens)
        .where(eq(serviceTokens.id, input.id))
        .limit(1);

      if (token.length === 0) {
        throw new Error("Service token not found");
      }

      await db
        .update(serviceTokens)
        .set({ isActive: false })
        .where(eq(serviceTokens.id, input.id));

      console.log(`[Service Token] Revoked token "${token[0].name}" (ID: ${input.id})`);

      return { success: true, message: "Token revoked successfully" };
    }),

  /**
   * Regenerate a service token (admin only)
   * Revokes the old token and creates a new one
   */
  regenerate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");
      const token = await db
        .select()
        .from(serviceTokens)
        .where(eq(serviceTokens.id, input.id))
        .limit(1);

      if (token.length === 0) {
        throw new Error("Service token not found");
      }

      const oldToken = token[0];
      const newToken = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 365); // Default 365 days

      await db
        .update(serviceTokens)
        .set({
          token: newToken,
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(serviceTokens.id, input.id));

      console.log(
        `[Service Token] Regenerated token "${oldToken.name}" (ID: ${input.id})`
      );

      return {
        id: input.id,
        token: newToken,
        name: oldToken.name,
        expiresAt,
        message:
          "⚠️ Token regenerated. Old token is no longer valid. Save this new token securely!",
      };
    }),

  /**
   * Delete a service token (admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");
      const token = await db
        .select()
        .from(serviceTokens)
        .where(eq(serviceTokens.id, input.id))
        .limit(1);

      if (token.length === 0) {
        throw new Error("Service token not found");
      }

      // Delete from database
      await db
        .delete(serviceTokens)
        .where(eq(serviceTokens.id, input.id));

      console.log(`[Service Token] Deleted token "${token[0].name}" (ID: ${input.id})`);

      return { success: true, message: "Token deleted successfully" };
    }),

  /**
   * Validate a service token (public - used by services)
   * Returns user context if token is valid
   */
  validate: router({
    query: async ({ ctx }) => {
      // This is a public procedure that validates the Bearer token
      // The actual validation happens in context.ts
      if (!ctx.user) {
        throw new Error("Invalid or expired token");
      }

      return {
        valid: true,
        user: {
          id: ctx.user.id,
          name: ctx.user.name,
          role: ctx.user.role,
          isServiceToken: (ctx.user as any).isServiceToken || false,
        },
      };
    },
  }),
});
