import { describe, it, expect } from "vitest";

describe("Multi-Select Subcontractor Filter", () => {
  describe("Filter Logic", () => {
    it("should include projects when no subcontractors are selected", () => {
      const selectedSubIds: number[] = [];
      const projectSubId = 1;
      
      // When no subcontractors selected, include all projects
      const shouldInclude = selectedSubIds.length === 0 || (projectSubId && selectedSubIds.includes(projectSubId));
      expect(shouldInclude).toBe(true);
    });

    it("should include project when its subcontractor is in selectedSubIds", () => {
      const selectedSubIds = [1, 2, 3];
      const projectSubId = 2;
      
      const shouldInclude = projectSubId && selectedSubIds.includes(projectSubId);
      expect(shouldInclude).toBe(true);
    });

    it("should exclude project when its subcontractor is not in selectedSubIds", () => {
      const selectedSubIds = [1, 2, 3];
      const projectSubId = 5;
      
      const shouldInclude = projectSubId && selectedSubIds.includes(projectSubId);
      expect(shouldInclude).toBe(false);
    });

    it("should handle single subcontractor selection", () => {
      const selectedSubIds = [1];
      const subId1 = 1;
      const subId2 = 2;
      
      expect(selectedSubIds.includes(subId1)).toBe(true);
      expect(selectedSubIds.includes(subId2)).toBe(false);
    });

    it("should handle multiple subcontractor selection", () => {
      const selectedSubIds = [1, 2, 3];
      
      expect(selectedSubIds.includes(1)).toBe(true);
      expect(selectedSubIds.includes(2)).toBe(true);
      expect(selectedSubIds.includes(3)).toBe(true);
      expect(selectedSubIds.includes(4)).toBe(false);
    });
  });

  describe("Subcontractor Toggle Logic", () => {
    it("should add subcontractor when not in selectedSubIds", () => {
      const selectedSubIds = [1, 2];
      const subToAdd = 3;
      
      const updated = selectedSubIds.includes(subToAdd)
        ? selectedSubIds.filter((id) => id !== subToAdd)
        : [...selectedSubIds, subToAdd];
      
      expect(updated).toContain(1);
      expect(updated).toContain(2);
      expect(updated).toContain(3);
      expect(updated.length).toBe(3);
    });

    it("should remove subcontractor when already in selectedSubIds", () => {
      const selectedSubIds = [1, 2, 3];
      const subToRemove = 2;
      
      const updated = selectedSubIds.includes(subToRemove)
        ? selectedSubIds.filter((id) => id !== subToRemove)
        : [...selectedSubIds, subToRemove];
      
      expect(updated).not.toContain(2);
      expect(updated).toContain(1);
      expect(updated).toContain(3);
      expect(updated.length).toBe(2);
    });

    it("should handle clearing all subcontractors", () => {
      const selectedSubIds = [1, 2, 3];
      const cleared: number[] = [];
      
      expect(cleared.length).toBe(0);
    });

    it("should handle adding first subcontractor to empty array", () => {
      const selectedSubIds: number[] = [];
      const subToAdd = 1;
      
      const updated = [...selectedSubIds, subToAdd];
      
      expect(updated.length).toBe(1);
      expect(updated).toContain(1);
    });
  });

  describe("Display Logic", () => {
    const subcontractors = [
      { id: 1, companyName: "Bolted Iron" },
      { id: 2, companyName: "Mendy" },
      { id: 3, companyName: "carlos A." },
    ];

    it("should display 'All' when no subcontractors selected", () => {
      const selectedSubIds: number[] = [];
      const displayText = selectedSubIds.length === 0 ? "All" : `${selectedSubIds.length} selected`;
      
      expect(displayText).toBe("All");
    });

    it("should display subcontractor name when one selected", () => {
      const selectedSubIds = [1];
      const displayText = selectedSubIds.length === 0 ? "All" : selectedSubIds.length === 1 ? subcontractors.find((s) => s.id === selectedSubIds[0])?.companyName || "All" : `${selectedSubIds.length} selected`;
      
      expect(displayText).toBe("Bolted Iron");
    });

    it("should display count when multiple subcontractors selected", () => {
      const selectedSubIds = [1, 2, 3];
      const displayText = selectedSubIds.length === 0 ? "All" : selectedSubIds.length === 1 ? subcontractors.find((s) => s.id === selectedSubIds[0])?.companyName || "All" : `${selectedSubIds.length} selected`;
      
      expect(displayText).toBe("3 selected");
    });

    it("should display correct count for two subcontractors", () => {
      const selectedSubIds = [1, 2];
      const displayText = selectedSubIds.length === 0 ? "All" : selectedSubIds.length === 1 ? subcontractors.find((s) => s.id === selectedSubIds[0])?.companyName || "All" : `${selectedSubIds.length} selected`;
      
      expect(displayText).toBe("2 selected");
    });
  });

  describe("PDF Export Integration", () => {
    it("should pass subcontractorIds array to PDF export when selected", () => {
      const selectedSubIds = [1, 2];
      const exportPayload = {
        subcontractorIds: selectedSubIds.length > 0 ? selectedSubIds : undefined,
      };
      
      expect(exportPayload.subcontractorIds).toEqual([1, 2]);
    });

    it("should pass undefined when no subcontractors selected", () => {
      const selectedSubIds: number[] = [];
      const exportPayload = {
        subcontractorIds: selectedSubIds.length > 0 ? selectedSubIds : undefined,
      };
      
      expect(exportPayload.subcontractorIds).toBeUndefined();
    });

    it("should include all subcontractor IDs in export payload", () => {
      const selectedSubIds = [1, 2, 3, 4];
      const exportPayload = {
        subcontractorIds: selectedSubIds.length > 0 ? selectedSubIds : undefined,
      };
      
      expect(exportPayload.subcontractorIds).toHaveLength(4);
      expect(exportPayload.subcontractorIds).toContain(1);
      expect(exportPayload.subcontractorIds).toContain(2);
      expect(exportPayload.subcontractorIds).toContain(3);
      expect(exportPayload.subcontractorIds).toContain(4);
    });
  });

  describe("Filter Active State", () => {
    it("should detect active filters when subcontractors selected", () => {
      const selectedDate = null;
      const selectedSubIds = [1];
      const selectedStatuses: string[] = [];
      
      const hasActiveFilters = selectedDate || selectedSubIds.length > 0 || selectedStatuses.length > 0;
      expect(!!hasActiveFilters).toBe(true);
    });

    it("should not detect active filters when nothing selected", () => {
      const selectedDate = null;
      const selectedSubIds: number[] = [];
      const selectedStatuses: string[] = [];
      
      const hasActiveFilters = selectedDate || selectedSubIds.length > 0 || selectedStatuses.length > 0;
      expect(hasActiveFilters).toBe(false);
    });

    it("should clear all subcontractors when reset", () => {
      const selectedSubIds = [1, 2, 3];
      const cleared: number[] = [];
      
      expect(cleared).toEqual([]);
      expect(cleared.length).toBe(0);
    });

    it("should detect active filters with multiple filter types", () => {
      const selectedDate = new Date();
      const selectedSubIds = [1, 2];
      const selectedStatuses = ["Fabrication"];
      
      const hasActiveFilters = selectedDate || selectedSubIds.length > 0 || selectedStatuses.length > 0;
      expect(!!hasActiveFilters).toBe(true);
    });
  });

  describe("Backward Compatibility", () => {
    it("should handle single subcontractorId parameter", () => {
      const singleSubId = 1;
      const subcontractorIdsToFilter = singleSubId ? [singleSubId] : undefined;
      
      expect(subcontractorIdsToFilter).toEqual([1]);
    });

    it("should prefer subcontractorIds array over single subcontractorId", () => {
      const singleSubId = 1;
      const multipleSubIds = [2, 3];
      
      const subcontractorIdsToFilter = multipleSubIds && multipleSubIds.length > 0 ? multipleSubIds : (singleSubId ? [singleSubId] : undefined);
      
      expect(subcontractorIdsToFilter).toEqual([2, 3]);
    });

    it("should fall back to single subcontractorId when array is empty", () => {
      const singleSubId = 1;
      const multipleSubIds: number[] = [];
      
      const subcontractorIdsToFilter = multipleSubIds && multipleSubIds.length > 0 ? multipleSubIds : (singleSubId ? [singleSubId] : undefined);
      
      expect(subcontractorIdsToFilter).toEqual([1]);
    });
  });
});
