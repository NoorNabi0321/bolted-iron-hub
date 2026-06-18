import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserByEmail, getAllSubcontractors } from "../db";
import { users, subcontractors } from "../../drizzle/schema";

/**
 * Bulk import subcontractors from CSV data.
 * Each row creates:
 *   1. A subcontractor record (companyName, contactName, email, phone, trade)
 *   2. A user account (email + temporary password) — pending admin approval
 *
 * CSV columns: companyName, contactName, email, phone, trade, password (optional)
 * If password is omitted, a default "Welcome123!" is used.
 */
export const bulkImportRouter = router({
  /** Parse CSV text and return preview rows (no DB writes) */
  preview: protectedProcedure
    .input(z.object({ csvText: z.string().min(1) }))
    .mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Parsing is done client-side; this is a placeholder if server-side parsing is needed
      return { success: true };
    }),

  /** Import parsed rows into the database */
  importRows: protectedProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            companyName: z.string().min(1, "Company name is required"),
            contactName: z.string().optional().default(""),
            email: z.string().email("Valid email is required"),
            phone: z.string().optional().default(""),
            trade: z.string().optional().default(""),
            password: z.string().optional(),
          })
        ),
        autoApprove: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const results: {
        email: string;
        companyName: string;
        status: "created" | "skipped" | "error";
        message: string;
      }[] = [];

      const existingSubs = await getAllSubcontractors();

      for (const row of input.rows) {
        try {
          // Check if email already exists as a user
          const existingUser = await getUserByEmail(row.email);
          if (existingUser) {
            // Check if there's already a sub linked to this user
            const linkedSub = existingSubs.find((s) => s.userId === existingUser.id);
            if (linkedSub) {
              results.push({
                email: row.email,
                companyName: row.companyName,
                status: "skipped",
                message: `User already exists and linked to "${linkedSub.companyName}"`,
              });
              continue;
            }
          }

          // Check if subcontractor with same email already exists
          const existingSub = existingSubs.find(
            (s) => s.email?.toLowerCase() === row.email.toLowerCase()
          );
          if (existingSub) {
            results.push({
              email: row.email,
              companyName: row.companyName,
              status: "skipped",
              message: `Subcontractor with this email already exists ("${existingSub.companyName}")`,
            });
            continue;
          }

          // Hash password (use provided or default)
          const password = row.password || "Welcome123!";
          const passwordHash = await bcrypt.hash(password, 12);
          const openId = `email_${row.email}`;

          // Create user account
          if (!existingUser) {
            await db.insert(users).values({
              openId,
              name: row.contactName || row.companyName,
              email: row.email,
              passwordHash,
              loginMethod: "email",
              role: "user",
              isApproved: input.autoApprove ? true : false,
              lastSignedIn: new Date(),
            });
          }

          // Get the user ID
          const user = await getUserByEmail(row.email);
          if (!user) {
            results.push({
              email: row.email,
              companyName: row.companyName,
              status: "error",
              message: "Failed to create user account",
            });
            continue;
          }

          // Create subcontractor record linked to user
          await db.insert(subcontractors).values({
            companyName: row.companyName,
            contactName: row.contactName || null,
            email: row.email,
            phone: row.phone || null,
            trade: row.trade || null,
            userId: user.id,
          });

          results.push({
            email: row.email,
            companyName: row.companyName,
            status: "created",
            message: input.autoApprove
              ? `Created and auto-approved (password: ${password})`
              : `Created — pending approval (password: ${password})`,
          });
        } catch (error: any) {
          results.push({
            email: row.email,
            companyName: row.companyName,
            status: "error",
            message: error.message || "Unknown error",
          });
        }
      }

      const created = results.filter((r) => r.status === "created").length;
      const skipped = results.filter((r) => r.status === "skipped").length;
      const errors = results.filter((r) => r.status === "error").length;

      return {
        summary: { total: input.rows.length, created, skipped, errors },
        results,
      };
    }),
});
