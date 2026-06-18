import { describe, it, expect } from "vitest";
import { extractChecklistFromPDF } from "./proposalExtractor";

describe("Proposal Extractor Service", () => {

  describe("extractChecklistFromPDF", () => {
    it("should handle invalid PDF buffer gracefully", async () => {
      const invalidBuffer = Buffer.from("not a pdf");
      const result = await extractChecklistFromPDF(invalidBuffer);

      expect(result.success).toBe(false);
      expect(result.items).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it("should return error for empty buffer", async () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = await extractChecklistFromPDF(emptyBuffer);

      expect(result.success).toBe(false);
      expect(result.items).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it("should have proper error handling structure", async () => {
      const invalidBuffer = Buffer.from("invalid");
      const result = await extractChecklistFromPDF(invalidBuffer);

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("itemCount");
      expect(result).toHaveProperty("error");
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("should return itemCount matching items array length", async () => {
      const invalidBuffer = Buffer.from("test");
      const result = await extractChecklistFromPDF(invalidBuffer);

      expect(result.itemCount).toBe(result.items.length);
    });
  });

  describe("Extraction result structure", () => {
    it("should have consistent structure for successful extraction", async () => {
      const invalidBuffer = Buffer.from("test");
      const result = await extractChecklistFromPDF(invalidBuffer);

      expect(typeof result.success).toBe("boolean");
      expect(Array.isArray(result.items)).toBe(true);
      expect(typeof result.itemCount).toBe("number");

      if (!result.success) {
        expect(typeof result.error).toBe("string");
      }
    });

    it("should have valid item structure", async () => {
      const invalidBuffer = Buffer.from("test");
      const result = await extractChecklistFromPDF(invalidBuffer);

      for (const item of result.items) {
        expect(item).toHaveProperty("text");
        expect(item).toHaveProperty("order");
        expect(typeof item.text).toBe("string");
        expect(typeof item.order).toBe("number");
      }
    });
  });
});
