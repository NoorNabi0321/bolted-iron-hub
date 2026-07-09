import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { projectAssignments } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { PROJECT_STATUSES } from "../../drizzle/schema";
import {
  assignSubcontractor,
  createProject,
  deleteProject,
  getAllProjects,
  getAssignmentsForProject,
  getAssignmentsWithSubcontractorDetails,
  getProjectById,
  getProjectsForSubcontractor,
  getSubcontractorByUserId,
  isSubcontractorAssignedToProject,
  removeAssignment,
  updateProject,
  createProposal,
  getProposalByProjectId,
  getProposalById,
  deleteProposal,
  createChecklistItem,
  getChecklistItemsForProject,
  getChecklistItemsForSubcontractor,
  updateChecklistItem,
  deleteChecklistItem,
  assignChecklistItem,
  reorderChecklistItems,
  deleteAllChecklistItemsForProject,
  touchProject,
  updateProjectAssignment,
  deleteAssignmentById,
  createNote,
  deleteNote,
  getNotesForProject,
  createWeeklyReport,
  getAllWeeklyReports,
  deleteWeeklyReport,
  getWeeklyReportsByUser,
  getFinancialByProjectId,
  upsertFinancial,
  getChecklistItemById,
  logChecklistActivity,
  getChecklistActivityBetween,
  getReportSnapshotProgress,
  saveReportSnapshots,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { generateSchedulePDF, ScheduleData, generateProjectsListPDF, ProjectsListData, ProjectsListPDFOptions } from "../_core/pdfGenerator";
import { storagePut } from "../storage";
import { extractChecklistFromPDF } from "../_core/proposalExtractor";

const projectStatusEnum = z.enum(PROJECT_STATUSES);

const projectInput = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  borough: z.string().optional(),
  gcCompany: z.string().optional(),
  gcContactName: z.string().optional(),
  gcContactPhone: z.string().optional(),
  gcContactEmail: z.string().optional(),
  siteSuperName: z.string().optional(),
  siteSuperPhone: z.string().optional(),
  status: projectStatusEnum.optional(),
  startDate: z.number().nullable().optional(), // unix ms
  startTime: z.string().nullable().optional(), // HH:mm format
  estimatedEndDate: z.number().nullable().optional(),
  estimatedEndTime: z.string().nullable().optional(), // HH:mm format
  actualEndDate: z.number().optional(),
  description: z.string().optional(),
  isArchived: z.boolean().optional(),
  isUrgent: z.boolean().optional(),
});

// For partial updates, make all fields optional
const projectUpdateInput = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  borough: z.string().optional(),
  gcCompany: z.string().optional(),
  gcContactName: z.string().optional(),
  gcContactPhone: z.string().optional(),
  gcContactEmail: z.string().optional(),
  siteSuperName: z.string().optional(),
  siteSuperPhone: z.string().optional(),
  status: projectStatusEnum.optional(),
  startDate: z.number().nullable().optional(), // unix ms
  startTime: z.string().nullable().optional(), // HH:mm format
  estimatedEndDate: z.number().nullable().optional(),
  estimatedEndTime: z.string().nullable().optional(), // HH:mm format
  actualEndDate: z.number().optional(),
  description: z.string().optional(),
  isArchived: z.boolean().optional(),
  isUrgent: z.boolean().optional(),
});

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

/** The reporting week runs Wednesday 00:00 → Tuesday 23:59 (Tuesday is the last day). */
function getWeekWindow(reference?: Date): { weekStart: Date; weekEnd: Date } {
  const now = reference ?? new Date();
  const daysSinceWednesday = (now.getDay() - 3 + 7) % 7;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysSinceWednesday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
}

export const projectsRouter = router({
  // Progress page: projects with checklist activity (completion/progress on
  // extracted items) since last Wednesday, with their completion %.
  weeklyActiveProjects: adminProcedure.query(async () => {
    const { weekStart, weekEnd } = getWeekWindow();
    const activity = await getChecklistActivityBetween(weekStart, weekEnd);
    const seen = new Set<number>();
    const projectIds: number[] = [];
    for (const a of activity) {
      if (!seen.has(a.projectId)) {
        seen.add(a.projectId);
        projectIds.push(a.projectId);
      }
    }
    const result = [];
    for (const pid of projectIds) {
      const project = await getProjectById(pid);
      if (!project) continue;
      const items = await getChecklistItemsForProject(pid);
      const extracted = items.filter((i) => i.source === "extracted" && i.isActive);
      const totalCount = extracted.length;
      const completedCount = extracted.filter((i) => i.isCompleted).length;
      const completionPercentage = totalCount
        ? Math.round(extracted.reduce((s, i) => s + (i.isCompleted ? 100 : (i.progress ?? 0)), 0) / totalCount)
        : 0;
      const actionCount = activity.filter((a) => a.projectId === pid).length;
      result.push({
        id: project.id,
        name: project.name,
        status: project.status,
        completionPercentage,
        completedCount,
        totalCount,
        actionCount,
      });
    }
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }),

  // Progress page: weekly checklist progress report PDF (all active projects, or one).
  generateChecklistProgressReport: adminProcedure
    .input(z.object({ projectId: z.number().optional() }).optional())
    .mutation(async ({ input }) => {
      const { weekStart, weekEnd } = getWeekWindow();
      const prevWeekStart = new Date(weekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);

      // One project, or every non-archived project (including Inspection Passed).
      let projectList;
      if (input?.projectId) {
        const p = await getProjectById(input.projectId);
        projectList = p ? [p] : [];
      } else {
        projectList = await getAllProjects({ isArchived: false, includeInspectionPassed: true });
      }

      const projectsData = [];
      let totalActions = 0;
      for (const project of projectList) {
        // Full proposal checklist for this project — active AND inactive.
        const items = (await getChecklistItemsForProject(project.id))
          .filter((i) => i.source === "extracted")
          .sort((a, b) => a.order - b.order);
        if (items.length === 0) continue;

        const prevMap = await getReportSnapshotProgress(project.id, prevWeekStart);
        const hadBaseline = prevMap.size > 0;

        const reportItems = items.map((i) => {
          const current = i.isCompleted ? 100 : (i.progress ?? 0);
          const prev = prevMap.get(i.id);
          return {
            text: i.text,
            progress: current,
            isActive: i.isActive,
            isCompleted: i.isCompleted,
            change: prev === undefined ? null : current - prev, // null => no baseline ("-")
          };
        });

        // Overall progress = average across ACTIVE items (inactive don't count).
        const activeItems = reportItems.filter((i) => i.isActive);
        const overallProgress = activeItems.length
          ? Math.round(activeItems.reduce((s, i) => s + i.progress, 0) / activeItems.length)
          : 0;

        // Changed this week if any item moved, or a new item appeared after a baseline existed.
        const changedCount = reportItems.filter(
          (i) => (i.change !== null && i.change !== 0) || (i.change === null && hadBaseline)
        ).length;
        const noChange = hadBaseline && changedCount === 0;
        totalActions += changedCount;

        projectsData.push({
          id: project.id,
          name: project.name,
          status: project.status,
          overallProgress,
          noChange,
          items: reportItems,
        });

        // Snapshot this week's progress so next week can compute the change.
        await saveReportSnapshots(
          project.id,
          weekStart,
          items.map((i) => ({ itemId: i.id, progress: i.isCompleted ? 100 : (i.progress ?? 0) }))
        );
      }
      projectsData.sort((a, b) => a.name.localeCompare(b.name));

      const { generateChecklistProgressPDF } = await import("../_core/pdfGenerator");
      const pdfBuffer = await generateChecklistProgressPDF({
        weekStart,
        weekEnd,
        generatedAt: new Date(),
        projects: projectsData,
      });

      const fileName = `Progress_Report_${weekStart.toISOString().split("T")[0]}.pdf`;
      return {
        success: true,
        pdfBase64: pdfBuffer.toString("base64"),
        fileName,
        totalProjects: projectsData.length,
        totalActions,
      };
    }),

  // Admin: list all projects with optional filters
  list: adminProcedure
    .input(
      z
        .object({
          status: projectStatusEnum.optional(),
          subcontractorId: z.number().optional(),
          isUnassigned: z.boolean().optional(),
          search: z.string().optional(),
          startDateFrom: z.number().optional(),
          startDateTo: z.number().optional(),
          isArchived: z.boolean().optional(),
          includeInspectionPassed: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return getAllProjects({
        status: input?.status,
        subcontractorId: input?.subcontractorId,
        isUnassigned: input?.isUnassigned,
        search: input?.search,
        startDateFrom: input?.startDateFrom ? new Date(input.startDateFrom) : undefined,
        startDateTo: input?.startDateTo ? new Date(input.startDateTo) : undefined,
        isArchived: input?.isArchived,
        includeInspectionPassed: input?.includeInspectionPassed,
      });
    }),

  // Subcontractor: get their assigned projects
  myProjects: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) return [];
    const subcontractor = await getSubcontractorByUserId(ctx.user.id);
    if (!subcontractor) return [];
    return getProjectsForSubcontractor(subcontractor.id);
  }),

  // Subcontractor: get a specific project they are assigned to
  getForSubcontractor: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) return undefined;
      const subcontractor = await getSubcontractorByUserId(ctx.user.id);
      if (!subcontractor) return undefined;
      // Verify the subcontractor is assigned to this project
      const isAssigned = await isSubcontractorAssignedToProject(
        subcontractor.id,
        input.id
      );
      if (!isAssigned) return undefined;
      return getProjectById(input.id);
    }),

  // Admin: get project by ID
  getById: adminProcedure.input(z.number()).query(async ({ input }) => {
    return getProjectById(input);
  }),

  // Admin: get project by ID (alias for client compatibility)
  get: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return getProjectById(input.id);
  }),

  // Admin: create project
  create: adminProcedure
    .input(projectInput)
    .mutation(async ({ input }) => {
      const projectId = await createProject(input);
      const project = await getProjectById(projectId);
      return project;
    }),

  // Admin: update project
  update: adminProcedure
    .input(z.object({ id: z.number(), data: projectUpdateInput }))
    .mutation(async ({ input }) => {
      const { id, data } = input;
      // Filter out undefined values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
      );
      return updateProject(id, cleanData as any);
    }),

  // Admin: update project status
  updateStatus: adminProcedure
    .input(z.object({ id: z.number(), status: projectStatusEnum }))
    .mutation(async ({ input }) => {
      await updateProject(input.id, { status: input.status });
      return { success: true };
    }),

  // Admin: delete project
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // Delete all checklist items for this project first
      await deleteAllChecklistItemsForProject(input.id);
      // Delete all notes for this project
      const notes = await getNotesForProject(input.id);
      for (const note of notes) {
        await deleteNote(note.id);
      }
      // Delete the project
      return deleteProject(input.id);
    }),

  // Subcontractor: list assigned projects
  listAssigned: protectedProcedure.query(async ({ ctx }) => {
    const subcontractor = await getSubcontractorByUserId(ctx.user.id);
    if (!subcontractor) return [];
    return getProjectsForSubcontractor(subcontractor.id);
  }),

  // Admin: assign subcontractor to project
  assignSubcontractor: adminProcedure
    .input(z.object({ projectId: z.number(), subcontractorId: z.number(), role: z.string().optional() }))
    .mutation(async ({ input }) => {
      return assignSubcontractor(input.projectId, input.subcontractorId);
    }),

  // Admin: assign subcontractor to project (alias for client compatibility)
  assign: adminProcedure
    .input(z.object({ projectId: z.number(), subcontractorId: z.number(), role: z.string().optional() }))
    .mutation(async ({ input }) => {
      return assignSubcontractor(input.projectId, input.subcontractorId);
    }),

  // Admin: unassign subcontractor from project
  unassignSubcontractor: adminProcedure
    .input(z.object({ projectId: z.number(), subcontractorId: z.number() }))
    .mutation(async ({ input }) => {
      return removeAssignment(input.projectId, input.subcontractorId);
    }),

  // Admin: remove subcontractor from project (deprecated - use unassignSubcontractor)
  removeAssignment: adminProcedure
    .input(z.object({ projectId: z.number(), subcontractorId: z.number() }))
    .mutation(async ({ input }) => {
      return removeAssignment(input.projectId, input.subcontractorId);
    }),

  // Admin: delete assignment (alias for client compatibility)
  deleteAssignment: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteAssignmentById(input.id);
      return { success: true };
    }),

  // Admin: update assignment (alias for client compatibility)
  updateAssignment: adminProcedure
    .input(z.object({ assignmentId: z.number(), subcontractorId: z.number(), role: z.string().optional() }))
    .mutation(async ({ input }) => {
      const updated = await updateProjectAssignment(
        input.assignmentId,
        input.subcontractorId,
        input.role
      );
      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assignment not found',
        });
      }
      return updated;
    }),

  // Admin: get assignments for project
  getAssignments: adminProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return getAssignmentsWithSubcontractorDetails(input.projectId);
    }),

  // Admin: get files for project
  getFiles: adminProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      // Return empty array for now - files functionality can be added later
      return [];
    }),

  // Admin: get financial data for project
  getFinancial: adminProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return (await getFinancialByProjectId(input.projectId)) ?? null;
    }),

  // Admin: create proposal for project
  createProposal: adminProcedure
    .input(
      z.object({
        projectId: z.number(),
        fileName: z.string(),
        fileUrl: z.string(),
        extractedItemsCount: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createProposal({
        projectId: input.projectId,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        extractedItemsCount: input.extractedItemsCount ?? 0,
      });
    }),

  // Admin: get proposal for project
  getProposal: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Check if user is admin or assigned to this project
      if (ctx.user.role !== 'admin') {
        const subcontractor = await getSubcontractorByUserId(ctx.user.id);
        if (!subcontractor) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        const isAssigned = await isSubcontractorAssignedToProject(subcontractor.id, input.projectId);
        if (!isAssigned) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
      }
      const proposal = await getProposalByProjectId(input.projectId);
      return proposal || null;
    }),

  // Admin: delete proposal
  deleteProposal: adminProcedure
    .input(z.union([z.number(), z.object({ proposalId: z.number() })]))
    .mutation(async ({ input }) => {
      const proposalId = typeof input === "number" ? input : input.proposalId;
      return deleteProposal(proposalId);
    }),

  // Admin: create checklist item
  createChecklistItem: adminProcedure
    .input(
      z.object({
        projectId: z.number(),
        text: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        order: z.number().optional(),
        isCompleted: z.boolean().optional(),
        source: z.enum(["manual", "extracted"]).optional().default("manual"),
        isActive: z.boolean().optional(),
        isUserAdded: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createChecklistItem({
        projectId: input.projectId,
        text: input.text || input.title || "",
        isCompleted: input.isCompleted ?? false,
        order: input.order ?? 0,
        source: input.source,
        isActive: input.isActive ?? true,
        isUserAdded: input.isUserAdded ?? false,
      });
      await touchProject(input.projectId);
      return id;
    }),

  // Admin: get checklist items for project
  getChecklistItems: protectedProcedure
    .input(z.object({ projectId: z.number(), source: z.enum(["manual", "extracted"]).optional() }))
    .query(async ({ input, ctx }) => {
      // Check if user is admin or assigned to this project
      let items;
      if (ctx.user.role !== 'admin') {
        const subcontractor = await getSubcontractorByUserId(ctx.user.id);
        if (!subcontractor) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        const isAssigned = await isSubcontractorAssignedToProject(subcontractor.id, input.projectId);
        if (!isAssigned) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        // For subcontractors, only show items assigned to them
        items = await getChecklistItemsForSubcontractor(input.projectId, subcontractor.id);
      } else {
        // For admins, show all items
        items = await getChecklistItemsForProject(input.projectId);
      }
      if (input.source) {
        return items.filter((item: any) => item.source === input.source);
      }
      return items;
    }),

  // Admin: update checklist item
  updateChecklistItem: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        itemId: z.number(),
        isCompleted: z.boolean().optional(),
        text: z.string().optional(),
        progress: z.number().min(0).max(100).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { projectId, itemId, isCompleted, text, progress, isActive } = input;

      // Build the update; progress drives completion (100% = complete).
      const patch: { isCompleted?: boolean; text?: string; progress?: number; isActive?: boolean } = {};
      if (text !== undefined) patch.text = text;
      if (isCompleted !== undefined) patch.isCompleted = isCompleted;
      if (progress !== undefined) {
        patch.progress = progress;
        patch.isCompleted = progress >= 100;
      }
      // Activation (pressing an extracted item) is admin-only.
      if (isActive !== undefined && ctx.user.role === "admin") patch.isActive = isActive;

      // Resolve actor + permission. Admins can do anything; subs may only toggle
      // completion / set progress on their assigned project (no text edits).
      let actorName = ctx.user.name ?? "Admin";
      if (ctx.user.role !== 'admin') {
        if (!(text === undefined && (isCompleted !== undefined || progress !== undefined))) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only update completion or progress' });
        }
        const subcontractor = await getSubcontractorByUserId(ctx.user.id);
        if (!subcontractor) throw new TRPCError({ code: 'FORBIDDEN' });
        const isAssigned = await isSubcontractorAssignedToProject(subcontractor.id, projectId);
        if (!isAssigned) throw new TRPCError({ code: 'FORBIDDEN' });
        actorName = subcontractor.companyName;
      }

      // Snapshot before, update, then log activity for EXTRACTED items only.
      const before = await getChecklistItemById(itemId);
      await updateChecklistItem(itemId, patch);

      if (before && before.source === 'extracted') {
        if (patch.progress !== undefined && patch.progress !== before.progress) {
          await logChecklistActivity({
            projectId,
            itemId,
            itemText: before.text,
            action: 'progress_updated',
            progress: patch.progress,
            actorName,
          });
        }
        if (patch.isCompleted !== undefined && patch.isCompleted !== before.isCompleted) {
          await logChecklistActivity({
            projectId,
            itemId,
            itemText: before.text,
            action: patch.isCompleted ? 'completed' : 'reopened',
            progress: patch.isCompleted ? (patch.progress ?? 100) : (patch.progress ?? before.progress),
            actorName,
          });
        }
      }

      await touchProject(projectId);
      return { success: true };
    }),

  // Admin: delete checklist item
  deleteChecklistItem: adminProcedure
    .input(z.object({ projectId: z.number(), itemId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteChecklistItem(input.itemId);
      await touchProject(input.projectId);
      return { success: true };
    }),

  // Admin: assign checklist item to subcontractor
  assignChecklistItem: adminProcedure
    .input(
      z.object({
        projectId: z.number(),
        itemId: z.number(),
        subcontractorId: z.number().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      await assignChecklistItem(input.itemId, input.subcontractorId);
      await touchProject(input.projectId);
      return { success: true };
    }),

  // Admin: reorder checklist items
  reorderChecklistItems: adminProcedure
    .input(
      z.object({
        projectId: z.number(),
        itemIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      return reorderChecklistItems(input.projectId, input.itemIds);
    }),

  // Admin: create note for project
  createNote: adminProcedure
    .input(
      z.object({
        projectId: z.number(),
        content: z.string(),
        isAdminOnly: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createNote(input.projectId, input.content);
    }),

  // Admin: add note (alias for createNote for client compatibility)
  addNote: adminProcedure
    .input(
      z.object({
        projectId: z.number(),
        content: z.string(),
        isAdminOnly: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const noteId = await createNote({
        projectId: input.projectId,
        authorId: ctx.user?.id || '',
        authorName: ctx.user?.name || 'Admin',
        content: input.content,
        isAdminOnly: input.isAdminOnly ?? false,
        createdAt: new Date(),
      });
      return { id: noteId };
    }),

  // Admin: upload file for project
  uploadFile: adminProcedure
    .input(
      z.object({
        projectId: z.number(),
        fileName: z.string(),
        fileBase64: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const fileBuffer = Buffer.from(input.fileBase64, "base64");
        const { url } = await storagePut(
          `projects/${input.projectId}/files/${input.fileName}`,
          fileBuffer
        );
        return { url, fileName: input.fileName };
      } catch (error) {
        throw new Error(`Failed to upload file: ${error}`);
      }
    }),

  // Admin: delete file from project
  deleteFile: adminProcedure
    .input(
      z.object({
        projectId: z.number(),
        fileName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return { success: true };
    }),

  // Admin: update financial data for project (persists to the financials table)
  updateFinancial: adminProcedure
    .input(
      z.object({
        projectId: z.number(),
        contractValue: z.number().optional(),
        amountBilled: z.number().optional(),
        amountReceived: z.number().optional(),
        subcontractorPayout: z.number().optional(),
        billingStatus: z.enum(["Not Started", "Partial", "Fully Billed", "Paid"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await upsertFinancial({
        projectId: input.projectId,
        contractValue: input.contractValue != null ? String(input.contractValue) : null,
        amountBilled: input.amountBilled != null ? String(input.amountBilled) : null,
        amountReceived: input.amountReceived != null ? String(input.amountReceived) : null,
        subcontractorPayout: input.subcontractorPayout != null ? String(input.subcontractorPayout) : null,
        billingStatus: input.billingStatus,
        notes: input.notes,
      });
      await touchProject(input.projectId);
      return { success: true };
    }),

  // Admin: get notes for project
  getNotes: adminProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return getNotesForProject(input.projectId);
    }),

  // Admin: delete note
  deleteNote: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteNote(input.id);
    }),

  // Admin: export schedule as PDF
  exportSchedulePDF: adminProcedure
    .input(
      z.object({
        weekStart: z.number(),
        weekEnd: z.number(),
        timezoneOffset: z.number().optional(),
        statuses: z.array(z.string()).optional(),
        subcontractorIds: z.array(z.number()).optional(),
        selectedDate: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const weekStartDate = new Date(input.weekStart);
      const weekEndDate = new Date(input.weekEnd);
      const selectedDateObj = input.selectedDate ? new Date(input.selectedDate) : null;
      
      console.log('[PDF Export] Input params:', {
        weekStart: weekStartDate.toISOString(),
        weekEnd: weekEndDate.toISOString(),
        selectedDate: selectedDateObj?.toISOString(),
        statuses: input.statuses,
        subcontractorIds: input.subcontractorIds,
      });
      
      // Fetch all active projects
      let allProjects = await getAllProjects({
        isArchived: false,
        includeInspectionPassed: false,
      });
      
      console.log('[PDF Export] Total projects fetched:', allProjects.length);

      // Helper functions (same as frontend DailySchedule.tsx)
      function toDate(d: Date | string | null): Date | null {
        if (!d) return null;
        const date = typeof d === 'string' ? new Date(d) : d;
        return isNaN(date.getTime()) ? null : date;
      }

      function isSameDay(a: Date, b: Date): boolean {
        return (
          a.getFullYear() === b.getFullYear() &&
          a.getMonth() === b.getMonth() &&
          a.getDate() === b.getDate()
        );
      }

      function isWithinRange(day: Date, start: Date | null, end: Date | null): boolean {
        if (!start) return false;
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const rangeEnd = end
          ? new Date(end.getFullYear(), end.getMonth(), end.getDate())
          : rangeStart;
        return dayStart >= rangeStart && dayStart <= rangeEnd;
      }

      // Generate 7 days starting from weekStart
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStartDate);
        d.setDate(weekStartDate.getDate() + i);
        days.push(d);
      }

      // Helper function to get projects for a specific day (same logic as frontend)
      function getProjectsForDay(day: Date): typeof allProjects {
        return allProjects.filter((p) => {
          // Auto-remove projects with 'Inspection Passed' status
          if (p.status === 'Inspection Passed') return false;
          
          const start = toDate(p.startDate);
          const end = toDate(p.estimatedEndDate);
          
          // Project must have a start date
          if (!start) return false;
          
          // Determine if project should appear on this day
          let shouldAppear = false;
          
          if (end) {
            // If both start and end dates exist, show on all days in range
            shouldAppear = isWithinRange(day, start, end);
          } else {
            // If only start date exists, behavior depends on project status
            // Shop Drawings and Review statuses: show ONLY on start date
            // Other statuses: show from start date onwards
            if (p.status === 'Shop Drawings' || p.status === 'Review') {
              shouldAppear = isSameDay(day, start);
            } else {
              // For other statuses (Fabrication, On-Site, etc.), show from start date onwards
              const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
              const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
              shouldAppear = dayStart >= rangeStart;
            }
          }
          
          if (!shouldAppear) return false;
          
          // Apply status filter (multi-select: show if status is in selectedStatuses or if no statuses selected)
          if (input.statuses && input.statuses.length > 0 && !input.statuses.includes(p.status)) return false;
          
          // Apply subcontractor filter
          if (input.subcontractorIds && input.subcontractorIds.length > 0) {
            // This would require fetching assignments, handled separately below
            return true; // Will be filtered in the next step
          }
          
          return true;
        });
      }

      // Build schedule data for each day
      const scheduleDataArray: ScheduleData[] = [];
      const uniqueProjectIds = new Set<number>(); // Track unique project IDs
      let totalProjectsInPDF = 0;
      
      for (const day of days) {
        // Apply selectedDate filter if provided
        if (selectedDateObj && !isSameDay(day, selectedDateObj)) {
          continue; // Skip this day if a specific date is selected and doesn't match
        }
        
        let dayProjects = getProjectsForDay(day);
        
        // Apply subcontractor filter if provided
        if (input.subcontractorIds && input.subcontractorIds.length > 0) {
          const projectsWithSubs = await Promise.all(
            dayProjects.map(async (p) => {
              const assignments = await getAssignmentsForProject(p.id);
              const hasSubcontractor = assignments.some(a => input.subcontractorIds!.includes(a.subcontractorId));
              return hasSubcontractor ? p : null;
            })
          );
          dayProjects = projectsWithSubs.filter((p) => p !== null) as typeof dayProjects;
        }
        
        // Determine if we should show this day
        // Show empty days only if NO filters are applied
        const hasFilters = (input.statuses && input.statuses.length > 0) || 
                          (input.subcontractorIds && input.subcontractorIds.length > 0) ||
                          selectedDateObj !== null;
        
        if (dayProjects.length > 0 || !hasFilters) {
          const dayName = day.toLocaleDateString('en-US', { weekday: 'long' });
          totalProjectsInPDF += dayProjects.length;
          
          // Track unique project IDs
          dayProjects.forEach(p => uniqueProjectIds.add(p.id));
          
          console.log(`[PDF Export] Day ${dayName} (${day.toISOString().split('T')[0]}): ${dayProjects.length} projects`);
          
          scheduleDataArray.push({
            date: day,
            dayName,
            projects: dayProjects.map((p) => ({
              id: p.id.toString(),
              name: p.name,
              status: p.status,
              address: p.address,
              isUrgent: (p as any).isUrgent || false,
              startTime: p.startTime,
              estimatedEndTime: p.estimatedEndTime,
              subcontractors: [],
            })),
          });
        }
      }

      console.log('[PDF Export] Total projects in PDF (cumulative):', totalProjectsInPDF);
      console.log('[PDF Export] Unique projects in PDF:', uniqueProjectIds.size);
      console.log('[PDF Export] Schedule data array length:', scheduleDataArray.length);
      
      const pdfBuffer = await generateSchedulePDF({
        scheduleData: scheduleDataArray,
        weekStart: weekStartDate,
        weekEnd: weekEndDate,
        generatedAt: new Date(),
        uniqueProjectCount: uniqueProjectIds.size,
      });
      const timestamp = new Date().getTime();
      const fileName = `Weekly_Schedule_${new Date().toISOString().split("T")[0]}_${timestamp}.pdf`;

      // Upload to S3
      const { url } = await storagePut(
        `reports/${fileName}`,
        pdfBuffer,
        "application/pdf"
      );

      return {
        fileName,
        url,
      };
    }),

  // Admin: export projects list as PDF
  exportProjectsListPDF: adminProcedure
    .input(
      z.object({
        projectIds: z.array(z.number()).optional(),
        status: projectStatusEnum.optional(),
        options: z
          .object({
            includeAssignments: z.boolean().optional(),
            includeChecklists: z.boolean().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      let projects = await getAllProjects({
        status: input?.status,
        isArchived: false,
        includeInspectionPassed: false,
      });

      if (!projects) projects = [];
      
      if (input?.projectIds && Array.isArray(input.projectIds) && input.projectIds.length > 0) {
        projects = projects.filter((p) => input.projectIds!.includes(p.id));
      }

      const projectsData: ProjectsListData[] = [];

      for (const project of projects) {
        const assignments = await getAssignmentsWithSubcontractorDetails(
          project.id
        );
        const checklists = input?.options?.includeChecklists
          ? await getChecklistItemsForProject(project.id)
          : [];

        projectsData.push({
          id: project.id,
          name: project.name,
          status: project.status,
          address: project.address,
          borough: project.borough,
          gcCompany: project.gcCompany,
          gcContactName: project.gcContactName,
          gcContactPhone: project.gcContactPhone,
          gcContactEmail: project.gcContactEmail,
          siteSuperName: project.siteSuperName,
          siteSuperPhone: project.siteSuperPhone,
          startDate: project.startDate,
          estimatedEndDate: project.estimatedEndDate,
          assignments: input?.options?.includeAssignments
            ? assignments.map((a) => ({
                subcontractorName: a.subcontractor.name,
                subcontractorPhone: a.subcontractor.phone,
                subcontractorEmail: a.subcontractor.email,
              }))
            : [],
          checklists: checklists.map((c) => ({
            title: c.title,
            isCompleted: c.isCompleted,
          })),
        });
      }

      const pdfBuffer = await generateProjectsListPDF({
        projects: projectsData,
        generatedAt: new Date(),
        filterSummary: `Status: ${input?.status || 'All'}`,
        exportNote: 'Exported from Bolted Iron Hub',
        ...input?.options,
      } as ProjectsListPDFOptions);
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate PDF',
        });
      }

      const fileName = `Projects_List_${new Date().toISOString().split("T")[0]}.pdf`;

      // Upload to S3
      const { url } = await storagePut(
        `reports/${fileName}`,
        pdfBuffer,
        "application/pdf"
      );

      return {
        fileName,
        url,
      };
    }),

  // Admin: upload proposal PDF and extract checklist
  uploadProposalAndExtract: adminProcedure
    .input(
      z.object({
        projectId: z.number(),
        fileName: z.string(),
        fileBase64: z.string(), // Base64 encoded PDF
        mode: z.enum(["replace", "append"]).optional().default("replace"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Convert base64 to buffer
        const pdfBuffer = Buffer.from(input.fileBase64, "base64");
        
        // Extract checklist items from PDF
        const extractionResult = await extractChecklistFromPDF(pdfBuffer);
        
        if (!extractionResult.success) {
          throw new Error(extractionResult.error || "Failed to extract items from PDF");
        }

        const isAppend = input.mode === "append";

        if (!isAppend) {
          // Replace mode: new PDF replaces all existing extracted checklist items.
          await deleteAllChecklistItemsForProject(input.projectId, "extracted");
        }

        const existingItems = isAppend
          ? (await getChecklistItemsForProject(input.projectId)).filter((item) => item.source === "extracted")
          : [];
        const startOrder =
          existingItems.length > 0
            ? Math.max(...existingItems.map((item) => item.order)) + 1
            : 0;

        const { url } = await storagePut(
          `projects/${input.projectId}/proposals/${Date.now()}-${input.fileName}`,
          pdfBuffer,
          "application/pdf"
        );

        const proposalId = await createProposal({
          projectId: input.projectId,
          fileName: input.fileName,
          fileUrl: url,
          extractedItemsCount: extractionResult.items.length,
        });
        
        // Save checklist items to database
        const savedItems = [];
        for (let index = 0; index < extractionResult.items.length; index++) {
          const item = extractionResult.items[index];
          const id = await createChecklistItem({
            projectId: input.projectId,
            text: item.text,
            isCompleted: false,
            order: startOrder + index,
            source: "extracted",
            isActive: false,
            isUserAdded: false,
          });
          savedItems.push(id);
        }

        await touchProject(input.projectId);

        return {
          success: true,
          proposalId,
          fileName: input.fileName,
          fileUrl: url,
          extractedItemsCount: extractionResult.items.length,
          itemsExtracted: extractionResult.items.length,
          mode: input.mode,
          totalExtractedItems: isAppend
            ? existingItems.length + extractionResult.items.length
            : extractionResult.items.length,
        };
      } catch (error) {
        console.error("[uploadProposalAndExtract] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to extract checklist from PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),
});
