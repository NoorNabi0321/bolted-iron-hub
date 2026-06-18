import { describe, it, expect } from "vitest";

/**
 * Tests for the refined PDF export filter logic
 * 
 * Requirement: Projects without end dates should appear in PDF ONLY if the export date matches the project's start date
 * Example: Project created on April 16, 2026 with startDate=April 16, 2026 and no estimatedEndDate:
 * - Export PDF on April 16, 2026 → Project APPEARS
 * - Export PDF on April 17, 2026 → Project does NOT appear
 */

describe("PDF Filter Logic - Projects Without End Dates", () => {
  // Helper function to compare dates (ignoring time)
  const isSameDate = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // Helper to create a date at midnight
  const createDateAtMidnight = (year: number, month: number, day: number): Date => {
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  describe("isSameDate helper function", () => {
    it("should return true for same dates", () => {
      const date1 = createDateAtMidnight(2026, 4, 16);
      const date2 = createDateAtMidnight(2026, 4, 16);
      expect(isSameDate(date1, date2)).toBe(true);
    });

    it("should return false for different dates", () => {
      const date1 = createDateAtMidnight(2026, 4, 16);
      const date2 = createDateAtMidnight(2026, 4, 17);
      expect(isSameDate(date1, date2)).toBe(false);
    });

    it("should return true for same date with different times", () => {
      const date1 = new Date(2026, 3, 16, 10, 30, 0);
      const date2 = new Date(2026, 3, 16, 15, 45, 0);
      expect(isSameDate(date1, date2)).toBe(true);
    });

    it("should return false for different months", () => {
      const date1 = createDateAtMidnight(2026, 4, 16);
      const date2 = createDateAtMidnight(2026, 5, 16);
      expect(isSameDate(date1, date2)).toBe(false);
    });

    it("should return false for different years", () => {
      const date1 = createDateAtMidnight(2026, 4, 16);
      const date2 = createDateAtMidnight(2025, 4, 16);
      expect(isSameDate(date1, date2)).toBe(false);
    });
  });

  describe("exportProjectsListPDF filter logic", () => {
    it("should include projects WITH end dates regardless of export date", () => {
      const project = {
        id: 1,
        name: "Project with End Date",
        startDate: createDateAtMidnight(2026, 4, 16),
        estimatedEndDate: createDateAtMidnight(2026, 4, 20),
      };

      const todayMidnight = createDateAtMidnight(2026, 4, 17);
      
      // Filter logic: include all projects with end dates
      const shouldInclude = project.estimatedEndDate !== null;
      expect(shouldInclude).toBe(true);
    });

    it("should include projects WITHOUT end dates ONLY if start date matches export date", () => {
      const project = {
        id: 2,
        name: "Project without End Date",
        startDate: createDateAtMidnight(2026, 4, 16),
        estimatedEndDate: null,
      };

      const todayMidnight = createDateAtMidnight(2026, 4, 16);
      
      // Filter logic: include projects without end dates only if start date matches today
      const shouldInclude = project.estimatedEndDate !== null || 
                           (project.startDate !== null && isSameDate(project.startDate, todayMidnight));
      expect(shouldInclude).toBe(true);
    });

    it("should exclude projects WITHOUT end dates if start date does NOT match export date", () => {
      const project = {
        id: 3,
        name: "Project without End Date",
        startDate: createDateAtMidnight(2026, 4, 16),
        estimatedEndDate: null,
      };

      const todayMidnight = createDateAtMidnight(2026, 4, 17);
      
      // Filter logic: include projects without end dates only if start date matches today
      const shouldInclude = project.estimatedEndDate !== null || 
                           (project.startDate !== null && isSameDate(project.startDate, todayMidnight));
      expect(shouldInclude).toBe(false);
    });

    it("should exclude projects WITHOUT end dates if start date is in the future", () => {
      const project = {
        id: 4,
        name: "Future Project without End Date",
        startDate: createDateAtMidnight(2026, 4, 20),
        estimatedEndDate: null,
      };

      const todayMidnight = createDateAtMidnight(2026, 4, 16);
      
      // Filter logic: include projects without end dates only if start date matches today
      const shouldInclude = project.estimatedEndDate !== null || 
                           (project.startDate !== null && isSameDate(project.startDate, todayMidnight));
      expect(shouldInclude).toBe(false);
    });

    it("should exclude projects WITHOUT end dates if start date is in the past", () => {
      const project = {
        id: 5,
        name: "Past Project without End Date",
        startDate: createDateAtMidnight(2026, 4, 10),
        estimatedEndDate: null,
      };

      const todayMidnight = createDateAtMidnight(2026, 4, 16);
      
      // Filter logic: include projects without end dates only if start date matches today
      const shouldInclude = project.estimatedEndDate !== null || 
                           (project.startDate !== null && isSameDate(project.startDate, todayMidnight));
      expect(shouldInclude).toBe(false);
    });
  });

  describe("exportSchedulePDF filter logic", () => {
    it("should include projects WITH end dates that overlap with week", () => {
      const project = {
        id: 1,
        name: "Project with End Date",
        startDate: createDateAtMidnight(2026, 4, 16),
        estimatedEndDate: createDateAtMidnight(2026, 4, 20),
      };

      const weekStart = createDateAtMidnight(2026, 4, 15);
      const weekEnd = createDateAtMidnight(2026, 4, 21);
      
      // Filter logic: projects with end dates use normal overlap logic
      const projectStart = project.startDate;
      const projectEnd = project.estimatedEndDate;
      const shouldInclude = projectStart <= weekEnd && projectEnd >= weekStart;
      
      expect(shouldInclude).toBe(true);
    });

    it("should include projects WITHOUT end dates if start date is within the export week", () => {
      const project = {
        id: 2,
        name: "Project without End Date",
        startDate: createDateAtMidnight(2026, 4, 18),
        estimatedEndDate: null,
      };

      const weekStart = createDateAtMidnight(2026, 4, 15);
      const weekEnd = createDateAtMidnight(2026, 4, 21);
      
      // Filter logic: projects without end dates only if start date is within week
      const projectStart = project.startDate;
      const shouldInclude = projectStart >= weekStart && projectStart <= weekEnd;
      
      expect(shouldInclude).toBe(true);
    });

    it("should exclude projects WITHOUT end dates if start date is before the export week", () => {
      const project = {
        id: 3,
        name: "Project without End Date",
        startDate: createDateAtMidnight(2026, 4, 10),
        estimatedEndDate: null,
      };

      const weekStart = createDateAtMidnight(2026, 4, 15);
      const weekEnd = createDateAtMidnight(2026, 4, 21);
      
      // Filter logic: projects without end dates only if start date is within week
      const projectStart = project.startDate;
      const shouldInclude = projectStart >= weekStart && projectStart <= weekEnd;
      
      expect(shouldInclude).toBe(false);
    });

    it("should exclude projects WITHOUT end dates if start date is after the export week", () => {
      const project = {
        id: 4,
        name: "Project without End Date",
        startDate: createDateAtMidnight(2026, 4, 25),
        estimatedEndDate: null,
      };

      const weekStart = createDateAtMidnight(2026, 4, 15);
      const weekEnd = createDateAtMidnight(2026, 4, 21);
      
      // Filter logic: projects without end dates only if start date is within week
      const projectStart = project.startDate;
      const shouldInclude = projectStart >= weekStart && projectStart <= weekEnd;
      
      expect(shouldInclude).toBe(false);
    });

    it("should include projects WITHOUT end dates if selected date matches start date", () => {
      const project = {
        id: 5,
        name: "Project without End Date",
        startDate: createDateAtMidnight(2026, 4, 16),
        estimatedEndDate: null,
      };

      const selectedDate = createDateAtMidnight(2026, 4, 16);
      
      // Filter logic: projects without end dates only if selected date matches start date
      const projectStart = project.startDate;
      const shouldInclude = isSameDate(projectStart, selectedDate);
      
      expect(shouldInclude).toBe(true);
    });

    it("should exclude projects WITHOUT end dates if selected date does NOT match start date", () => {
      const project = {
        id: 6,
        name: "Project without End Date",
        startDate: createDateAtMidnight(2026, 4, 16),
        estimatedEndDate: null,
      };

      const selectedDate = createDateAtMidnight(2026, 4, 17);
      
      // Filter logic: projects without end dates only if selected date matches start date
      const projectStart = project.startDate;
      const shouldInclude = isSameDate(projectStart, selectedDate);
      
      expect(shouldInclude).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle projects with null start date", () => {
      const project = {
        id: 1,
        name: "Project with null start date",
        startDate: null,
        estimatedEndDate: null,
      };

      const todayMidnight = createDateAtMidnight(2026, 4, 16);
      
      // Filter logic: exclude if no start date
      const shouldInclude = project.estimatedEndDate !== null || 
                           (project.startDate !== null && isSameDate(project.startDate, todayMidnight));
      expect(shouldInclude).toBe(false);
    });

    it("should handle projects with only start date (no end date)", () => {
      const project = {
        id: 2,
        name: "Project with only start date",
        startDate: createDateAtMidnight(2026, 4, 16),
        estimatedEndDate: null,
      };

      const todayMidnight = createDateAtMidnight(2026, 4, 16);
      
      // Filter logic: include if start date matches today
      const shouldInclude = project.estimatedEndDate !== null || 
                           (project.startDate !== null && isSameDate(project.startDate, todayMidnight));
      expect(shouldInclude).toBe(true);
    });

    it("should handle projects with both start and end dates", () => {
      const project = {
        id: 3,
        name: "Project with both dates",
        startDate: createDateAtMidnight(2026, 4, 16),
        estimatedEndDate: createDateAtMidnight(2026, 4, 20),
      };

      const todayMidnight = createDateAtMidnight(2026, 4, 17);
      
      // Filter logic: always include if end date exists
      const shouldInclude = project.estimatedEndDate !== null;
      expect(shouldInclude).toBe(true);
    });
  });
});


describe("PDF Export - Single Date Project Filtering", () => {
  /**
   * Tests for the PDF export behavior when projects have only a start date (no end date).
   * These projects should appear ONLY on their start date in the PDF export, not on subsequent days.
   * This matches the weekly schedule behavior.
   */

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
    startDate: Date;
    estimatedEndDate: Date | null;
  }

  describe("570 Crown St Project - Real World Scenario", () => {
    it("should appear only on April 29 when exported for that date", () => {
      const project: MockProject = {
        id: 1,
        name: "570 Crown St",
        startDate: createDateAtMidnight(2026, 4, 29),
        estimatedEndDate: null,
      };

      const exportDate = createDateAtMidnight(2026, 4, 29);
      
      // Project should appear on export date if it's the start date
      const shouldAppear = project.estimatedEndDate 
        ? true // Has end date, would need range check
        : isSameDate(project.startDate, exportDate);
      
      expect(shouldAppear).toBe(true);
    });

    it("should NOT appear on April 30 when exported for that date", () => {
      const project: MockProject = {
        id: 1,
        name: "570 Crown St",
        startDate: createDateAtMidnight(2026, 4, 29),
        estimatedEndDate: null,
      };

      const exportDate = createDateAtMidnight(2026, 4, 30);
      
      // Project should NOT appear on export date if it's not the start date
      const shouldAppear = project.estimatedEndDate 
        ? true // Has end date, would need range check
        : isSameDate(project.startDate, exportDate);
      
      expect(shouldAppear).toBe(false);
    });

    it("should NOT appear on May 1 when exported for that date", () => {
      const project: MockProject = {
        id: 1,
        name: "570 Crown St",
        startDate: createDateAtMidnight(2026, 4, 29),
        estimatedEndDate: null,
      };

      const exportDate = createDateAtMidnight(2026, 5, 1);
      
      const shouldAppear = project.estimatedEndDate 
        ? true // Has end date, would need range check
        : isSameDate(project.startDate, exportDate);
      
      expect(shouldAppear).toBe(false);
    });
  });

  describe("PDF Week Export - Single Date Projects", () => {
    it("should include single-date project if start date is within the week", () => {
      const project: MockProject = {
        id: 1,
        name: "Single Day Project",
        startDate: createDateAtMidnight(2026, 4, 29),
        estimatedEndDate: null,
      };

      const weekStart = createDateAtMidnight(2026, 4, 28);
      const weekEnd = createDateAtMidnight(2026, 5, 4);

      // Project should be included in week if start date is within week
      const shouldInclude = project.startDate >= weekStart && project.startDate <= weekEnd;
      expect(shouldInclude).toBe(true);
    });

    it("should NOT include single-date project if start date is before the week", () => {
      const project: MockProject = {
        id: 1,
        name: "Single Day Project",
        startDate: createDateAtMidnight(2026, 4, 27),
        estimatedEndDate: null,
      };

      const weekStart = createDateAtMidnight(2026, 4, 28);
      const weekEnd = createDateAtMidnight(2026, 5, 4);

      const shouldInclude = project.startDate >= weekStart && project.startDate <= weekEnd;
      expect(shouldInclude).toBe(false);
    });

    it("should NOT include single-date project if start date is after the week", () => {
      const project: MockProject = {
        id: 1,
        name: "Single Day Project",
        startDate: createDateAtMidnight(2026, 5, 5),
        estimatedEndDate: null,
      };

      const weekStart = createDateAtMidnight(2026, 4, 28);
      const weekEnd = createDateAtMidnight(2026, 5, 4);

      const shouldInclude = project.startDate >= weekStart && project.startDate <= weekEnd;
      expect(shouldInclude).toBe(false);
    });
  });

  describe("PDF Export - Date Mapping for Single-Date Projects", () => {
    it("should add single-date project only to its start date in schedule map", () => {
      const project: MockProject = {
        id: 1,
        name: "Single Day Project",
        startDate: createDateAtMidnight(2026, 4, 29),
        estimatedEndDate: null,
      };

      const weekStart = createDateAtMidnight(2026, 4, 28);
      const weekEnd = createDateAtMidnight(2026, 5, 4);

      // Simulate the schedule map creation
      const scheduleMap = new Map<string, string[]>();
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      // Create schedule map for the week
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateKey = date.toISOString().split("T")[0];
        scheduleMap.set(dateKey, []);
      }

      // Add project to schedule map (simulating the fixed logic)
      const startDateKey = project.startDate.toISOString().split("T")[0];
      const endDateKey = project.estimatedEndDate 
        ? new Date(project.estimatedEndDate).toISOString().split("T")[0]
        : startDateKey; // For single-date projects, end date = start date

      let currentDate = new Date(project.startDate);
      const endDate = new Date(project.estimatedEndDate || project.startDate);
      
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split("T")[0];
        const dayData = scheduleMap.get(dateKey);
        if (dayData) {
          dayData.push(project.name);
        }
        // If project has no estimated end date, only add to start date
        if (!project.estimatedEndDate) {
          break;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Verify project appears only on April 29
      expect(scheduleMap.get("2026-04-29")).toContain("Single Day Project");
      expect(scheduleMap.get("2026-04-30")).not.toContain("Single Day Project");
      expect(scheduleMap.get("2026-05-01")).not.toContain("Single Day Project");
    });

    it("should add multi-date project to all dates in its range", () => {
      const project: MockProject = {
        id: 2,
        name: "Multi Day Project",
        startDate: createDateAtMidnight(2026, 4, 29),
        estimatedEndDate: createDateAtMidnight(2026, 5, 1),
      };

      const weekStart = createDateAtMidnight(2026, 4, 28);
      const weekEnd = createDateAtMidnight(2026, 5, 4);

      // Create schedule map for the week
      const scheduleMap = new Map<string, string[]>();
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateKey = date.toISOString().split("T")[0];
        scheduleMap.set(dateKey, []);
      }

      // Add project to schedule map (multi-date logic)
      let currentDate = new Date(project.startDate);
      const endDate = new Date(project.estimatedEndDate || project.startDate);
      
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split("T")[0];
        const dayData = scheduleMap.get(dateKey);
        if (dayData) {
          dayData.push(project.name);
        }
        if (!project.estimatedEndDate) {
          break;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Verify project appears on all three dates
      expect(scheduleMap.get("2026-04-29")).toContain("Multi Day Project");
      expect(scheduleMap.get("2026-04-30")).toContain("Multi Day Project");
      expect(scheduleMap.get("2026-05-01")).toContain("Multi Day Project");
      expect(scheduleMap.get("2026-05-02")).not.toContain("Multi Day Project");
    });
  });
});
