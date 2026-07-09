import { and, desc, eq, gte, inArray, like, lt, lte, ne, notInArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Financial,
  InsertFinancial,
  InsertProject,
  InsertProjectAssignment,
  InsertProjectFile,
  InsertProjectNote,
  InsertSubcontractor,
  InsertUser,
  Project,
  ProjectAssignment,
  ProjectFile,
  ProjectNote,
  ProjectStatus,
  Subcontractor,
  ProjectProposal,
  InsertProjectProposal,
  ProjectChecklistItem,
  InsertProjectChecklistItem,
  WeeklyReport,
  InsertWeeklyReport,
  financials,
  projectAssignments,
  projectFiles,
  projectNotes,
  projects,
  subcontractors,
  users,
  projectProposals,
  projectChecklistItems,
  weeklyReports,
} from "../drizzle/schema";
import { checklistActivity, type InsertChecklistActivity, type ChecklistActivity } from "../drizzle/schema";
import { reportSnapshots } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function createEmailUser(data: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `email_${data.email}`;
  await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: "email",
    role: "user",
    isApproved: false,
    lastSignedIn: new Date(),
  });
  return getUserByEmail(data.email);
}

export async function approveUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ isApproved: true }).where(eq(users.id, userId));
}

export async function rejectUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ isApproved: false }).where(eq(users.id, userId));
}

export async function getPendingUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.isApproved, false)).orderBy(desc(users.createdAt));
}

// ─── Subcontractors ───────────────────────────────────────────────────────────
export async function getAllSubcontractors(): Promise<Subcontractor[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subcontractors).orderBy(subcontractors.companyName);
}

export async function getSubcontractorById(id: number): Promise<Subcontractor | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subcontractors).where(eq(subcontractors.id, id)).limit(1);
  return result[0];
}

export async function getSubcontractorByUserId(userId: number): Promise<Subcontractor | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(subcontractors)
    .where(eq(subcontractors.userId, userId))
    .limit(1);
  return result[0];
}

export async function createSubcontractor(data: InsertSubcontractor): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(subcontractors).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateSubcontractor(
  id: number,
  data: Partial<InsertSubcontractor>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subcontractors).set(data).where(eq(subcontractors.id, id));
}

export async function deleteSubcontractor(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(subcontractors).where(eq(subcontractors.id, id));
}

// ─── Projects ─────────────────────────────────────────────────────────────────
export interface ProjectFilters {
  status?: ProjectStatus;
  subcontractorId?: number;
  isUnassigned?: boolean;
  search?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  isArchived?: boolean;
  includeInspectionPassed?: boolean; // When true, includes Inspection Passed projects in results
}

export async function getAllProjects(filters?: ProjectFilters): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.status) conditions.push(eq(projects.status, filters.status));
  if (filters?.isArchived !== undefined)
    conditions.push(eq(projects.isArchived, filters.isArchived));
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    conditions.push(
      or(
        sql`LOWER(${projects.name}) LIKE ${`%${searchLower}%`}`,
        sql`LOWER(${projects.address}) LIKE ${`%${searchLower}%`}`,
        sql`LOWER(${projects.gcCompany}) LIKE ${`%${searchLower}%`}`
      )
    );
  }
  if (filters?.startDateFrom) conditions.push(gte(projects.startDate, filters.startDateFrom));
  if (filters?.startDateTo) conditions.push(lte(projects.startDate, filters.startDateTo));

  let query = db.select().from(projects).orderBy(desc(projects.isUrgent), desc(projects.createdAt), desc(projects.updatedAt));

  if (filters?.isUnassigned) {
    // Get all project IDs that have assignments
    const assignedProjectIds = await db
      .select({ projectId: projectAssignments.projectId })
      .from(projectAssignments);
    const ids = assignedProjectIds.map((a) => a.projectId);
    // Filter to projects that are NOT in the assignments list
    if (ids.length > 0) {
      conditions.push(notInArray(projects.id, ids));
    }
    // If no assignments exist, all projects are unassigned
    // Exclude Inspection Passed projects when filtering by unassigned
    conditions.push(ne(projects.status, "Inspection Passed"));
  } else if (filters?.subcontractorId) {
    // Join with assignments to filter by subcontractor
    const assignedProjectIds = await db
      .select({ projectId: projectAssignments.projectId })
      .from(projectAssignments)
      .where(eq(projectAssignments.subcontractorId, filters.subcontractorId));
    const ids = assignedProjectIds.map((a) => a.projectId);
    if (ids.length === 0) return [];
    conditions.push(inArray(projects.id, ids));
    // Exclude Inspection Passed projects when filtering by subcontractor UNLESS status is explicitly set to "Inspection Passed"
    if (filters?.status !== "Inspection Passed") {
      conditions.push(ne(projects.status, "Inspection Passed"));
    }
  } else if (!filters?.status && !filters?.search && !filters?.includeInspectionPassed) {
    // Only exclude Inspection Passed when:
    // - no status filter AND
    // - no search query AND
    // - includeInspectionPassed is not explicitly true
    // This allows showing them when explicitly filtering for "Inspection Passed", searching by name, or requesting them via includeInspectionPassed
    conditions.push(ne(projects.status, "Inspection Passed"));
  }

  if (conditions.length > 0) {
    return db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.isUrgent), desc(projects.createdAt), desc(projects.updatedAt));
  }

  return query;
}

export async function getProjectsForSubcontractor(subcontractorId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];
  const assignedIds = await db
    .select({ projectId: projectAssignments.projectId })
    .from(projectAssignments)
    .where(eq(projectAssignments.subcontractorId, subcontractorId));
  if (assignedIds.length === 0) return [];
  const ids = assignedIds.map((a) => a.projectId);
  return db
    .select()
    .from(projects)
    .where(and(inArray(projects.id, ids), eq(projects.isArchived, false)))
    .orderBy(desc(projects.updatedAt));
}

export async function getProjectById(id: number): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0];
}

export async function createProject(data: InsertProject): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Convert timestamps to Date objects if they are numbers
  const cleanData = { ...data };
  if (typeof cleanData.startDate === 'number') {
    cleanData.startDate = new Date(cleanData.startDate);
  }
  if (typeof cleanData.estimatedEndDate === 'number') {
    cleanData.estimatedEndDate = new Date(cleanData.estimatedEndDate);
  }
  if (typeof cleanData.actualEndDate === 'number') {
    cleanData.actualEndDate = new Date(cleanData.actualEndDate);
  }
  
  const result = await db.insert(projects).values(cleanData);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateProject(id: number, data: Partial<InsertProject>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Convert timestamps to Date objects if they are numbers
  const cleanData = { ...data };
  if (typeof cleanData.startDate === 'number') {
    cleanData.startDate = new Date(cleanData.startDate);
  }
  if (typeof cleanData.estimatedEndDate === 'number') {
    cleanData.estimatedEndDate = new Date(cleanData.estimatedEndDate);
  }
  if (typeof cleanData.actualEndDate === 'number') {
    cleanData.actualEndDate = new Date(cleanData.actualEndDate);
  }
  
  await db.update(projects).set(cleanData).where(eq(projects.id, id));
}

export async function deleteProject(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projects).where(eq(projects.id, id));
}

/** Bump a project's updatedAt so activity (checklist, change orders, etc.) floats it to the top of lists. */
export async function touchProject(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, id));
}

// ─── Project Assignments ──────────────────────────────────────────────────────
export async function getAssignmentsForProject(projectId: number): Promise<ProjectAssignment[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(projectAssignments)
    .where(eq(projectAssignments.projectId, projectId));
}

export async function assignSubcontractor(projectId: number, subcontractorId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectAssignments).values({
    projectId,
    subcontractorId,
    assignedAt: new Date(),
  });
  return (result[0] as { insertId: number }).insertId;
}

export async function removeAssignment(projectId: number, subcontractorId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(projectAssignments)
    .where(
      and(
        eq(projectAssignments.projectId, projectId),
        eq(projectAssignments.subcontractorId, subcontractorId)
      )
    );
}

export async function deleteAssignmentById(assignmentId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(projectAssignments)
    .where(eq(projectAssignments.id, assignmentId));
}


export async function updateProjectAssignment(
  assignmentId: number,
  subcontractorId: number,
  role?: string
): Promise<ProjectAssignment | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .update(projectAssignments)
    .set({
      subcontractorId,
      role: role || null,
    })
    .where(eq(projectAssignments.id, assignmentId));
  
  // Return the updated assignment
  const updated = await db
    .select()
    .from(projectAssignments)
    .where(eq(projectAssignments.id, assignmentId))
    .limit(1);
  
  return updated[0] || null;
}

export async function getAssignmentsWithSubcontractorDetails(
  projectId: number
): Promise<(ProjectAssignment & { subcontractor: Subcontractor })[]> {
  const db = await getDb();
  if (!db) return [];
  const assignments = await db
    .select()
    .from(projectAssignments)
    .where(eq(projectAssignments.projectId, projectId));
  
  const result = [];
  for (const assignment of assignments) {
    const sub = await db
      .select()
      .from(subcontractors)
      .where(eq(subcontractors.id, assignment.subcontractorId))
      .limit(1);
    if (sub[0]) {
      result.push({ ...assignment, subcontractor: sub[0] });
    }
  }
  return result;
}

export async function isSubcontractorAssignedToProject(
  subcontractorId: number,
  projectId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(projectAssignments)
    .where(
      and(
        eq(projectAssignments.subcontractorId, subcontractorId),
        eq(projectAssignments.projectId, projectId)
      )
    )
    .limit(1);
  return result.length > 0;
}

// ─── Financials ───────────────────────────────────────────────────────────────
export async function getFinancialByProjectId(projectId: number): Promise<Financial | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(financials)
    .where(eq(financials.projectId, projectId))
    .limit(1);
  return result[0];
}

export async function upsertFinancial(data: InsertFinancial): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(financials).values(data).onDuplicateKeyUpdate({
    set: {
      contractValue: data.contractValue,
      amountBilled: data.amountBilled,
      amountReceived: data.amountReceived,
      subcontractorPayout: data.subcontractorPayout,
      billingStatus: data.billingStatus,
      notes: data.notes,
    },
  });
}

// ─── Project Notes ────────────────────────────────────────────────────────────
export async function getNotesForProject(
  projectId: number,
  isAdmin: boolean
): Promise<ProjectNote[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(projectNotes.projectId, projectId)];
  if (!isAdmin) conditions.push(eq(projectNotes.isAdminOnly, false));
  return db
    .select()
    .from(projectNotes)
    .where(and(...conditions))
    .orderBy(desc(projectNotes.createdAt));
}

export async function createNote(data: InsertProjectNote): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectNotes).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function deleteNote(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectNotes).where(eq(projectNotes.id, id));
}

// ─── Project Files ────────────────────────────────────────────────────────────
export async function getFilesForProject(
  projectId: number,
  isAdmin: boolean
): Promise<ProjectFile[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(projectFiles.projectId, projectId)];
  if (!isAdmin) conditions.push(eq(projectFiles.isAdminOnly, false));
  return db
    .select()
    .from(projectFiles)
    .where(and(...conditions))
    .orderBy(desc(projectFiles.createdAt));
}

export async function createFile(data: InsertProjectFile): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectFiles).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function deleteFile(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectFiles).where(eq(projectFiles.id, id));
}

export async function getFileById(id: number): Promise<ProjectFile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projectFiles).where(eq(projectFiles.id, id)).limit(1);
  return result[0];
}


// ─── Project Checklists ───────────────────────────────────────────────────────
import { projectChecklists, InsertProjectChecklist, ProjectChecklist, changeOrders, InsertChangeOrder, ChangeOrder } from "../drizzle/schema";

export async function createChecklist(data: InsertProjectChecklist): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectChecklists).values(data);
  return result[0].insertId;
}

export async function getChecklistsForProject(projectId: number): Promise<ProjectChecklist[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectChecklists).where(eq(projectChecklists.projectId, projectId));
}

export async function updateChecklist(id: number, data: Partial<InsertProjectChecklist>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(projectChecklists).set(data).where(eq(projectChecklists.id, id));
}

export async function deleteChecklist(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(projectChecklists).where(eq(projectChecklists.id, id));
}

// ─── Change Orders ────────────────────────────────────────────────────────────
export async function createChangeOrder(data: InsertChangeOrder): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(changeOrders).values(data);
  return result[0].insertId;
}

export async function getChangeOrdersForProject(projectId: number): Promise<ChangeOrder[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(changeOrders).where(eq(changeOrders.projectId, projectId));
}

export async function updateChangeOrder(id: number, data: Partial<InsertChangeOrder>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(changeOrders).set(data).where(eq(changeOrders.id, id));
}

export async function deleteChangeOrder(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(changeOrders).where(eq(changeOrders.id, id));
}

// ─── User Permissions ─────────────────────────────────────────────────────────
export async function updateUserPermission(userId: number, permission: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ permission: permission as any }).where(eq(users.id, userId));
}

// ─── Project Messages (Chat) ─────────────────────────────────────────────────
import { projectMessages, InsertProjectMessage, ProjectMessage } from "../drizzle/schema";

export async function getMessagesForProject(
  projectId: number,
  isAdmin: boolean
): Promise<ProjectMessage[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(projectMessages.projectId, projectId)];
  if (!isAdmin) conditions.push(eq(projectMessages.isAdminOnly, false));
  return db
    .select()
    .from(projectMessages)
    .where(and(...conditions))
    .orderBy(projectMessages.createdAt);
}

export async function createMessage(data: InsertProjectMessage): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectMessages).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function deleteMessage(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectMessages).where(eq(projectMessages.id, id));
}

// ─── User Management ─────────────────────────────────────────────────────────
export async function updateUserRole(userId: number, role: "user" | "admin"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}


// ─── Project Proposals ────────────────────────────────────────────────────────
export async function createProposal(data: InsertProjectProposal): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectProposals).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function getProposalByProjectId(projectId: number): Promise<ProjectProposal | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(projectProposals)
    .where(eq(projectProposals.projectId, projectId))
    .orderBy(desc(projectProposals.createdAt))
    .limit(1);
  return result[0];
}

export async function getProposalById(id: number): Promise<ProjectProposal | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(projectProposals)
    .where(eq(projectProposals.id, id))
    .limit(1);
  return result[0];
}

export async function deleteProposal(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectProposals).where(eq(projectProposals.id, id));
}

// ─── Project Checklist Items ──────────────────────────────────────────────────
export async function createChecklistItem(data: InsertProjectChecklistItem): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectChecklistItems).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function getChecklistItemsForProject(projectId: number): Promise<ProjectChecklistItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(projectChecklistItems)
    .where(eq(projectChecklistItems.projectId, projectId))
    .orderBy(projectChecklistItems.order);
}
export async function getChecklistItemsForSubcontractor(
  projectId: number,
  subcontractorId: number
): Promise<ProjectChecklistItem[]> {
  const db = await getDb();
  if (!db) return [];
  // Subcontractors see ONLY items explicitly assigned to them (not unassigned ones).
  return db
    .select()
    .from(projectChecklistItems)
    .where(
      and(
        eq(projectChecklistItems.projectId, projectId),
        eq(projectChecklistItems.assignedSubcontractorId, subcontractorId)
      )
    )
    .orderBy(projectChecklistItems.order);
}


export async function updateChecklistItem(
  id: number,
  data: Partial<InsertProjectChecklistItem>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projectChecklistItems).set(data).where(eq(projectChecklistItems.id, id));
}

export async function deleteChecklistItem(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectChecklistItems).where(eq(projectChecklistItems.id, id));
}

export async function assignChecklistItem(
  itemId: number,
  subcontractorId: number | null
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(projectChecklistItems)
    .set({ assignedSubcontractorId: subcontractorId })
    .where(eq(projectChecklistItems.id, itemId));
}

export async function reorderChecklistItems(
  projectId: number,
  items: Array<{ id: number; order: number }>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  for (const item of items) {
    await db
      .update(projectChecklistItems)
      .set({ order: item.order })
      .where(eq(projectChecklistItems.id, item.id));
  }
}

export async function deleteAllChecklistItemsForProject(projectId: number, source?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (source) {
    // Delete only items with specific source
    await db.delete(projectChecklistItems).where(
      and(eq(projectChecklistItems.projectId, projectId), eq(projectChecklistItems.source, source as any))
    );
  } else {
    // Delete all items for project
    await db.delete(projectChecklistItems).where(eq(projectChecklistItems.projectId, projectId));
  }
}



// ─── Weekly Reports ──────────────────────────────────────────────────────────
export async function createWeeklyReport(
  report: InsertWeeklyReport
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(weeklyReports).values(report);
  // Extract the insertId from the result
  const insertId = (result as any)[0]?.insertId || (result as any).insertId;
  if (typeof insertId === 'number') return insertId;
  throw new Error("Failed to get insert ID");
}

export async function getAllWeeklyReports(): Promise<WeeklyReport[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(weeklyReports)
    .orderBy(desc(weeklyReports.reportDate));
}

export async function getWeeklyReportById(id: number): Promise<WeeklyReport | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(weeklyReports)
    .where(eq(weeklyReports.id, id))
    .limit(1);

  return result[0] || null;
}

export async function deleteWeeklyReport(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(weeklyReports).where(eq(weeklyReports.id, id));
}

export async function getWeeklyReportsByUser(userId: number): Promise<WeeklyReport[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(weeklyReports)
    .where(eq(weeklyReports.generatedBy, userId))
    .orderBy(desc(weeklyReports.reportDate));
}

// ─── Checklist Activity Log ──────────────────────────────────────────────────
export async function getChecklistItemById(id: number): Promise<ProjectChecklistItem | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(projectChecklistItems)
    .where(eq(projectChecklistItems.id, id))
    .limit(1);
  return result[0];
}

export async function getChangeOrderById(id: number): Promise<ChangeOrder | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(changeOrders).where(eq(changeOrders.id, id)).limit(1);
  return result[0];
}

/** Append a checklist-activity row. Never throws — logging must not break the action. */
export async function logChecklistActivity(data: InsertChecklistActivity): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(checklistActivity).values(data);
  } catch (error) {
    console.warn("[ChecklistActivity] Failed to log:", error);
  }
}

/** Checklist activity in [from, to], optionally one project, ordered by project then time. */
export async function getChecklistActivityBetween(
  from: Date,
  to: Date,
  projectId?: number
): Promise<ChecklistActivity[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    gte(checklistActivity.createdAt, from),
    lte(checklistActivity.createdAt, to),
  ];
  if (projectId !== undefined) conditions.push(eq(checklistActivity.projectId, projectId));
  return db
    .select()
    .from(checklistActivity)
    .where(and(...conditions))
    .orderBy(checklistActivity.projectId, checklistActivity.createdAt);
}

/** Progress captured for a project's items in a specific report week: itemId -> progress. */
export async function getReportSnapshotProgress(
  projectId: number,
  weekStart: Date
): Promise<Map<number, number>> {
  const db = await getDb();
  const map = new Map<number, number>();
  if (!db) return map;
  const rows = await db
    .select()
    .from(reportSnapshots)
    .where(and(eq(reportSnapshots.projectId, projectId), eq(reportSnapshots.weekStart, weekStart)));
  for (const r of rows) map.set(r.itemId, r.progress);
  return map;
}

/** Replace a project's snapshots for a report week with the given item progress values. */
export async function saveReportSnapshots(
  projectId: number,
  weekStart: Date,
  entries: Array<{ itemId: number; progress: number }>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(reportSnapshots)
    .where(and(eq(reportSnapshots.projectId, projectId), eq(reportSnapshots.weekStart, weekStart)));
  if (entries.length === 0) return;
  await db.insert(reportSnapshots).values(
    entries.map((e) => ({ projectId, weekStart, itemId: e.itemId, progress: e.progress }))
  );
}

