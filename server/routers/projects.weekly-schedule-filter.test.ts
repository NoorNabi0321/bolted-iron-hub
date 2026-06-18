import { describe, it, expect } from "vitest";

/**
 * Tests for Weekly Schedule Filter Logic
 * 
 * Requirement: Projects with only a start date (no end date) should appear ONLY on that start date,
 * not on subsequent days in the weekly schedule.
 */

describe("Weekly Schedule Filter Logic", () => {
  // Helper functions matching DailySchedule component
  function toDate(d: Date | string | null): Date | null {
    if (!d) return null;
    const date = typeof d === "string" ? new Date(d) : d;
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

  describe("Projects with Only Start Date", () => {
    it("should appear on start date", () => {
      const startDate = new Date(2026, 3, 29); // April 29, 2026
      const day = new Date(2026, 3, 29);
      const end = null;

      const shouldAppear = end ? isWithinRange(day, startDate, end) : isSameDay(day, startDate);
      expect(shouldAppear).toBe(true);
    });

    it("should NOT appear on day after start date", () => {
      const startDate = new Date(2026, 3, 29); // April 29, 2026
      const day = new Date(2026, 3, 30); // April 30, 2026
      const end = null;

      const shouldAppear = end ? isWithinRange(day, startDate, end) : isSameDay(day, startDate);
      expect(shouldAppear).toBe(false);
    });

    it("should NOT appear on multiple days after start date", () => {
      const startDate = new Date(2026, 3, 29); // April 29, 2026
      const end = null;

      const days = [
        new Date(2026, 3, 30), // April 30
        new Date(2026, 4, 1),  // May 1
        new Date(2026, 4, 2),  // May 2
      ];

      days.forEach((day) => {
        const shouldAppear = end ? isWithinRange(day, startDate, end) : isSameDay(day, startDate);
        expect(shouldAppear).toBe(false);
      });
    });

    it("should NOT appear on day before start date", () => {
      const startDate = new Date(2026, 3, 29); // April 29, 2026
      const day = new Date(2026, 3, 28); // April 28, 2026
      const end = null;

      const shouldAppear = end ? isWithinRange(day, startDate, end) : isSameDay(day, startDate);
      expect(shouldAppear).toBe(false);
    });
  });

  describe("Projects with Start and End Dates", () => {
    it("should appear on start date when both dates exist", () => {
      const startDate = new Date(2026, 3, 29); // April 29, 2026
      const endDate = new Date(2026, 4, 1);   // May 1, 2026
      const day = new Date(2026, 3, 29);

      const shouldAppear = isWithinRange(day, startDate, endDate);
      expect(shouldAppear).toBe(true);
    });

    it("should appear on days between start and end dates", () => {
      const startDate = new Date(2026, 3, 29); // April 29, 2026
      const endDate = new Date(2026, 4, 1);   // May 1, 2026

      const days = [
        new Date(2026, 3, 29), // April 29 (start)
        new Date(2026, 3, 30), // April 30
        new Date(2026, 4, 1),  // May 1 (end)
      ];

      days.forEach((day) => {
        const shouldAppear = isWithinRange(day, startDate, endDate);
        expect(shouldAppear).toBe(true);
      });
    });

    it("should NOT appear before start date", () => {
      const startDate = new Date(2026, 3, 29); // April 29, 2026
      const endDate = new Date(2026, 4, 1);   // May 1, 2026
      const day = new Date(2026, 3, 28);      // April 28

      const shouldAppear = isWithinRange(day, startDate, endDate);
      expect(shouldAppear).toBe(false);
    });

    it("should NOT appear after end date", () => {
      const startDate = new Date(2026, 3, 29); // April 29, 2026
      const endDate = new Date(2026, 4, 1);   // May 1, 2026
      const day = new Date(2026, 4, 2);       // May 2

      const shouldAppear = isWithinRange(day, startDate, endDate);
      expect(shouldAppear).toBe(false);
    });

    it("should appear on end date", () => {
      const startDate = new Date(2026, 3, 29); // April 29, 2026
      const endDate = new Date(2026, 4, 1);   // May 1, 2026
      const day = new Date(2026, 4, 1);       // May 1

      const shouldAppear = isWithinRange(day, startDate, endDate);
      expect(shouldAppear).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle same day start and end dates", () => {
      const startDate = new Date(2026, 3, 29); // April 29, 2026
      const endDate = new Date(2026, 3, 29);  // April 29, 2026
      const day = new Date(2026, 3, 29);

      const shouldAppear = isWithinRange(day, startDate, endDate);
      expect(shouldAppear).toBe(true);
    });

    it("should NOT appear on same day if before start date", () => {
      const startDate = new Date(2026, 3, 29); // April 29, 2026
      const endDate = new Date(2026, 3, 29);  // April 29, 2026
      const day = new Date(2026, 3, 28);      // April 28

      const shouldAppear = isWithinRange(day, startDate, endDate);
      expect(shouldAppear).toBe(false);
    });

    it("should handle null end date as single day range", () => {
      const startDate = new Date(2026, 3, 29); // April 29, 2026
      const endDate = null;
      const day = new Date(2026, 3, 29);

      const shouldAppear = endDate
        ? isWithinRange(day, startDate, endDate)
        : isSameDay(day, startDate);
      expect(shouldAppear).toBe(true);
    });

    it("should handle null start date", () => {
      const startDate = null;
      const endDate = new Date(2026, 4, 1);
      const day = new Date(2026, 3, 29);

      const shouldAppear = startDate ? isWithinRange(day, startDate, endDate) : false;
      expect(shouldAppear).toBe(false);
    });
  });

  describe("Real-World Scenario: 570 Crown St Project", () => {
    it("should appear only on April 29 when start date is April 29 with no end date", () => {
      const projectStartDate = new Date(2026, 3, 29); // April 29, 2026
      const projectEndDate = null;

      // Test April 29 (should appear)
      const april29 = new Date(2026, 3, 29);
      const shouldAppearOn29 = projectEndDate
        ? isWithinRange(april29, projectStartDate, projectEndDate)
        : isSameDay(april29, projectStartDate);
      expect(shouldAppearOn29).toBe(true);

      // Test April 30 (should NOT appear)
      const april30 = new Date(2026, 3, 30);
      const shouldAppearOn30 = projectEndDate
        ? isWithinRange(april30, projectStartDate, projectEndDate)
        : isSameDay(april30, projectStartDate);
      expect(shouldAppearOn30).toBe(false);

      // Test May 1 (should NOT appear)
      const may1 = new Date(2026, 4, 1);
      const shouldAppearOnMay1 = projectEndDate
        ? isWithinRange(may1, projectStartDate, projectEndDate)
        : isSameDay(may1, projectStartDate);
      expect(shouldAppearOnMay1).toBe(false);
    });
  });

  describe("Weekly Schedule Filtering", () => {
    interface Project {
      id: number;
      name: string;
      startDate: Date | null;
      estimatedEndDate: Date | null;
    }

    const projects: Project[] = [
      {
        id: 1,
        name: "570 Crown St",
        startDate: new Date(2026, 3, 29), // April 29
        estimatedEndDate: null,
      },
      {
        id: 2,
        name: "Project with Range",
        startDate: new Date(2026, 3, 29), // April 29
        estimatedEndDate: new Date(2026, 4, 1), // May 1
      },
    ];

    it("should filter projects correctly for April 29", () => {
      const day = new Date(2026, 3, 29);
      const filtered = projects.filter((p) => {
        const start = p.startDate;
        const end = p.estimatedEndDate;
        if (!start) return false;
        return end ? isWithinRange(day, start, end) : isSameDay(day, start);
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.map((p) => p.id)).toContain(1);
      expect(filtered.map((p) => p.id)).toContain(2);
    });

    it("should filter projects correctly for April 30", () => {
      const day = new Date(2026, 3, 30);
      const filtered = projects.filter((p) => {
        const start = p.startDate;
        const end = p.estimatedEndDate;
        if (!start) return false;
        return end ? isWithinRange(day, start, end) : isSameDay(day, start);
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(2);
    });

    it("should filter projects correctly for May 1", () => {
      const day = new Date(2026, 4, 1);
      const filtered = projects.filter((p) => {
        const start = p.startDate;
        const end = p.estimatedEndDate;
        if (!start) return false;
        return end ? isWithinRange(day, start, end) : isSameDay(day, start);
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(2);
    });

    it("should filter projects correctly for May 2", () => {
      const day = new Date(2026, 4, 2);
      const filtered = projects.filter((p) => {
        const start = p.startDate;
        const end = p.estimatedEndDate;
        if (!start) return false;
        return end ? isWithinRange(day, start, end) : isSameDay(day, start);
      });

      expect(filtered).toHaveLength(0);
    });
  });
});
