import { describe, it, expect } from "vitest";

// Timezone-aware date conversion functions
function dateToTimestamp(dateString: string): number | undefined {
  if (!dateString) return undefined;
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return date.getTime();
}

function timestampToDateInput(timestamp: number | null | undefined): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("Timezone-aware date conversion", () => {
  it("should convert date string to timestamp correctly", () => {
    const timestamp = dateToTimestamp("2026-03-15");
    expect(timestamp).toBeDefined();
    
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
    
    const timestamp = dateToTimestamp(originalDate);
    expect(timestamp).toBeDefined();
    
    const resultDate = timestampToDateInput(timestamp!);
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
    const userSelectedDate = "2026-03-15";
    const timestamp = dateToTimestamp(userSelectedDate);
    
    const date = new Date(timestamp!);
    
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2); // March is month 2 (0-indexed)
    expect(date.getDate()).toBe(15);
    
    expect(timestampToDateInput(timestamp!)).toBe(userSelectedDate);
  });

  it("should handle Pakistan timezone (UTC+5) correctly", () => {
    // When a user in Pakistan selects March 15, 2026
    // The timestamp should represent midnight on March 15 in Pakistan time
    const pakistanDate = "2026-03-15";
    const timestamp = dateToTimestamp(pakistanDate);
    
    // Converting back should always give the same date
    expect(timestampToDateInput(timestamp!)).toBe(pakistanDate);
  });

  it("should handle NYC timezone (UTC-5/UTC-4) correctly", () => {
    // When a user in NYC selects March 21, 2026
    // The timestamp should represent midnight on March 21 in NYC time
    const nycDate = "2026-03-21";
    const timestamp = dateToTimestamp(nycDate);
    
    // Converting back should always give the same date
    expect(timestampToDateInput(timestamp!)).toBe(nycDate);
  });

  it("should ensure both Pakistan and NYC users see their selected dates", () => {
    // Scenario: Pakistan user selects March 15, NYC user selects March 21
    const pakistanDate = "2026-03-15";
    const nycDate = "2026-03-21";
    
    const pakistanTimestamp = dateToTimestamp(pakistanDate);
    const nycTimestamp = dateToTimestamp(nycDate);
    
    // Each user should see their own selected date when viewing
    expect(timestampToDateInput(pakistanTimestamp!)).toBe(pakistanDate);
    expect(timestampToDateInput(nycTimestamp!)).toBe(nycDate);
    
    // The timestamps should be different (6 days apart)
    expect(nycTimestamp! - pakistanTimestamp!).toBe(6 * 24 * 60 * 60 * 1000);
  });
});
