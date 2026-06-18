import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { sdk } from "../_core/sdk";
import {
  getUserByEmail,
  createEmailUser,
  approveUser,
  rejectUser,
  getPendingUsers,
  getSubcontractorByUserId,
  getAllSubcontractors,
} from "../db";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { subcontractors } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const emailAuthRouter = router({
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        companyName: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if email already exists
      const existing = await getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists. Please log in instead.",
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 12);

      // Create user
      const user = await createEmailUser({
        name: input.name,
        email: input.email,
        passwordHash,
      });

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create account. Please try again.",
        });
      }

      // If company name provided, auto-create a subcontractor record linked to this user
      if (input.companyName) {
        try {
          const db = await getDb();
          if (db) {
            await db.insert(subcontractors).values({
              companyName: input.companyName,
              contactName: input.name,
              email: input.email,
              phone: input.phone ?? null,
              userId: user.id,
            });
          }
        } catch (e) {
          // Non-critical — admin can link manually later
          console.warn("[EmailAuth] Failed to auto-create subcontractor:", e);
        }
      }

      return {
        success: true,
        message: "Account created! Please wait for admin approval before you can log in.",
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await getUserByEmail(input.email);

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }

      // Verify password
      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }

      // Check if approved
      if (!user.isApproved) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your account is pending admin approval. Please check back later.",
        });
      }

      // Create session token using the SDK
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name ?? "",
      });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  // Admin: get pending users awaiting approval
  pendingUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getPendingUsers();
  }),

  // Admin: approve a user
  approve: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await approveUser(input.userId);

      // Auto-link: check if there's a subcontractor with matching email
      const user = await getUserByEmail(
        (await getPendingUsers()).find((u) => u.id === input.userId)?.email ?? ""
      );
      // The user is now approved, try to auto-link to sub if not already linked
      if (user) {
        const existingSub = await getSubcontractorByUserId(user.id);
        if (!existingSub) {
          // Check if there's a subcontractor with matching email that has no user linked
          const allSubs = await getAllSubcontractors();
          const matchingSub = allSubs.find(
            (s) => s.email?.toLowerCase() === user.email?.toLowerCase() && !s.userId
          );
          if (matchingSub) {
            const db = await getDb();
            if (db) {
              await db
                .update(subcontractors)
                .set({ userId: user.id })
                .where(eq(subcontractors.id, matchingSub.id));
            }
          }
        }
      }

      return { success: true };
    }),

  // Admin: reject/revoke a user
  reject: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await rejectUser(input.userId);
      return { success: true };
    }),
});
