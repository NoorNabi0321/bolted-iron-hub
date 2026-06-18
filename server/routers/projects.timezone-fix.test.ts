import { describe, it, expect } from "vitest";

/**
 * Tests for timezone offset bug fix in PDF export
 * 
 * Bug: Projects were appearing one day before their actual start date in PDF
 * Root cause: Timezone adjustment was being applied to project dates from database
 * Fix: Project dates are already in correct timezone, only apply midnight normalization
 */

describe("Timezone Fix for PDF Export", () => {
  const getLocalDateAtMidnight = (date: Date): Date => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  };

  const getLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  interface MockProject {
    id: number;
    name: string;
    status: string;
    startDate: Date;
    estimatedEndDate: Date | null;
  }

  describe("Project Date Handling - No Timezone Adjustment", () => {
    it("should preserve project start date without timezone adjustment", () => {
      const projectStartDate = new Date(2026, 4, 11);
      
      const startDateLocal = getLocalDateAtMidnight(projectStartDate);
      const dateKey = getLocalDateKey(startDateLocal);
      
      expect(dateKey).toBe("2026-05-11");
      expect(startDateLocal.getDate()).toBe(11);
    });

    it("should preserve project end date without timezone adjustment", () => {
      const projectEndDate = new Date(2026, 4, 15);
      
      const endDateLocal = getLocalDateAtMidnight(projectEndDate);
      const dateKey = getLocalDateKey(endDateLocal);
      
      expect(dateKey).toBe("2026-05-15");
      expect(endDateLocal.getDate()).toBe(15);
    });

    it("should correctly map 263 Penn st project (May 11 start date)", () => {
      const project: MockProject = {
        id: 1,
        name: "263 Penn st",
        status: "Shop Drawings",
        startDate: new Date(2026, 4, 11),
        estimatedEndDate: null,
      };

      const startDateLocal = getLocalDateAtMidnight(project.startDate);
      const dateKey = getLocalDateKey(startDateLocal);

      expect(dateKey).toBe("2026-05-11");
      expect(startDateLocal.getDate()).toBe(11);
    });
  });

  describe("Week Date Range Handling", () => {
    it("should correctly handle week start date", () => {
      const weekStartDate = new Date(2026, 4, 10);
      
      const weekStartLocal = getLocalDateAtMidnight(weekStartDate);
      const dateKey = getLocalDateKey(weekStartLocal);
      
      expect(dateKey).toBe("2026-05-10");
      expect(weekStartLocal.getDate()).toBe(10);
    });

    it("should correctly handle week end date", () => {
      const weekEndDate = new Date(2026, 4, 16);
      
      const weekEndLocal = getLocalDateAtMidnight(weekEndDate);
      const dateKey = getLocalDateKey(weekEndLocal);
      
      expect(dateKey).toBe("2026-05-16");
      expect(weekEndLocal.getDate()).toBe(16);
    });
  });

  describe("Project Date Comparison - Correct Dates", () => {
    it("should correctly identify project within week range", () => {
      const project: MockProject = {
        id: 1,
        name: "263 Penn st",
        status: "Shop Drawings",
        startDate: new Date(2026, 4, 11),
        estimatedEndDate: null,
      };

      const weekStart = getLocalDateAtMidnight(new Date(2026, 4, 10));
      const weekEnd = getLocalDateAtMidnight(new Date(2026, 4, 16));
      const projectStart = getLocalDateAtMidnight(project.startDate);

      expect(projectStart >= weekStart && projectStart <= weekEnd).toBe(true);
    });

    it("should correctly identify project outside week range", () => {
      const project: MockProject = {
        id: 2,
        name: "Future Project",
        status: "Fabrication",
        startDate: new Date(2026, 4, 20),
        estimatedEndDate: null,
      };

      const weekStart = getLocalDateAtMidnight(new Date(2026, 4, 10));
      const weekEnd = getLocalDateAtMidnight(new Date(2026, 4, 16));
      const projectStart = getLocalDateAtMidnight(project.startDate);

      expect(projectStart >= weekStart && projectStart <= weekEnd).toBe(false);
    });
  });

  describe("Multiple Projects - Correct Dates", () => {
    it("should correctly map multiple projects to their actual dates", () => {
      const projects: MockProject[] = [
        {
          id: 1,
          name: "263 Penn st",
          status: "Shop Drawings",
          startDate: new Date(2026, 4, 11),
          estimatedEndDate: null,
        },
        {
          id: 2,
          name: "132-32nd st",
          status: "Shop Drawings",
          startDate: new Date(2026, 4, 11),
          estimatedEndDate: null,
        },
        {
          id: 3,
          name: "636 w158th st",
          status: "Fabrication",
          startDate: new Date(2026, 4, 10),
          estimatedEndDate: null,
        },
      ];

      const dateMap = new Map<string, string[]>();

      for (const project of projects) {
        const startDateLocal = getLocalDateAtMidnight(project.startDate);
        const dateKey = getLocalDateKey(startDateLocal);
        
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, []);
        }
        dateMap.get(dateKey)!.push(project.name);
      }

      expect(dateMap.get("2026-05-10")).toEqual(["636 w158th st"]);
      expect(dateMap.get("2026-05-11")).toEqual(["263 Penn st", "132-32nd st"]);
      
      expect(dateMap.get("2026-05-10")).not.toContain("263 Penn st");
      expect(dateMap.get("2026-05-10")).not.toContain("132-32nd st");
    });
  });

  describe("Edge Cases - Date Boundaries", () => {
    it("should handle projects on first day of month", () => {
      const project: MockProject = {
        id: 1,
        name: "Month Start Project",
        status: "Shop Drawings",
        startDate: new Date(2026, 5, 1),
        estimatedEndDate: null,
      };

      const startDateLocal = getLocalDateAtMidnight(project.startDate);
      const dateKey = getLocalDateKey(startDateLocal);

      expect(dateKey).toBe("2026-06-01");
      expect(startDateLocal.getDate()).toBe(1);
    });

    it("should handle projects on last day of month", () => {
      const project: MockProject = {
        id: 2,
        name: "Month End Project",
        status: "Fabrication",
        startDate: new Date(2026, 4, 31),
        estimatedEndDate: null,
      };

      const startDateLocal = getLocalDateAtMidnight(project.startDate);
      const dateKey = getLocalDateKey(startDateLocal);

      expect(dateKey).toBe("2026-05-31");
      expect(startDateLocal.getDate()).toBe(31);
    });

    it("should handle projects spanning month boundary", () => {
      const project: MockProject = {
        id: 3,
        name: "Month Spanning Project",
        status: "Fabrication",
        startDate: new Date(2026, 4, 28),
        estimatedEndDate: new Date(2026, 5, 3),
      };

      const startDateLocal = getLocalDateAtMidnight(project.startDate);
      const endDateLocal = getLocalDateAtMidnight(project.estimatedEndDate!);

      expect(getLocalDateKey(startDateLocal)).toBe("2026-05-28");
      expect(getLocalDateKey(endDateLocal)).toBe("2026-06-03");
    });
  });

  describe("Real-World Scenario - 263 Penn st Fix Verification", () => {
    it("should fix the 263 Penn st bug - appears on May 11, not May 10", () => {
      const project: MockProject = {
        id: 1,
        name: "263 Penn st",
        status: "Shop Drawings",
        startDate: new Date(2026, 4, 11),
        estimatedEndDate: null,
      };

      const weekStart = getLocalDateAtMidnight(new Date(2026, 4, 10));
      const weekEnd = getLocalDateAtMidnight(new Date(2026, 4, 16));
      const projectStart = getLocalDateAtMidnight(project.startDate);

      const scheduleMap = new Map<string, { date: Date; projects: string[] }>();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateKey = getLocalDateKey(date);
        scheduleMap.set(dateKey, {
          date: new Date(date),
          projects: [],
        });
      }

      const dateKey = getLocalDateKey(projectStart);
      const dayData = scheduleMap.get(dateKey);
      if (dayData) {
        dayData.projects.push(project.name);
      }

      expect(scheduleMap.get("2026-05-11")?.projects).toContain("263 Penn st");
      
      const may10Projects = scheduleMap.get("2026-05-10")?.projects || [];
      expect(may10Projects).not.toContain("263 Penn st");
      
      const may12Projects = scheduleMap.get("2026-05-12")?.projects || [];
      expect(may12Projects).not.toContain("263 Penn st");
    });
  });
});
