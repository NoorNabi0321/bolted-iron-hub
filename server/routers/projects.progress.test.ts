import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../db";
import {
  createProject,
  createChecklistItem,
  updateChecklistItem,
  getAllProjects,
  getChecklistItemsForProject,
} from "../db";
import { InsertProject } from "../../drizzle/schema";

describe("Projects Progress Procedures", () => {
  let testProjectId1: number;
  let testProjectId2: number;
  let testProjectId3: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test projects
    testProjectId1 = await createProject({
      name: "Test Project 1 - With Checklist",
      address: "123 Main St",
      status: "Fabrication",
      isArchived: false,
    });

    testProjectId2 = await createProject({
      name: "Test Project 2 - Without Checklist",
      address: "456 Oak Ave",
      status: "On-Site",
      isArchived: false,
    });

    testProjectId3 = await createProject({
      name: "Test Project 3 - Inspection Passed",
      address: "789 Pine Rd",
      status: "Inspection Passed",
      isArchived: false,
    });

    // Add checklist items to project 1
    await createChecklistItem({
      projectId: testProjectId1,
      text: "Item 1",
      isCompleted: true,
      order: 1,
    });

    await createChecklistItem({
      projectId: testProjectId1,
      text: "Item 2",
      isCompleted: false,
      order: 2,
    });

    await createChecklistItem({
      projectId: testProjectId1,
      text: "Item 3",
      isCompleted: true,
      order: 3,
    });

    // Project 2 has no checklist items
    // Project 3 has no checklist items (and should be excluded)
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Cleanup is handled by the database
  });

  it("should fetch all active projects excluding Inspection Passed", async () => {
    const projects = await getAllProjects({
      isArchived: false,
      includeInspectionPassed: false,
    });

    const testProjects = projects.filter(
      (p) =>
        p.id === testProjectId1 ||
        p.id === testProjectId2 ||
        p.id === testProjectId3
    );

    // Should only include projects 1 and 2, not 3 (Inspection Passed)
    expect(testProjects.length).toBe(2);
    expect(testProjects.some((p) => p.id === testProjectId1)).toBe(true);
    expect(testProjects.some((p) => p.id === testProjectId2)).toBe(true);
    expect(testProjects.some((p) => p.id === testProjectId3)).toBe(false);
  });

  it("should calculate progress correctly for projects with checklists", async () => {
    const checklistItems = await getChecklistItemsForProject(testProjectId1);

    const completedCount = checklistItems.filter((item) => item.isCompleted)
      .length;
    const totalCount = checklistItems.length;
    const progressPercentage =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    expect(totalCount).toBe(3);
    expect(completedCount).toBe(2);
    expect(progressPercentage).toBe(67); // 2/3 = 66.67%, rounded to 67
  });

  it("should identify projects with checklists", async () => {
    const checklistItems1 = await getChecklistItemsForProject(testProjectId1);
    const checklistItems2 = await getChecklistItemsForProject(testProjectId2);

    expect(checklistItems1.length).toBeGreaterThan(0);
    expect(checklistItems2.length).toBe(0);
  });

  it("should filter projects correctly for progress tabs", async () => {
    const projects = await getAllProjects({
      isArchived: false,
      includeInspectionPassed: false,
    });

    const projectsWithProgress = await Promise.all(
      projects.map(async (project) => {
        const checklistItems = await getChecklistItemsForProject(project.id);
        const completedCount = checklistItems.filter(
          (item) => item.isCompleted
        ).length;
        const totalCount = checklistItems.length;
        const progressPercentage =
          totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        return {
          id: project.id,
          name: project.name,
          status: project.status,
          completedCount,
          totalCount,
          progressPercentage,
        };
      })
    );

    const testProjects = projectsWithProgress.filter(
      (p) => p.id === testProjectId1 || p.id === testProjectId2
    );

    // Filter to only projects with checklist items
    const withChecklists = testProjects.filter((p) => p.totalCount > 0);
    expect(withChecklists.length).toBe(1);
    expect(withChecklists[0].id).toBe(testProjectId1);
    expect(withChecklists[0].progressPercentage).toBe(67);

    // Filter to only projects without checklist items
    const withoutChecklists = testProjects.filter((p) => p.totalCount === 0);
    expect(withoutChecklists.length).toBe(1);
    expect(withoutChecklists[0].id).toBe(testProjectId2);
  });

  it("should handle 0% progress when no items are completed", async () => {
    const newProjectId = await createProject({
      name: "Test Project - No Progress",
      address: "999 Test St",
      status: "Fabrication",
      isArchived: false,
    });

    // Add incomplete checklist items
    await createChecklistItem({
      projectId: newProjectId,
      text: "Incomplete Item 1",
      isCompleted: false,
      order: 1,
    });

    await createChecklistItem({
      projectId: newProjectId,
      text: "Incomplete Item 2",
      isCompleted: false,
      order: 2,
    });

    const checklistItems = await getChecklistItemsForProject(newProjectId);
    const completedCount = checklistItems.filter((item) => item.isCompleted)
      .length;
    const totalCount = checklistItems.length;
    const progressPercentage =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    expect(totalCount).toBe(2);
    expect(completedCount).toBe(0);
    expect(progressPercentage).toBe(0);
  });

  it("should handle 100% progress when all items are completed", async () => {
    const newProjectId = await createProject({
      name: "Test Project - Full Progress",
      address: "888 Test Ave",
      status: "Installed",
      isArchived: false,
    });

    // Add completed checklist items
    await createChecklistItem({
      projectId: newProjectId,
      text: "Completed Item 1",
      isCompleted: true,
      order: 1,
    });

    await createChecklistItem({
      projectId: newProjectId,
      text: "Completed Item 2",
      isCompleted: true,
      order: 2,
    });

    const checklistItems = await getChecklistItemsForProject(newProjectId);
    const completedCount = checklistItems.filter((item) => item.isCompleted)
      .length;
    const totalCount = checklistItems.length;
    const progressPercentage =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    expect(totalCount).toBe(2);
    expect(completedCount).toBe(2);
    expect(progressPercentage).toBe(100);
  });

  it("should exclude Inspection Passed projects from progress data", async () => {
    const projects = await getAllProjects({
      isArchived: false,
      includeInspectionPassed: false,
    });

    const inspectionPassedProjects = projects.filter(
      (p) => p.status === "Inspection Passed"
    );

    expect(inspectionPassedProjects.length).toBe(0);
  });
});
