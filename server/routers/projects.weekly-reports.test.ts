import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createProject,
  createChecklistItem,
  getAllWeeklyReports,
  createWeeklyReport,
  deleteWeeklyReport,
  getWeeklyReportById,
} from "../db";

describe("Weekly Reports Feature", () => {
  let testReportId: number;
  let testProjectId: number;

  beforeAll(async () => {
    // Create a test project
    testProjectId = await createProject({
      name: "Test Project for Weekly Report",
      address: "123 Test St",
      status: "Fabrication",
      isArchived: false,
    });

    // Add checklist items
    await createChecklistItem({
      projectId: testProjectId,
      text: "Item 1",
      isCompleted: true,
      order: 1,
    });

    await createChecklistItem({
      projectId: testProjectId,
      text: "Item 2",
      isCompleted: false,
      order: 2,
    });

    // Create a test weekly report
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    testReportId = await createWeeklyReport({
      fileName: "Weekly_Report_2026-06-13.pdf",
      fileUrl: "https://example.com/reports/Weekly_Report_2026-06-13.pdf",
      generatedBy: 1,
      reportDate: now,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      totalProjects: 1,
      totalCompleted: 1,
      totalItems: 2,
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testReportId) {
      await deleteWeeklyReport(testReportId);
    }
  });

  it("should create a weekly report", async () => {
    expect(testReportId).toBeGreaterThan(0);
  });

  it("should fetch all weekly reports", async () => {
    const reports = await getAllWeeklyReports();
    expect(reports.length).toBeGreaterThan(0);
    expect(reports.some((r) => r.id === testReportId)).toBe(true);
  });

  it("should get a specific weekly report by ID", async () => {
    const report = await getWeeklyReportById(testReportId);
    expect(report).not.toBeNull();
    expect(report?.id).toBe(testReportId);
    expect(report?.fileName).toBe("Weekly_Report_2026-06-13.pdf");
    expect(report?.totalProjects).toBe(1);
    expect(report?.totalItems).toBe(2);
    expect(report?.totalCompleted).toBe(1);
  });

  it("should store correct progress data", async () => {
    const report = await getWeeklyReportById(testReportId);
    expect(report).not.toBeNull();
    if (report) {
      const progressPercentage = (report.totalCompleted / report.totalItems) * 100;
      expect(progressPercentage).toBe(50);
    }
  });

  it("should delete a weekly report", async () => {
    // Create a temporary report to delete
    const tempReportId = await createWeeklyReport({
      fileName: "Temp_Report.pdf",
      fileUrl: "https://example.com/reports/temp.pdf",
      generatedBy: 1,
      reportDate: new Date(),
      totalProjects: 0,
      totalCompleted: 0,
      totalItems: 0,
    });

    // Verify it exists
    let report = await getWeeklyReportById(tempReportId);
    expect(report).not.toBeNull();

    // Delete it
    await deleteWeeklyReport(tempReportId);

    // Verify it's deleted
    report = await getWeeklyReportById(tempReportId);
    expect(report).toBeNull();
  });

  it("should store week date range", async () => {
    const report = await getWeeklyReportById(testReportId);
    expect(report).not.toBeNull();
    expect(report?.weekStartDate).not.toBeNull();
    expect(report?.weekEndDate).not.toBeNull();
  });

  it("should handle reports with zero items", async () => {
    const reportId = await createWeeklyReport({
      fileName: "Empty_Report.pdf",
      fileUrl: "https://example.com/reports/empty.pdf",
      generatedBy: 1,
      reportDate: new Date(),
      totalProjects: 0,
      totalCompleted: 0,
      totalItems: 0,
    });

    const report = await getWeeklyReportById(reportId);
    expect(report).not.toBeNull();
    expect(report?.totalItems).toBe(0);
    expect(report?.totalCompleted).toBe(0);

    // Cleanup
    await deleteWeeklyReport(reportId);
  });

  it("should store file URL correctly", async () => {
    const report = await getWeeklyReportById(testReportId);
    expect(report).not.toBeNull();
    expect(report?.fileUrl).toContain("https://example.com/reports/");
    expect(report?.fileUrl).toContain(".pdf");
  });
});
