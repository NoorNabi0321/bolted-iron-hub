import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getDb } from "../db";
import { serviceTokens } from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Validate Bearer token from Authorization header with retry logic
 */
async function validateBearerToken(
  token: string,
  retries: number = 2
): Promise<(User & { isServiceToken: boolean }) | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const db = await getDb();
      if (!db) {
        console.error(`[Auth] Database not connected (attempt ${attempt + 1}/${retries + 1})`);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
          continue;
        }
        return null;
      }

      const result = await db
        .select()
        .from(serviceTokens)
        .where(
          and(
            eq(serviceTokens.token, token),
            eq(serviceTokens.isActive, true),
            gt(serviceTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      if (result.length === 0) {
        console.warn("[Auth] Invalid or expired service token");
        return null;
      }

      const tokenRecord = result[0];
      console.log(`[Auth] Service token validated: ${tokenRecord.name}`);

      // Return a synthetic service user
      return {
        id: 0,
        openId: `service-token-${tokenRecord.id}`,
        name: tokenRecord.name,
        email: null,
        loginMethod: "service_token",
        role: "admin",
        permission: "admin",
        createdAt: tokenRecord.createdAt,
        updatedAt: tokenRecord.updatedAt,
        lastSignedIn: new Date(),
        passwordHash: null,
        isApproved: true,
        isServiceToken: true,
      } as any as User & { isServiceToken: boolean };
    } catch (error) {
      console.error(`[Auth] Bearer token validation error (attempt ${attempt + 1}/${retries + 1}):`, error);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * Type extension for User with service token flag
 */
declare global {
  namespace Express {
    interface Request {
      user?: User & { isServiceToken?: boolean };
    }
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Check for Bearer token first (for service-to-service auth)
  const authHeader = opts.req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const serviceUser = await validateBearerToken(token);
    if (serviceUser) {
      console.log(`[Auth] Authenticated as service: ${serviceUser.name}`);
      return {
        req: opts.req,
        res: opts.res,
        user: serviceUser,
      };
    } else {
      // Bearer token was provided but invalid/expired
      // Don't fall back to OAuth - return null user (will trigger 401 for protected procedures)
      console.warn("[Auth] Bearer token provided but invalid or expired");
      return {
        req: opts.req,
        res: opts.res,
        user: null,
      };
    }
  }

  // Fall back to OAuth session authentication (only if no Bearer token was provided)
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user: user as (User & { isServiceToken?: boolean }) | null,
  };
}
