/**
 * PDF Proposal Extractor Service
 * Extracts checklist items from standardized proposal PDFs
 * Specifically designed for Bolted Iron Hub proposal format
 */

import { PDFParse } from "pdf-parse";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

interface ExtractedItem {
  text: string;
  order: number;
}

interface ExtractionResult {
  success: boolean;
  items: ExtractedItem[];
  itemCount: number;
  error?: string;
}

/**
 * Sanitize text to remove extra whitespace
 */
function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/[\n\r\t]+/g, " ") // Replace newlines/tabs with space
    .trim();
}

/**
 * Check if a line is a known non-item text that marks end of items section
 */
function isEndOfItemsMarker(text: string): boolean {
  const lower = text.toLowerCase();
  
  // These phrases mark the end of the items list
  const endMarkers = [
    "the pricing provided",
    "please review",
    "as part of the project",
    "total:",
    "bolted iron",
    "office@",
  ];

  return endMarkers.some((marker) => lower.includes(marker));
}

/**
 * Check if a line is purely numeric (quantity, rate, or total value)
 */
function isPurelyNumeric(text: string): boolean {
  const cleaned = text.trim();
  // Check if it's just a number, possibly with commas, decimals, dollar signs, or minus signs
  // This catches: 8, 16, 3,650.00, $41,665.00, -3,058.00, etc.
  return /^[-$]?[\d,]+\.?\d*$/.test(cleaned);
}

/**
 * Check if a line starts with a quantity number
 * (like "2 Beams" or "183" - these are likely quantities, not item names)
 */
function startsWithQuantity(text: string): boolean {
  const trimmed = text.trim();
  // Match lines that start with just a number (1-3 digits) followed by space or end
  // This catches quantity columns that got mixed in
  return /^\d{1,3}(\s|$)/.test(trimmed);
}

/**
 * Check if a line is a table header
 */
function isTableHeader(text: string): boolean {
  const lower = text.toLowerCase();
  const headers = ["description", "qty", "rate", "total", "amount"];
  return headers.some((h) => lower === h);
}

/**
 * Extract text from PDF buffer
 */
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: pdfBuffer });
    const textResult = await parser.getText();
    return textResult.text || "";
  } catch (error) {
    throw new Error(
      `Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Find and extract the relevant section (Fabrication and Installation OR Scope of Work)
 */
function findAndExtractSection(text: string): { items: string[]; sectionType: string } {
  const lines = text.split("\n");
  let inSection = false;
  let sectionType = "";
  const items: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase().trim();

    // Look for section headers
    if (lower.includes("fabrication") && lower.includes("installation")) {
      inSection = true;
      sectionType = "Fabrication and Installation";
      continue;
    }

    if (lower.includes("scope") && lower.includes("work")) {
      inSection = true;
      sectionType = "Scope of Work";
      continue;
    }

    if (inSection) {
      // Check if we've hit the end of items section
      if (isEndOfItemsMarker(line)) {
        break;
      }

      const sanitized = sanitizeText(line);

      // Skip empty lines
      if (!sanitized) continue;

      // Skip table headers
      if (isTableHeader(sanitized)) continue;

      // Skip purely numeric lines (quantities, rates, totals)
      if (isPurelyNumeric(sanitized)) continue;

      // Skip lines that start with a quantity number
      if (startsWithQuantity(sanitized)) continue;

      // Skip lines that are just "Estimate", "Date", "Name", etc. (metadata)
      const metadata = ["estimate", "date", "name", "address", "project", "description"];
      if (metadata.includes(lower)) continue;

      // Skip lines with only numbers and symbols (no letters)
      if (!/[a-zA-Z]/.test(sanitized)) continue;

      // This is a valid item
      items.push(sanitized);
    }
  }

  return { items, sectionType };
}

/**
 * Filter out non-item text that might have slipped through
 * (like "Discount", pricing notes that weren't caught by endOfItemsMarker)
 */
function filterValidItems(items: string[]): ExtractedItem[] {
  const validItems: ExtractedItem[] = [];
  const excludePatterns = [
    /^discount/i,
    /^subtotal/i,
    /^tax/i,
    /^total/i,
    /^the pricing/i,
    /^please/i,
    /^as part/i,
  ];

  let order = 0;
  for (const item of items) {
    // Skip if matches exclude patterns
    if (excludePatterns.some((pattern) => pattern.test(item))) {
      continue;
    }

    // Skip if purely numeric
    if (isPurelyNumeric(item)) {
      continue;
    }

    // Skip if starts with a quantity number
    if (startsWithQuantity(item)) {
      continue;
    }

    // Skip if item is too short (less than 3 characters)
    if (item.length < 3) {
      continue;
    }

    // Skip if item is too long (likely a paragraph, not an item)
    if (item.length > 200) {
      continue;
    }

    // Skip if item has no letters (only numbers and symbols)
    if (!/[a-zA-Z]/.test(item)) {
      continue;
    }

    validItems.push({
      text: item,
      order: order++,
    });
  }

  return validItems;
}

/**
 * Build an OpenAI client from env. Returns null when no key is configured
 * (so extraction falls back to the heuristic parser). Works with a real
 * OpenAI key (default endpoint) or any OpenAI-compatible base URL.
 */
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const baseURL = process.env.OPENAI_BASE_URL || process.env.OPENAI_API_BASE || undefined;
  return createOpenAI({ apiKey, baseURL });
}

/**
 * Use an LLM to read the proposal text and return ONLY the Description-column
 * work items, joining descriptions that wrap across multiple lines. Returns
 * null on any failure so the caller can fall back to the heuristic parser.
 */
async function extractItemsWithAI(fullText: string): Promise<string[] | null> {
  const openai = getOpenAIClient();
  if (!openai || !fullText.trim()) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  try {
    const { object } = await generateObject({
      model: openai.chat(model),
      temperature: 0,
      schema: z.object({
        items: z
          .array(z.string())
          .describe("Work-item descriptions from the Description column, in order"),
      }),
      prompt: `You are extracting a work-item checklist from a structural-steel construction proposal PDF.
The proposal has a table with columns: Description, Qty, Rate, Total. The text below was extracted from the PDF, so column alignment may be lost.

Return, as an ordered array of strings, ONLY the Description-column values of PRICED LINE ITEMS. Rules (follow strictly):
1. INCLUDE a description ONLY if that row has a Quantity and/or Rate and/or Total value beside it (i.e. it is an actual priced line item).
2. EXCLUDE any description that has NO Qty/Rate/Total value next to it — those are section headings or group labels, NOT checklist items. Examples to exclude: "Fabrication And Installation", "Scope Of Work", "Staircase A", "Staircase B".
3. Description text ONLY — NEVER include the quantity, rate, unit price, dollar amount or total in the item text (e.g. "157", "133.00", "20,881.00").
4. If one item's description wraps across multiple lines, JOIN it into a SINGLE item. Example: "Back Balcony Aluminum Railing - Standard" + "Design (powder coated)" becomes ONE item: "Back Balcony Aluminum Railing - Standard Design (powder coated)".
5. Exclude the column header row ("Description", "Qty", "Rate", "Total", "Amount").
6. Exclude summary/adjustment rows: "Discount", "Subtotal", "Tax", "Total", and any pricing notes, terms, addresses, phone numbers or contact lines.
7. Keep each description exactly as written — do not paraphrase, summarize, or add words. Preserve the original top-to-bottom order.

PDF TEXT:
"""
${fullText}
"""`,
    });
    return object.items.map((s) => s.trim()).filter((s) => s.length > 0);
  } catch (error) {
    console.error("[Proposal Extractor] AI extraction failed, falling back to heuristic:", error);
    return null;
  }
}

/**
 * Main extraction function
 * Takes a PDF buffer and extracts checklist items
 */
export async function extractChecklistFromPDF(
  pdfBuffer: Buffer
): Promise<ExtractionResult> {
  try {
    // Step 1: Extract text from PDF
    const fullText = await extractTextFromPDF(pdfBuffer);

    // Step 2 (primary): AI extraction — Description column only, multi-line aware.
    const aiItems = await extractItemsWithAI(fullText);
    if (aiItems && aiItems.length > 0) {
      return {
        success: true,
        items: aiItems.map((text, i) => ({ text, order: i })),
        itemCount: aiItems.length,
      };
    }

    // Step 2 (fallback): heuristic line parser when AI isn't configured/fails.
    const { items: rawItems, sectionType } = findAndExtractSection(fullText);

    if (!sectionType || rawItems.length === 0) {
      return {
        success: false,
        items: [],
        itemCount: 0,
        error:
          "Could not find 'Fabrication and Installation' or 'Scope of Work' section with items in PDF",
      };
    }

    // Step 3: Filter and validate items
    const validItems = filterValidItems(rawItems);

    if (validItems.length === 0) {
      return {
        success: false,
        items: [],
        itemCount: 0,
        error: `No valid checklist items found in the ${sectionType} section`,
      };
    }

    return {
      success: true,
      items: validItems,
      itemCount: validItems.length,
    };
  } catch (error) {
    console.error("[Proposal Extractor] Error:", error);
    return {
      success: false,
      items: [],
      itemCount: 0,
      error: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
