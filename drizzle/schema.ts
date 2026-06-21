import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
} from "drizzle-orm/mysql-core";

export const PERMISSION_LEVELS = ["view", "edit", "admin"] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  permission: mysqlEnum("permission", PERMISSION_LEVELS).default("view").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  isApproved: boolean("isApproved").default(false).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Subcontractors ───────────────────────────────────────────────────────────
export const subcontractors = mysqlTable("subcontractors", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  trade: varchar("trade", { length: 100 }),
  notes: text("notes"),
  // Linked user account (optional – set when the sub logs in via OAuth)
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subcontractor = typeof subcontractors.$inferSelect;
export type InsertSubcontractor = typeof subcontractors.$inferInsert;

// ─── Projects ─────────────────────────────────────────────────────────────────
export const PROJECT_STATUSES = [
  "Review",
  "Shop Drawings",
  "Fabrication",
  "On-Site",
  "Installed",
  "Inspection Passed",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  borough: varchar("borough", { length: 100 }),
  gcCompany: varchar("gcCompany", { length: 255 }),
  gcContactName: varchar("gcContactName", { length: 255 }),
  gcContactPhone: varchar("gcContactPhone", { length: 50 }),
  gcContactEmail: varchar("gcContactEmail", { length: 320 }),
  siteSuperName: varchar("siteSuperName", { length: 255 }),
  siteSuperPhone: varchar("siteSuperPhone", { length: 50 }),
  status: mysqlEnum("status", PROJECT_STATUSES).default("Shop Drawings").notNull(),
  startDate: timestamp("startDate"),
  startTime: varchar("startTime", { length: 5 }), // HH:MM format
  estimatedEndDate: timestamp("estimatedEndDate"),
  estimatedEndTime: varchar("estimatedEndTime", { length: 5 }), // HH:MM format
  actualEndDate: timestamp("actualEndDate"),
  actualEndTime: varchar("actualEndTime", { length: 5 }), // HH:MM format
  description: text("description"),
  primarySubcontractorId: int("primarySubcontractorId"),
  proposalFileUrl: text("proposalFileUrl"),
  isArchived: boolean("isArchived").default(false).notNull(),
  isUrgent: boolean("isUrgent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── Project Assignments (links subs to projects) ─────────────────────────────
export const projectAssignments = mysqlTable("project_assignments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  subcontractorId: int("subcontractorId").notNull(),
  role: varchar("role", { length: 100 }), // e.g. "Structural Steel", "Misc Metals"
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
});

export type ProjectAssignment = typeof projectAssignments.$inferSelect;
export type InsertProjectAssignment = typeof projectAssignments.$inferInsert;

// ─── Financials (admin-only) ──────────────────────────────────────────────────
export const financials = mysqlTable("financials", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(),
  contractValue: decimal("contractValue", { precision: 14, scale: 2 }),
  amountBilled: decimal("amountBilled", { precision: 14, scale: 2 }),
  amountReceived: decimal("amountReceived", { precision: 14, scale: 2 }),
  subcontractorPayout: decimal("subcontractorPayout", { precision: 14, scale: 2 }),
  billingStatus: mysqlEnum("billingStatus", [
    "Not Started",
    "Partial",
    "Fully Billed",
    "Paid",
  ]).default("Not Started"),
  notes: text("notes"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Financial = typeof financials.$inferSelect;
export type InsertFinancial = typeof financials.$inferInsert;

// ─── Project Notes ────────────────────────────────────────────────────────────
export const projectNotes = mysqlTable("project_notes", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  authorId: int("authorId").notNull(),
  authorName: varchar("authorName", { length: 255 }),
  content: text("content").notNull(),
  isAdminOnly: boolean("isAdminOnly").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectNote = typeof projectNotes.$inferSelect;
export type InsertProjectNote = typeof projectNotes.$inferInsert;

// ─── Project Files ────────────────────────────────────────────────────────────
export const projectFiles = mysqlTable("project_files", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  uploaderId: int("uploaderId").notNull(),
  uploaderName: varchar("uploaderName", { length: 255 }),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  isAdminOnly: boolean("isAdminOnly").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = typeof projectFiles.$inferInsert;


// ─── Project Checklists ───────────────────────────────────────────────────────
export const projectChecklists = mysqlTable("project_checklists", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedBy: varchar("completedBy", { length: 255 }),
  completedAt: timestamp("completedAt"),
  /** Cost amount entered by subcontractor for this line item */
  cost: decimal("cost", { precision: 14, scale: 2 }),
  costUpdatedBy: varchar("costUpdatedBy", { length: 255 }),
  costUpdatedAt: timestamp("costUpdatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectChecklist = typeof projectChecklists.$inferSelect;
export type InsertProjectChecklist = typeof projectChecklists.$inferInsert;

// ─── Change Orders ────────────────────────────────────────────────────────────
export const changeOrders = mysqlTable("change_orders", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdBy: varchar("createdBy", { length: 255 }),
  approvedBy: varchar("approvedBy", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChangeOrder = typeof changeOrders.$inferSelect;
export type InsertChangeOrder = typeof changeOrders.$inferInsert;

// ─── Project Messages (Chat) ─────────────────────────────────────────────────
export const projectMessages = mysqlTable("project_messages", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  senderId: int("senderId").notNull(),
  senderName: varchar("senderName", { length: 255 }),
  content: text("content").notNull(),
  /** Comma-separated user IDs that were @mentioned */
  mentions: text("mentions"),
  /** If true, only admins can see this message */
  isAdminOnly: boolean("isAdminOnly").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectMessage = typeof projectMessages.$inferSelect;
export type InsertProjectMessage = typeof projectMessages.$inferInsert;

// ─── Project Proposals ────────────────────────────────────────────────────────
export const projectProposals = mysqlTable("project_proposals", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  extractedItemsCount: int("extractedItemsCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectProposal = typeof projectProposals.$inferSelect;
export type InsertProjectProposal = typeof projectProposals.$inferInsert;

// ─── Project Checklist Items (from proposals) ─────────────────────────────────
export const projectChecklistItems = mysqlTable("project_checklist_items", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  text: text("text").notNull(),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  /** Manual work-progress 0–100 (reported by the assigned sub or an admin). 100 = complete. */
  progress: int("progress").default(0).notNull(),
  order: int("order").notNull(),
  source: mysqlEnum("source", ["manual", "extracted"]).default("manual").notNull(),
  assignedSubcontractorId: int("assignedSubcontractorId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectChecklistItem = typeof projectChecklistItems.$inferSelect;
export type InsertProjectChecklistItem = typeof projectChecklistItems.$inferInsert;

// ─── WhatsApp Authorized Groups ───────────────────────────────────────────────
export const whatsappAuthorizedGroups = mysqlTable("whatsapp_authorized_groups", {
  id: int("id").autoincrement().primaryKey(),
  groupChatId: varchar("groupChatId", { length: 255 }).notNull().unique(),
  groupName: varchar("groupName", { length: 255 }).notNull(),
  isEnabled: boolean("isEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastActivityAt: timestamp("lastActivityAt"),
  notes: text("notes"),
});

export type WhatsAppAuthorizedGroup = typeof whatsappAuthorizedGroups.$inferSelect;
export type InsertWhatsAppAuthorizedGroup = typeof whatsappAuthorizedGroups.$inferInsert;

// ─── WhatsApp Messages Log ────────────────────────────────────────────────────
export const whatsappMessagesLog = mysqlTable("whatsapp_messages_log", {
  id: int("id").autoincrement().primaryKey(),
  groupChatId: varchar("groupChatId", { length: 255 }).notNull(),
  senderPhoneNumber: varchar("senderPhoneNumber", { length: 20 }).notNull(),
  messageText: text("messageText").notNull(),
  commandType: varchar("commandType", { length: 50 }),
  responseText: text("responseText"),
  status: mysqlEnum("status", ["success", "error", "unauthorized"]).notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WhatsAppMessageLog = typeof whatsappMessagesLog.$inferSelect;
export type InsertWhatsAppMessageLog = typeof whatsappMessagesLog.$inferInsert;


// ─// ─── WhatsApp Group Admins (phone numbers authorized for each group) ────────
export const whatsappGroupAdmins = mysqlTable("whatsapp_group_admins", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(), // Foreign key to whatsapp_authorized_groups
  adminPhoneNumber: varchar("adminPhoneNumber", { length: 20 }).notNull(),
  adminName: varchar("adminName", { length: 255 }), // Optional: name of the admin
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhatsAppGroupAdmin = typeof whatsappGroupAdmins.$inferSelect;
export type InsertWhatsAppGroupAdmin = typeof whatsappGroupAdmins.$inferInsert;

// ─── WhatsApp Group Command Permissions (per-group command access) ───────────
export const whatsappGroupCommandPermissions = mysqlTable("whatsapp_group_command_permissions", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(), // Foreign key to whatsapp_authorized_groups
  command: varchar("command", { length: 50 }).notNull(),
  allowedForAdmins: boolean("allowedForAdmins").default(true).notNull(), // Admins can use this command
  allowedForMembers: boolean("allowedForMembers").default(false).notNull(), // Regular members can use this command
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhatsAppGroupCommandPermission = typeof whatsappGroupCommandPermissions.$inferSelect;
export type InsertWhatsAppGroupCommandPermission = typeof whatsappGroupCommandPermissions.$inferInsert;

// ─── WhatsApp Admin Users (DEPRECATED - kept for backward compatibility) ─────
export const whatsappAdminUsers = mysqlTable("whatsapp_admin_users", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull().unique(),
  role: mysqlEnum("role", ["admin", "super_admin"]).default("admin").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhatsAppAdminUser = typeof whatsappAdminUsers.$inferSelect;
export type InsertWhatsAppAdminUser = typeof whatsappAdminUsers.$inferInsert;

// ─── WhatsApp Command Permissions (DEPRECATED - kept for backward compatibility) ──
export const whatsappCommandPermissions = mysqlTable("whatsapp_command_permissions", {
  id: int("id").autoincrement().primaryKey(),
  command: varchar("command", { length: 50 }).notNull().unique(),
  requiredRole: mysqlEnum("requiredRole", ["admin", "super_admin"]).default("admin").notNull(),
  description: text("description"),
  isEnabled: boolean("isEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WhatsAppCommandPermission = typeof whatsappCommandPermissions.$inferSelect;
export type InsertWhatsAppCommandPermission = typeof whatsappCommandPermissions.$inferInsert;

// ─── Service Tokens (for bot and service-to-service authentication) ──────────
export const serviceTokens = mysqlTable("service_tokens", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ServiceToken = typeof serviceTokens.$inferSelect;
export type InsertServiceToken = typeof serviceTokens.$inferInsert;

// ─── Weekly Reports (for storing generated PDF reports) ──────────────────────
export const weeklyReports = mysqlTable("weekly_reports", {
  id: int("id").autoincrement().primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  generatedBy: int("generatedBy").notNull(), // User ID who generated the report
  reportDate: timestamp("reportDate").defaultNow().notNull(), // When the report was generated
  weekStartDate: timestamp("weekStartDate"), // Start of the week the report covers
  weekEndDate: timestamp("weekEndDate"), // End of the week the report covers
  totalProjects: int("totalProjects").default(0).notNull(), // Number of projects included
  totalCompleted: int("totalCompleted").default(0).notNull(), // Number of completed items
  totalItems: int("totalItems").default(0).notNull(), // Total checklist items
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WeeklyReport = typeof weeklyReports.$inferSelect;
export type InsertWeeklyReport = typeof weeklyReports.$inferInsert;

// ─── Checklist Activity Log (extracted-item completions & progress changes) ───
export const CHECKLIST_ACTIONS = ["completed", "reopened", "progress_updated"] as const;
export type ChecklistAction = (typeof CHECKLIST_ACTIONS)[number];

export const checklistActivity = mysqlTable("checklist_activity", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  itemId: int("itemId").notNull(),
  /** Snapshot of the item text at the time, so reports stay readable if the item changes. */
  itemText: text("itemText").notNull(),
  action: mysqlEnum("action", CHECKLIST_ACTIONS).notNull(),
  /** New progress value (0-100) for progress_updated / completed events; null otherwise. */
  progress: int("progress"),
  /** Who performed it (admin name or subcontractor company). */
  actorName: varchar("actorName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChecklistActivity = typeof checklistActivity.$inferSelect;
export type InsertChecklistActivity = typeof checklistActivity.$inferInsert;
