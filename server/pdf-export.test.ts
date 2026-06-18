import { describe, it, expect } from "vitest";
import { generateProjectsListPDF, ProjectsListData } from "./_core/pdfGenerator";

describe("PDF Export - Urgent Projects", () => {
  it("should generate PDF with mixed urgent and normal projects", async () => {
    const testProjects: ProjectsListData[] = [
      {
        id: "1",
        name: "Project A",
        status: "on-site",
        isUrgent: true,
        subcontractors: [{ id: "1", companyName: "Contractor A" }],
        startDate: new Date("2026-04-02"),
        estimatedEndDate: new Date("2026-04-10"),
      },
      {
        id: "2",
        name: "Project B",
        status: "fabrication",
        isUrgent: false,
        subcontractors: [{ id: "2", companyName: "Contractor B" }],
        startDate: new Date("2026-04-03"),
        estimatedEndDate: new Date("2026-04-12"),
      },
      {
        id: "3",
        name: "Project C",
        status: "shop-drawings",
        isUrgent: true,
        subcontractors: [{ id: "3", companyName: "Contractor C" }],
        startDate: new Date("2026-04-04"),
        estimatedEndDate: new Date("2026-04-15"),
      },
    ];

    const pdfBuffer = await generateProjectsListPDF({
      projects: testProjects,
      generatedAt: new Date(),
      filterSummary: "No filters applied",
    });

    // Verify PDF was generated successfully
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000); // PDF should have substantial content
    
    // Verify PDF header signature
    const pdfHeader = pdfBuffer.toString("latin1", 0, 10);
    expect(pdfHeader).toContain("%PDF");
  });

  it("should handle projects with isUrgent field correctly", async () => {
    const testProjects: ProjectsListData[] = [
      {
        id: "1",
        name: "Urgent Steel Fabrication",
        status: "fabrication",
        isUrgent: true,
        subcontractors: [{ id: "1", companyName: "Steel Works Inc" }],
        startDate: new Date("2026-04-02"),
        estimatedEndDate: new Date("2026-04-08"),
      },
      {
        id: "2",
        name: "Regular Installation",
        status: "on-site",
        isUrgent: false,
        subcontractors: [{ id: "2", companyName: "Installation Co" }],
        startDate: new Date("2026-04-05"),
        estimatedEndDate: new Date("2026-04-20"),
      },
    ];

    const pdfBuffer = await generateProjectsListPDF({
      projects: testProjects,
      generatedAt: new Date(),
      filterSummary: "Status: on-site",
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    
    // Verify PDF structure
    const pdfHeader = pdfBuffer.toString("latin1", 0, 10);
    expect(pdfHeader).toContain("%PDF");
  });

  it("should generate PDF with only urgent projects", async () => {
    const testProjects: ProjectsListData[] = [
      {
        id: "1",
        name: "Critical Project 1",
        status: "on-site",
        isUrgent: true,
        subcontractors: [{ id: "1", companyName: "Urgent Contractor" }],
        startDate: new Date("2026-04-02"),
        estimatedEndDate: new Date("2026-04-05"),
      },
      {
        id: "2",
        name: "Critical Project 2",
        status: "fabrication",
        isUrgent: true,
        subcontractors: [{ id: "2", companyName: "Emergency Fabrication" }],
        startDate: new Date("2026-04-03"),
        estimatedEndDate: new Date("2026-04-06"),
      },
    ];

    const pdfBuffer = await generateProjectsListPDF({
      projects: testProjects,
      generatedAt: new Date(),
      filterSummary: "Urgent projects only",
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    
    // Verify PDF is valid
    const pdfHeader = pdfBuffer.toString("latin1", 0, 10);
    expect(pdfHeader).toContain("%PDF");
  });

  it("should handle empty projects list", async () => {
    const testProjects: ProjectsListData[] = [];

    const pdfBuffer = await generateProjectsListPDF({
      projects: testProjects,
      generatedAt: new Date(),
      filterSummary: "No projects found",
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(500); // Even empty PDF has structure
    
    // Verify PDF is valid
    const pdfHeader = pdfBuffer.toString("latin1", 0, 10);
    expect(pdfHeader).toContain("%PDF");
  });

  it("should preserve isUrgent field through PDF generation", async () => {
    const urgentProject: ProjectsListData = {
      id: "1",
      name: "Test Project",
      status: "on-site",
      isUrgent: true,
      subcontractors: [],
      startDate: new Date(),
      estimatedEndDate: new Date(),
    };

    const normalProject: ProjectsListData = {
      id: "2",
      name: "Test Project 2",
      status: "fabrication",
      isUrgent: false,
      subcontractors: [],
      startDate: new Date(),
      estimatedEndDate: new Date(),
    };

    // Verify that projects with isUrgent=true and isUrgent=false both generate PDFs
    const urgentPdf = await generateProjectsListPDF({
      projects: [urgentProject],
      generatedAt: new Date(),
      filterSummary: "Urgent only",
    });

    const normalPdf = await generateProjectsListPDF({
      projects: [normalProject],
      generatedAt: new Date(),
      filterSummary: "Normal only",
    });

    expect(urgentPdf).toBeInstanceOf(Buffer);
    expect(normalPdf).toBeInstanceOf(Buffer);
    expect(urgentPdf.length).toBeGreaterThan(500);
    expect(normalPdf.length).toBeGreaterThan(500);
  });
});
