import { describe, it, expect } from "vitest";

/**
 * Tests for status-based filtering logic
 * 
 * Requirement: Projects with only start date behavior depends on status:
 * - "Shop Drawings" and "Review" statuses: appear ONLY on start date
 * - Other statuses (Fabrication, On-Site, etc.): appear from start date onwards
 */

describe("Status-Based Filtering Logic", () => {
  const isSameDate = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const createDateAtMidnight = (year: number, month: number, day: number): Date => {
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  interface MockProject {
    id: number;
    name: string;
    status: string;
    startDate: Date;
    estimatedEndDate: Date | null;
  }

  describe("Shop Drawings Status - Single Date Projects", () => {
    it("should appear only on start date for Shop Drawings status", () => {
      const project: MockProject = {
        id: 1,
        name: "Shop Drawings Project",
        status: "Shop Drawings",
        startDate: createDateAtMidnight(2026, 4, 29),
        estimatedEndDate: null,
      };

      const exportDate = createDateAtMidnight(2026, 4, 29);
      
      // For Shop Drawings with no end date, should appear only on start date
      const shouldAppear = project.status === "Shop Drawings" || project.status === "Review"
        ? isSameDate(project.startDate, exportDate)
        : project.startDate <= exportDate;
      
      expect(shouldAppear).toBe(true);
    });

    it("should NOT appear on subsequent dates for Shop Drawings status", () => {
      const project: MockProject = {
        id: 1,
        name: "Shop Drawings Project",
        status: "Shop Drawings",
        startDate: createDateAtMidnight(2026, 4, 29),
        estimatedEndDate: null,
      };

      const exportDate = createDateAtMidnight(2026, 4, 30);
      
      const shouldAppear = project.status === "Shop Drawings" || project.status === "Review"
        ? isSameDate(project.startDate, exportDate)
        : project.startDate <= exportDate;
      
      expect(shouldAppear).toBe(false);
    });
  });

  describe("Review Status - Single Date Projects", () => {
    it("should appear only on start date for Review status", () => {
      const project: MockProject = {
        id: 2,
        name: "Review Project",
        status: "Review",
        startDate: createDateAtMidnight(2026, 4, 29),
        estimatedEndDate: null,
      };

      const exportDate = createDateAtMidnight(2026, 4, 29);
      
      const shouldAppear = project.status === "Shop Drawings" || project.status === "Review"
        ? isSameDate(project.startDate, exportDate)
        : project.startDate <= exportDate;
      
      expect(shouldAppear).toBe(true);
    });

    it("should NOT appear on subsequent dates for Review status", () => {
      const project: MockProject = {
        id: 2,
        name: "Review Project",
        status: "Review",
        startDate: createDateAtMidnight(2026, 4, 29),
        estimatedEndDate: null,
      };

      const exportDate = createDateAtMidnight(2026, 5, 1);
      
      const shouldAppear = project.status === "Shop Drawings" || project.status === "Review"
        ? isSameDate(project.startDate, exportDate)
        : project.startDate <= exportDate;
      
      expect(shouldAppear).toBe(false);
    });
  });

  describe("Fabrication Status - Single Date Projects", () => {
    it("should appear on start date for Fabrication status", () => {
      const project: MockProject = {
        id: 3,
        name: "Fabrication Project",
        status: "Fabrication",
        startDate: createDateAtMidnight(2026, 4, 29),
        estimatedEndDate: null,
      };

      const exportDate = createDateAtMidnight(2026, 4, 29);
      
      const shouldAppear = project.status === "Shop Drawings" || project.status === "Review"
        ? isSameDate(project.startDate, exportDate)
        : project.startDate <= exportDate;
      
      expect(shouldAppear).toBe(true);
    });

    it("should appear on subsequent dates for Fabrication status", () => {
      const project: MockProject = {
        id: 3,
        name: "Fabrication Project",
        status: "Fabrication",
        startDate: createDateAtMidnight(2026, 4, 29),
        estimatedEndDate: null,
      };

      const exportDate = createDateAtMidnight(2026, 4, 30);
      
      const shouldAppear = project.status === "Shop Drawings" || project.status === "Review"
        ? isSameDate(project.startDate, exportDate)
        : project.startDate <= exportDate;
      
      expect(shouldAppear).toBe(true);
    });

    it("should appear on future dates for Fabrication status", () => {
      const project: MockProject = {
        id: 3,
        name: "Fabrication Project",
        status: "Fabrication",
        startDate: createDateAtMidnight(2026, 4, 29),
        estimatedEndDate: null,
      };

      const exportDate = createDateAtMidnight(2026, 5, 10);
      
      const shouldAppear = project.status === "Shop Drawings" || project.status === "Review"
        ? isSameDate(project.startDate, exportDate)
        : project.startDate <= exportDate;
      
      expect(shouldAppear).toBe(true);
    });
  });

  describe("On-Site Status - Single Date Projects", () => {
    it("should appear on start date for On-Site status", () => {
      const project: MockProject = {
        id: 4,
        name: "On-Site Project",
        status: "On-Site",
        startDate: createDateAtMidnight(2026, 4, 29),
        estimatedEndDate: null,
      };

      const exportDate = createDateAtMidnight(2026, 4, 29);
      
      const shouldAppear = project.status === "Shop Drawings" || project.status === "Review"
        ? isSameDate(project.startDate, exportDate)
        : project.startDate <= exportDate;
      
      expect(shouldAppear).toBe(true);
    });

    it("should appear on subsequent dates for On-Site status", () => {
      const project: MockProject = {
        id: 4,
        name: "On-Site Project",
        status: "On-Site",
        startDate: createDateAtMidnight(2026, 4, 29),
        estimatedEndDate: null,
      };

      const exportDate = createDateAtMidnight(2026, 5, 5);
      
      const shouldAppear = project.status === "Shop Drawings" || project.status === "Review"
        ? isSameDate(project.startDate, exportDate)
        : project.startDate <= exportDate;
      
      expect(shouldAppear).toBe(true);
    });
  });

  describe("Mixed Status Scenarios", () => {
    it("should correctly filter multiple projects with different statuses", () => {
      const projects: MockProject[] = [
        {
          id: 1,
          name: "Shop Drawings",
          status: "Shop Drawings",
          startDate: createDateAtMidnight(2026, 4, 29),
          estimatedEndDate: null,
        },
        {
          id: 2,
          name: "Fabrication",
          status: "Fabrication",
          startDate: createDateAtMidnight(2026, 4, 29),
          estimatedEndDate: null,
        },
        {
          id: 3,
          name: "On-Site",
          status: "On-Site",
          startDate: createDateAtMidnight(2026, 4, 29),
          estimatedEndDate: null,
        },
      ];

      const exportDate = createDateAtMidnight(2026, 4, 30);

      const visibleProjects = projects.filter(p => {
        return p.status === "Shop Drawings" || p.status === "Review"
          ? isSameDate(p.startDate, exportDate)
          : p.startDate <= exportDate;
      });

      // Only Fabrication and On-Site should be visible on April 30
      expect(visibleProjects.length).toBe(2);
      expect(visibleProjects.map(p => p.name)).toContain("Fabrication");
      expect(visibleProjects.map(p => p.name)).toContain("On-Site");
      expect(visibleProjects.map(p => p.name)).not.toContain("Shop Drawings");
    });

    it("should show all projects on their start date", () => {
      const projects: MockProject[] = [
        {
          id: 1,
          name: "Shop Drawings",
          status: "Shop Drawings",
          startDate: createDateAtMidnight(2026, 4, 29),
          estimatedEndDate: null,
        },
        {
          id: 2,
          name: "Review",
          status: "Review",
          startDate: createDateAtMidnight(2026, 4, 29),
          estimatedEndDate: null,
        },
        {
          id: 3,
          name: "Fabrication",
          status: "Fabrication",
          startDate: createDateAtMidnight(2026, 4, 29),
          estimatedEndDate: null,
        },
      ];

      const exportDate = createDateAtMidnight(2026, 4, 29);

      const visibleProjects = projects.filter(p => {
        return p.status === "Shop Drawings" || p.status === "Review"
          ? isSameDate(p.startDate, exportDate)
          : p.startDate <= exportDate;
      });

      // All projects should be visible on their start date
      expect(visibleProjects.length).toBe(3);
    });
  });

  describe("Projects with End Dates", () => {
    it("should span multiple dates regardless of status when end date exists", () => {
      const projects: MockProject[] = [
        {
          id: 1,
          name: "Shop Drawings with End Date",
          status: "Shop Drawings",
          startDate: createDateAtMidnight(2026, 4, 29),
          estimatedEndDate: createDateAtMidnight(2026, 5, 1),
        },
        {
          id: 2,
          name: "Fabrication with End Date",
          status: "Fabrication",
          startDate: createDateAtMidnight(2026, 4, 29),
          estimatedEndDate: createDateAtMidnight(2026, 5, 1),
        },
      ];

      const exportDate = createDateAtMidnight(2026, 4, 30);

      // Both should appear on April 30 because they have end dates
      const visibleProjects = projects.filter(p => {
        if (p.estimatedEndDate) {
          return p.startDate <= exportDate && p.estimatedEndDate >= exportDate;
        }
        return p.status === "Shop Drawings" || p.status === "Review"
          ? isSameDate(p.startDate, exportDate)
          : p.startDate <= exportDate;
      });

      expect(visibleProjects.length).toBe(2);
    });
  });

  describe("Week Export Scenarios", () => {
    it("should correctly filter projects for a full week export", () => {
      const projects: MockProject[] = [
        {
          id: 1,
          name: "Shop Drawings - April 29",
          status: "Shop Drawings",
          startDate: createDateAtMidnight(2026, 4, 29),
          estimatedEndDate: null,
        },
        {
          id: 2,
          name: "Fabrication - April 29",
          status: "Fabrication",
          startDate: createDateAtMidnight(2026, 4, 29),
          estimatedEndDate: null,
        },
        {
          id: 3,
          name: "Review - May 1",
          status: "Review",
          startDate: createDateAtMidnight(2026, 5, 1),
          estimatedEndDate: null,
        },
      ];

      const weekStart = createDateAtMidnight(2026, 4, 28);
      const weekEnd = createDateAtMidnight(2026, 5, 4);

      // Simulate week export filtering
      const weekProjects = projects.filter(p => {
        if (!p.estimatedEndDate) {
          if (p.status === "Shop Drawings" || p.status === "Review") {
            // Only include if start date is within the week
            return p.startDate >= weekStart && p.startDate <= weekEnd;
          } else {
            // Include if start date is on or before week end
            return p.startDate <= weekEnd;
          }
        }
        return true; // Projects with end dates handled separately
      });

      expect(weekProjects.length).toBe(3);

      // Now simulate date mapping for April 30
      const april30Projects = weekProjects.filter(p => {
        const exportDate = createDateAtMidnight(2026, 4, 30);
        if (p.estimatedEndDate) {
          return p.startDate <= exportDate && p.estimatedEndDate >= exportDate;
        }
        return p.status === "Shop Drawings" || p.status === "Review"
          ? isSameDate(p.startDate, exportDate)
          : p.startDate <= exportDate;
      });

      // Only Fabrication should appear on April 30
      expect(april30Projects.length).toBe(1);
      expect(april30Projects[0].name).toBe("Fabrication - April 29");
    });
  });
});
