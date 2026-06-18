import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import * as db from "../db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "user" = "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("checklists.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes checklist item from project_checklist_items table", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    // Mock the database function
    const mockDeleteChecklistItem = vi.spyOn(db, "deleteChecklistItem").mockResolvedValue(undefined);

    const result = await caller.checklists.delete({
      id: 42,
    });

    expect(result).toEqual({ success: true });
    expect(mockDeleteChecklistItem).toHaveBeenCalledWith(42);
    expect(mockDeleteChecklistItem).toHaveBeenCalledTimes(1);

    mockDeleteChecklistItem.mockRestore();
  });

  it("requires admin role", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.checklists.delete({
        id: 42,
      });
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("does not call deleteChecklist (which deletes from wrong table)", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const mockDeleteChecklistItem = vi.spyOn(db, "deleteChecklistItem").mockResolvedValue(undefined);
    const mockDeleteChecklist = vi.spyOn(db, "deleteChecklist").mockResolvedValue(undefined);

    await caller.checklists.delete({
      id: 42,
    });

    // Verify deleteChecklistItem was called (correct table)
    expect(mockDeleteChecklistItem).toHaveBeenCalledWith(42);

    // Verify deleteChecklist was NOT called (wrong table)
    expect(mockDeleteChecklist).not.toHaveBeenCalled();

    mockDeleteChecklistItem.mockRestore();
    mockDeleteChecklist.mockRestore();
  });
});
