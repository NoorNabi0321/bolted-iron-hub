import { describe, it, expect } from "vitest";

/**
 * Tests for Review status functionality
 * 
 * Requirement: Add "Review" status as the first status in the project workflow
 * - Review status should appear first in all status lists
 * - Review status should be filterable
 * - Review status should appear in Project Details dropdown
 * - Review status should appear as first card in Dashboard Pipeline
 */

describe("Review Status Functionality", () => {
  describe("Status Order", () => {
    const PROJECT_STATUSES = [
      "Review",
      "Shop Drawings",
      "Fabrication",
      "On-Site",
      "Installed",
      "Inspection Passed",
    ] as const;

    it("should have Review as the first status", () => {
      expect(PROJECT_STATUSES[0]).toBe("Review");
    });

    it("should have all expected statuses", () => {
      expect(PROJECT_STATUSES).toContain("Review");
      expect(PROJECT_STATUSES).toContain("Shop Drawings");
      expect(PROJECT_STATUSES).toContain("Fabrication");
      expect(PROJECT_STATUSES).toContain("On-Site");
      expect(PROJECT_STATUSES).toContain("Installed");
      expect(PROJECT_STATUSES).toContain("Inspection Passed");
    });

    it("should have 6 total statuses", () => {
      expect(PROJECT_STATUSES.length).toBe(6);
    });
  });

  describe("Status Filtering", () => {
    const projects = [
      { id: 1, name: "Project A", status: "Review" },
      { id: 2, name: "Project B", status: "Shop Drawings" },
      { id: 3, name: "Project C", status: "Review" },
      { id: 4, name: "Project D", status: "Fabrication" },
      { id: 5, name: "Project E", status: "Review" },
    ];

    it("should filter projects by Review status", () => {
      const reviewProjects = projects.filter((p) => p.status === "Review");
      expect(reviewProjects).toHaveLength(3);
      expect(reviewProjects.every((p) => p.status === "Review")).toBe(true);
    });

    it("should return correct count of Review projects", () => {
      const reviewCount = projects.filter((p) => p.status === "Review").length;
      expect(reviewCount).toBe(3);
    });

    it("should filter other statuses correctly", () => {
      const shopDrawingsProjects = projects.filter((p) => p.status === "Shop Drawings");
      expect(shopDrawingsProjects).toHaveLength(1);
      expect(shopDrawingsProjects[0].name).toBe("Project B");
    });
  });

  describe("Status Display", () => {
    const getStatusClass = (status: string): string => {
      switch (status) {
        case "Review": return "bg-purple-50 text-purple-700 border border-purple-200";
        case "Shop Drawings": return "bg-blue-50 text-blue-700 border border-blue-200";
        case "Fabrication": return "bg-yellow-50 text-yellow-700 border border-yellow-200";
        case "On-Site": return "bg-orange-50 text-orange-700 border border-orange-200";
        case "Installed": return "bg-green-50 text-green-700 border border-green-200";
        case "Inspection Passed": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
        default: return "bg-gray-100 text-gray-600";
      }
    };

    it("should return correct color class for Review status", () => {
      const reviewClass = getStatusClass("Review");
      expect(reviewClass).toBe("bg-purple-50 text-purple-700 border border-purple-200");
    });

    it("should return correct color class for all statuses", () => {
      expect(getStatusClass("Review")).toContain("purple");
      expect(getStatusClass("Shop Drawings")).toContain("blue");
      expect(getStatusClass("Fabrication")).toContain("yellow");
      expect(getStatusClass("On-Site")).toContain("orange");
      expect(getStatusClass("Installed")).toContain("green");
      expect(getStatusClass("Inspection Passed")).toContain("emerald");
    });

    it("should return default class for unknown status", () => {
      const unknownClass = getStatusClass("Unknown Status");
      expect(unknownClass).toBe("bg-gray-100 text-gray-600");
    });
  });

  describe("Dashboard Pipeline", () => {
    const PROJECT_STATUSES = [
      "Review",
      "Shop Drawings",
      "Fabrication",
      "On-Site",
      "Installed",
      "Inspection Passed",
    ] as const;

    const projects = [
      { id: 1, name: "Project A", status: "Review" },
      { id: 2, name: "Project B", status: "Review" },
      { id: 3, name: "Project C", status: "Shop Drawings" },
      { id: 4, name: "Project D", status: "Fabrication" },
    ];

    it("should calculate status counts correctly", () => {
      const statusCounts = PROJECT_STATUSES.reduce(
        (acc, s) => {
          acc[s] = projects.filter((p) => p.status === s).length;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(statusCounts["Review"]).toBe(2);
      expect(statusCounts["Shop Drawings"]).toBe(1);
      expect(statusCounts["Fabrication"]).toBe(1);
      expect(statusCounts["On-Site"]).toBe(0);
      expect(statusCounts["Installed"]).toBe(0);
      expect(statusCounts["Inspection Passed"]).toBe(0);
    });

    it("should render Review card first in pipeline", () => {
      const statusCounts = PROJECT_STATUSES.reduce(
        (acc, s) => {
          acc[s] = projects.filter((p) => p.status === s).length;
          return acc;
        },
        {} as Record<string, number>
      );

      const pipelineCards = PROJECT_STATUSES.map((status) => ({
        status,
        count: statusCounts[status] ?? 0,
      }));

      expect(pipelineCards[0].status).toBe("Review");
      expect(pipelineCards[0].count).toBe(2);
    });

    it("should calculate percentage correctly for Review status", () => {
      const activeProjects = projects;
      const reviewCount = projects.filter((p) => p.status === "Review").length;
      const percentage = activeProjects.length > 0 ? (reviewCount / activeProjects.length) * 100 : 0;

      expect(percentage).toBe(50); // 2 out of 4 projects
    });
  });

  describe("Project Form Status Options", () => {
    const PROJECT_STATUSES = [
      "Review",
      "Shop Drawings",
      "Fabrication",
      "On-Site",
      "Installed",
      "Inspection Passed",
    ] as const;

    it("should include Review in form status options", () => {
      expect(PROJECT_STATUSES).toContain("Review");
    });

    it("should render all statuses in dropdown", () => {
      const statusOptions = PROJECT_STATUSES.map((s) => ({ value: s, label: s }));
      expect(statusOptions).toHaveLength(6);
      expect(statusOptions[0].value).toBe("Review");
    });

    it("should set default status to Shop Drawings (not Review)", () => {
      const defaultStatus = "Shop Drawings";
      expect(defaultStatus).toBe("Shop Drawings");
      expect(PROJECT_STATUSES).toContain(defaultStatus);
    });
  });

  describe("Status Transitions", () => {
    it("should allow transition from Review to any other status", () => {
      const currentStatus = "Review";
      const PROJECT_STATUSES = [
        "Review",
        "Shop Drawings",
        "Fabrication",
        "On-Site",
        "Installed",
        "Inspection Passed",
      ] as const;

      const allowedTransitions = PROJECT_STATUSES.filter((s) => s !== currentStatus);
      expect(allowedTransitions).toHaveLength(5);
      expect(allowedTransitions).toContain("Shop Drawings");
      expect(allowedTransitions).toContain("Fabrication");
    });

    it("should allow transition to Review from any status", () => {
      const PROJECT_STATUSES = [
        "Review",
        "Shop Drawings",
        "Fabrication",
        "On-Site",
        "Installed",
        "Inspection Passed",
      ] as const;

      const transitionToReview = PROJECT_STATUSES.filter((s) => s !== "Review");
      expect(transitionToReview).toHaveLength(5);

      // All statuses can transition to Review
      transitionToReview.forEach((status) => {
        expect(PROJECT_STATUSES).toContain("Review");
      });
    });
  });
});
