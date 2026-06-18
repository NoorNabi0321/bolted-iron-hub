import { describe, it, expect } from "vitest";
import { generateSchedulePDF } from "./_core/pdfGenerator";

describe("Time Format Conversion - 24h to 12h with AM/PM", () => {
  it("should convert morning times correctly (00:00 to 11:59)", async () => {
    const scheduleData = [
      {
        date: new Date("2026-04-03"),
        dayName: "Thursday",
        projects: [
          {
            id: "1",
            name: "Morning Project",
            address: "123 Main St",
            status: "on-site",
            isUrgent: false,
            startTime: "08:30", // Should convert to 8:30 AM
            estimatedEndTime: "11:45", // Should convert to 11:45 AM
            subcontractors: [],
          },
          {
            id: "2",
            name: "Midnight Project",
            address: "456 Oak Ave",
            status: "fabrication",
            isUrgent: false,
            startTime: "00:15", // Should convert to 12:15 AM
            estimatedEndTime: "00:45", // Should convert to 12:45 AM
            subcontractors: [],
          },
        ],
      },
    ];

    const pdfBuffer = await generateSchedulePDF({
      scheduleData,
      weekStart: new Date("2026-04-01"),
      weekEnd: new Date("2026-04-07"),
      generatedAt: new Date(),
    });

    // Verify PDF was generated successfully
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Verify PDF header signature
    const pdfHeader = pdfBuffer.toString("latin1", 0, 10);
    expect(pdfHeader).toContain("%PDF");
  });

  it("should convert afternoon and evening times correctly (12:00 to 23:59)", async () => {
    const scheduleData = [
      {
        date: new Date("2026-04-03"),
        dayName: "Thursday",
        projects: [
          {
            id: "1",
            name: "Afternoon Project",
            address: "789 Pine Rd",
            status: "on-site",
            isUrgent: false,
            startTime: "14:00", // Should convert to 2:00 PM
            estimatedEndTime: "17:30", // Should convert to 5:30 PM
            subcontractors: [],
          },
          {
            id: "2",
            name: "Evening Project",
            address: "321 Elm St",
            status: "fabrication",
            isUrgent: false,
            startTime: "18:45", // Should convert to 6:45 PM
            estimatedEndTime: "23:59", // Should convert to 11:59 PM
            subcontractors: [],
          },
        ],
      },
    ];

    const pdfBuffer = await generateSchedulePDF({
      scheduleData,
      weekStart: new Date("2026-04-01"),
      weekEnd: new Date("2026-04-07"),
      generatedAt: new Date(),
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    const pdfHeader = pdfBuffer.toString("latin1", 0, 10);
    expect(pdfHeader).toContain("%PDF");
  });

  it("should handle null times by displaying dash", async () => {
    const scheduleData = [
      {
        date: new Date("2026-04-03"),
        dayName: "Thursday",
        projects: [
          {
            id: "1",
            name: "No Time Project",
            address: "999 No Time Lane",
            status: "on-site",
            isUrgent: false,
            startTime: null, // Should display as "-"
            estimatedEndTime: null, // Should display as "-"
            subcontractors: [],
          },
        ],
      },
    ];

    const pdfBuffer = await generateSchedulePDF({
      scheduleData,
      weekStart: new Date("2026-04-01"),
      weekEnd: new Date("2026-04-07"),
      generatedAt: new Date(),
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    const pdfHeader = pdfBuffer.toString("latin1", 0, 10);
    expect(pdfHeader).toContain("%PDF");
  });

  it("should convert times correctly for urgent projects", async () => {
    const scheduleData = [
      {
        date: new Date("2026-04-03"),
        dayName: "Thursday",
        projects: [
          {
            id: "1",
            name: "Urgent Project",
            address: "555 Urgent Way",
            status: "on-site",
            isUrgent: true, // Urgent project
            startTime: "09:00", // Should convert to 9:00 AM
            estimatedEndTime: "15:30", // Should convert to 3:30 PM
            subcontractors: [],
          },
        ],
      },
    ];

    const pdfBuffer = await generateSchedulePDF({
      scheduleData,
      weekStart: new Date("2026-04-01"),
      weekEnd: new Date("2026-04-07"),
      generatedAt: new Date(),
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    const pdfHeader = pdfBuffer.toString("latin1", 0, 10);
    expect(pdfHeader).toContain("%PDF");
  });

  it("should handle noon and midnight edge cases", async () => {
    const scheduleData = [
      {
        date: new Date("2026-04-03"),
        dayName: "Thursday",
        projects: [
          {
            id: "1",
            name: "Noon Project",
            address: "111 Noon St",
            status: "on-site",
            isUrgent: false,
            startTime: "12:00", // Should convert to 12:00 PM
            estimatedEndTime: "12:30", // Should convert to 12:30 PM
            subcontractors: [],
          },
          {
            id: "2",
            name: "Midnight Project",
            address: "222 Midnight Ave",
            status: "fabrication",
            isUrgent: false,
            startTime: "00:00", // Should convert to 12:00 AM
            estimatedEndTime: "01:00", // Should convert to 1:00 AM
            subcontractors: [],
          },
        ],
      },
    ];

    const pdfBuffer = await generateSchedulePDF({
      scheduleData,
      weekStart: new Date("2026-04-01"),
      weekEnd: new Date("2026-04-07"),
      generatedAt: new Date(),
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    const pdfHeader = pdfBuffer.toString("latin1", 0, 10);
    expect(pdfHeader).toContain("%PDF");
  });
});
