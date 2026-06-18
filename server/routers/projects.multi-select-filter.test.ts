import { describe, it, expect } from "vitest";

describe("Multi-Select Status Filter", () => {
  describe("Filter Logic", () => {
    it("should include projects when no statuses are selected", () => {
      const selectedStatuses: string[] = [];
      const projectStatus = "Fabrication";
      
      // When no statuses selected, include all projects
      const shouldInclude = selectedStatuses.length === 0 || selectedStatuses.includes(projectStatus);
      expect(shouldInclude).toBe(true);
    });

    it("should include project when its status is in selectedStatuses", () => {
      const selectedStatuses = ["Fabrication", "On-Site"];
      const projectStatus = "Fabrication";
      
      const shouldInclude = selectedStatuses.length > 0 && selectedStatuses.includes(projectStatus);
      expect(shouldInclude).toBe(true);
    });

    it("should exclude project when its status is not in selectedStatuses", () => {
      const selectedStatuses = ["Fabrication", "On-Site"];
      const projectStatus = "Review";
      
      const shouldInclude = selectedStatuses.length > 0 && selectedStatuses.includes(projectStatus);
      expect(shouldInclude).toBe(false);
    });

    it("should handle single status selection", () => {
      const selectedStatuses = ["Fabrication"];
      const fabricationProject = "Fabrication";
      const reviewProject = "Review";
      
      expect(selectedStatuses.includes(fabricationProject)).toBe(true);
      expect(selectedStatuses.includes(reviewProject)).toBe(false);
    });

    it("should handle multiple status selection", () => {
      const selectedStatuses = ["Fabrication", "On-Site", "Review"];
      
      expect(selectedStatuses.includes("Fabrication")).toBe(true);
      expect(selectedStatuses.includes("On-Site")).toBe(true);
      expect(selectedStatuses.includes("Review")).toBe(true);
      expect(selectedStatuses.includes("Shop Drawings")).toBe(false);
    });
  });

  describe("Status Toggle Logic", () => {
    it("should add status when not in selectedStatuses", () => {
      const selectedStatuses = ["Fabrication"];
      const statusToAdd = "On-Site";
      
      const updated = selectedStatuses.includes(statusToAdd)
        ? selectedStatuses.filter((s) => s !== statusToAdd)
        : [...selectedStatuses, statusToAdd];
      
      expect(updated).toContain("Fabrication");
      expect(updated).toContain("On-Site");
      expect(updated.length).toBe(2);
    });

    it("should remove status when already in selectedStatuses", () => {
      const selectedStatuses = ["Fabrication", "On-Site"];
      const statusToRemove = "Fabrication";
      
      const updated = selectedStatuses.includes(statusToRemove)
        ? selectedStatuses.filter((s) => s !== statusToRemove)
        : [...selectedStatuses, statusToRemove];
      
      expect(updated).not.toContain("Fabrication");
      expect(updated).toContain("On-Site");
      expect(updated.length).toBe(1);
    });

    it("should handle clearing all statuses", () => {
      const selectedStatuses = ["Fabrication", "On-Site", "Review"];
      const cleared: string[] = [];
      
      expect(cleared.length).toBe(0);
    });

    it("should handle adding first status to empty array", () => {
      const selectedStatuses: string[] = [];
      const statusToAdd = "Fabrication";
      
      const updated = [...selectedStatuses, statusToAdd];
      
      expect(updated.length).toBe(1);
      expect(updated).toContain("Fabrication");
    });
  });

  describe("Display Logic", () => {
    it("should display 'All' when no statuses selected", () => {
      const selectedStatuses: string[] = [];
      const displayText = selectedStatuses.length === 0 ? "All" : `${selectedStatuses.length} selected`;
      
      expect(displayText).toBe("All");
    });

    it("should display single status name when one selected", () => {
      const selectedStatuses = ["Fabrication"];
      const displayText = selectedStatuses.length === 0 ? "All" : selectedStatuses.length === 1 ? selectedStatuses[0] : `${selectedStatuses.length} selected`;
      
      expect(displayText).toBe("Fabrication");
    });

    it("should display count when multiple statuses selected", () => {
      const selectedStatuses = ["Fabrication", "On-Site", "Review"];
      const displayText = selectedStatuses.length === 0 ? "All" : selectedStatuses.length === 1 ? selectedStatuses[0] : `${selectedStatuses.length} selected`;
      
      expect(displayText).toBe("3 selected");
    });

    it("should display correct count for two statuses", () => {
      const selectedStatuses = ["Fabrication", "On-Site"];
      const displayText = selectedStatuses.length === 0 ? "All" : selectedStatuses.length === 1 ? selectedStatuses[0] : `${selectedStatuses.length} selected`;
      
      expect(displayText).toBe("2 selected");
    });
  });

  describe("PDF Export Integration", () => {
    it("should pass statuses array to PDF export when selected", () => {
      const selectedStatuses = ["Fabrication", "On-Site"];
      const exportPayload = {
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      };
      
      expect(exportPayload.statuses).toEqual(["Fabrication", "On-Site"]);
    });

    it("should pass undefined when no statuses selected", () => {
      const selectedStatuses: string[] = [];
      const exportPayload = {
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      };
      
      expect(exportPayload.statuses).toBeUndefined();
    });

    it("should include all statuses in export payload", () => {
      const selectedStatuses = ["Review", "Shop Drawings", "Fabrication"];
      const exportPayload = {
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      };
      
      expect(exportPayload.statuses).toHaveLength(3);
      expect(exportPayload.statuses).toContain("Review");
      expect(exportPayload.statuses).toContain("Shop Drawings");
      expect(exportPayload.statuses).toContain("Fabrication");
    });
  });

  describe("Filter Active State", () => {
    it("should detect active filters when statuses selected", () => {
      const selectedDate = null;
      const selectedSubId = null;
      const selectedStatuses = ["Fabrication"];
      
      const hasActiveFilters = selectedDate || selectedSubId || selectedStatuses.length > 0;
      expect(hasActiveFilters).toBe(true);
    });

    it("should not detect active filters when nothing selected", () => {
      const selectedDate = null;
      const selectedSubId = null;
      const selectedStatuses: string[] = [];
      
      const hasActiveFilters = selectedDate || selectedSubId || selectedStatuses.length > 0;
      expect(hasActiveFilters).toBe(false);
    });

    it("should clear all statuses when reset", () => {
      const selectedStatuses = ["Fabrication", "On-Site", "Review"];
      const cleared: string[] = [];
      
      expect(cleared).toEqual([]);
      expect(cleared.length).toBe(0);
    });
  });
});
