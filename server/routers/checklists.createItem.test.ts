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

describe("checklists.createItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a checklist item with correct parameters", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    // Mock the database functions
    const mockCreateChecklistItem = vi.spyOn(db, "createChecklistItem").mockResolvedValue(42);

    const result = await caller.checklists.createItem({
      projectId: 510005,
      text: "Test Checklist Item",
      order: 1,
    });

    expect(result).toEqual({ id: 42 });
    expect(mockCreateChecklistItem).toHaveBeenCalledWith({
      projectId: 510005,
      text: "Test Checklist Item",
      isCompleted: false,
      order: 1,
    });

    mockCreateChecklistItem.mockRestore();
  });

  it("requires admin or subcontractor access", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    // Mock getSubcontractorByUserId to return null (no subcontractor access)
    const mockGetSubcontractor = vi
      .spyOn(db, "getSubcontractorByUserId")
      .mockResolvedValue(null);

    try {
      await caller.checklists.createItem({
        projectId: 510005,
        text: "Test Item",
        order: 1,
      });
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }

    mockGetSubcontractor.mockRestore();
  });

  it("sets isCompleted to false by default", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const mockCreateChecklistItem = vi.spyOn(db, "createChecklistItem").mockResolvedValue(99);

    await caller.checklists.createItem({
      projectId: 123,
      text: "New Task",
      order: 5,
    });

    expect(mockCreateChecklistItem).toHaveBeenCalledWith(
      expect.objectContaining({
        isCompleted: false,
      })
    );

    mockCreateChecklistItem.mockRestore();
  });

  it("requires non-empty text", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.checklists.createItem({
        projectId: 510005,
        text: "", // Empty text should fail validation
        order: 1,
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });
});
