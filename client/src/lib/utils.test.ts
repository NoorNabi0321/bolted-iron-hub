import { describe, it, expect } from "vitest";
import { dateToTimestamp, timestampToDateInput } from "./utils";

describe("Timezone-aware date conversion", () => {
  it("should convert date string to timestamp correctly", () => {
    // Test: "2026-03-15" should create a timestamp for March 15 at midnight local time
    const timestamp = dateToTimestamp("2026-03-15");
    expect(timestamp).toBeDefined();
    
    // Verify by converting back
    const dateString = timestampToDateInput(timestamp!);
    expect(dateString).toBe("2026-03-15");
  });

  it("should handle empty date strings", () => {
    expect(dateToTimestamp("")).toBeUndefined();
    expect(timestampToDateInput(undefined)).toBe("");
    expect(timestampToDateInput(null)).toBe("");
  });

  it("should convert timestamp back to date string correctly", () => {
    const testDate = "2026-03-21";
    const timestamp = dateToTimestamp(testDate);
    const result = timestampToDateInput(timestamp!);
    expect(result).toBe(testDate);
  });

  it("should preserve date across multiple conversions", () => {
    const originalDate = "2026-03-15";
    
    // Convert to timestamp
    const timestamp = dateToTimestamp(originalDate);
    expect(timestamp).toBeDefined();
    
    // Convert back to date string
    const resultDate = timestampToDateInput(timestamp!);
    
    // Should match original
    expect(resultDate).toBe(originalDate);
  });

  it("should handle various date formats", () => {
    const testDates = [
      "2026-01-01",
      "2026-12-31",
      "2026-06-15",
      "2026-02-28",
    ];

    testDates.forEach((date) => {
      const timestamp = dateToTimestamp(date);
      const result = timestampToDateInput(timestamp!);
      expect(result).toBe(date);
    });
  });

  it("should create consistent timestamps regardless of user timezone", () => {
    // The key insight: when user selects "2026-03-15" in their date picker,
    // dateToTimestamp should create a timestamp for midnight on that date
    // in their local timezone. When converted back, it should show the same date.
    
    const userSelectedDate = "2026-03-15";
    const timestamp = dateToTimestamp(userSelectedDate);
    
    // Create a Date object from the timestamp
    const date = new Date(timestamp!);
    
    // The date's local date components should match the input
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2); // March is month 2 (0-indexed)
    expect(date.getDate()).toBe(15);
    
    // When converted back, should be identical
    expect(timestampToDateInput(timestamp!)).toBe(userSelectedDate);
  });
});
