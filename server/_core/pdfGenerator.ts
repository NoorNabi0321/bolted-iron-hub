import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// ─── Weekly Checklist Progress Report ─────────────────────────────────────────
export interface ChecklistProgressReportOptions {
  weekStart: Date;
  weekEnd: Date;
  generatedAt: Date;
  projects: Array<{
    id: number;
    name: string;
    status: string;
    overallProgress: number;
    noChange: boolean;
    items: Array<{
      text: string;
      progress: number;
      isActive: boolean;
      isCompleted: boolean;
      /** true = added via Change Order / Add New Item; false = from the proposal PDF. */
      isUserAdded: boolean;
      /** Assigned subcontractor company name, or null when unassigned. */
      assignedTo: string | null;
      /** Progress delta since last week's report; null when there is no baseline. */
      change: number | null;
    }>;
  }>;
}

export async function generateChecklistProgressPDF(
  options: ChecklistProgressReportOptions
): Promise<Buffer> {
  const { weekStart, weekEnd, generatedAt, projects } = options;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 40;
  const contentWidth = pageWidth - 2 * margin;
  const tableRight = pageWidth - margin;

  const navy = rgb(23 / 255, 37 / 255, 70 / 255);
  const white = rgb(1, 1, 1);
  const green = rgb(22 / 255, 163 / 255, 74 / 255);
  const amber = rgb(202 / 255, 138 / 255, 4 / 255);
  const grey = rgb(148 / 255, 163 / 255, 184 / 255);
  const red = rgb(220 / 255, 38 / 255, 38 / 255);
  const textDark = rgb(30 / 255, 41 / 255, 59 / 255);
  const border = rgb(226 / 255, 232 / 255, 240 / 255);

  const sanitize = (text: unknown): string => {
    if (text === null || text === undefined) return "";
    return String(text)
      .split("")
      .map((ch) => {
        const c = ch.charCodeAt(0);
        if (c >= 32 && c <= 126) return ch;
        if (ch === "–" || ch === "—") return "-";
        if (ch === "’" || ch === "‘") return "'";
        if (ch === "“" || ch === "”") return '"';
        return "";
      })
      .join("");
  };

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const fitText = (text: string, f: typeof font, size: number, maxWidth: number) => {
    if (f.widthOfTextAtSize(text, size) <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && f.widthOfTextAtSize(t + "...", size) > maxWidth) t = t.slice(0, -1);
    return t + "...";
  };

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  const newPage = () => {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };
  const ensure = (needed: number) => {
    if (y - needed < margin) newPage();
  };

  // ── Report header ──
  page.drawText(sanitize("BOLTED IRON HUB"), { x: margin, y: y - 18, size: 20, font: bold, color: navy });
  y -= 26;
  page.drawText(sanitize("WEEKLY PROGRESS REPORT"), { x: margin, y: y - 14, size: 14, font: bold, color: navy });
  y -= 26;
  page.drawText(sanitize(`Report Week: ${fmtDate(weekStart)} - ${fmtDate(weekEnd)}`), { x: margin, y: y - 10, size: 9, font: bold, color: textDark });
  y -= 14;
  page.drawText(sanitize(`Generated: ${fmtDate(generatedAt)}`), { x: margin, y: y - 10, size: 9, font: bold, color: textDark });
  y -= 12;
  page.drawLine({ start: { x: margin, y }, end: { x: tableRight, y }, thickness: 1, color: border });
  y -= 18;

  if (projects.length === 0) {
    page.drawText(sanitize("No projects with an extracted proposal checklist yet."), { x: margin, y: y - 12, size: 11, font, color: textDark });
  }

  // Column geometry: # | Proposal Item | Assigned To | Current Progress | Change
  const colNumX = margin;
  const colNumW = 28;
  const colItemX = margin + colNumW;
  const assignedX = 240;
  const progCenter = 420;
  const changeLeft = 492;
  const changeCenter = changeLeft + (tableRight - changeLeft) / 2;

  let projNum = 0;
  for (const proj of projects) {
    projNum++;
    ensure(52);

    // Project header: number badge + name (+ overall progress badge)
    const badge = 20;
    const topY = y;
    page.drawRectangle({ x: margin, y: topY - badge, width: badge, height: badge, color: navy });
    const numStr = String(projNum);
    page.drawText(numStr, { x: margin + (badge - bold.widthOfTextAtSize(numStr, 11)) / 2, y: topY - badge + 6, size: 11, font: bold, color: white });

    let nameMaxW = contentWidth - badge - 10;
    if (!proj.noChange) {
      const opLabel = "OVERALL PROGRESS: ";
      const opVal = `${proj.overallProgress}%`;
      const opLabelW = font.widthOfTextAtSize(opLabel, 8);
      const opValW = bold.widthOfTextAtSize(opVal, 11);
      const boxW = opLabelW + opValW + 16;
      const boxX = tableRight - boxW;
      page.drawRectangle({ x: boxX, y: topY - badge - 1, width: boxW, height: badge + 2, color: white, borderColor: border, borderWidth: 1 });
      page.drawText(opLabel, { x: boxX + 8, y: topY - badge + 6, size: 8, font, color: grey });
      page.drawText(opVal, { x: boxX + 8 + opLabelW, y: topY - badge + 5, size: 11, font: bold, color: navy });
      nameMaxW = boxX - (margin + badge + 10) - 8;
    }
    page.drawText(fitText(sanitize(proj.name.toUpperCase()), bold, 12, nameMaxW), { x: margin + badge + 10, y: topY - badge + 5, size: 12, font: bold, color: navy });
    y = topY - badge - 14;

    // Collapsed project — single "No Change This Week" pill.
    if (proj.noChange) {
      ensure(26);
      const pill = "No Change This Week";
      const pillW = bold.widthOfTextAtSize(pill, 10) + 28;
      const pillX = margin + (contentWidth - pillW) / 2;
      page.drawRectangle({ x: pillX, y: y - 20, width: pillW, height: 22, color: rgb(17 / 255, 24 / 255, 39 / 255) });
      page.drawText(pill, { x: pillX + 14, y: y - 13, size: 10, font: bold, color: white });
      y -= 38;
      continue;
    }

    // Table header
    ensure(24);
    const thH = 18;
    page.drawRectangle({ x: margin, y: y - thH, width: contentWidth, height: thH, color: navy });
    page.drawText("#", { x: colNumX + (colNumW - bold.widthOfTextAtSize("#", 8)) / 2, y: y - 12, size: 8, font: bold, color: white });
    page.drawText("PROPOSAL ITEM", { x: colItemX + 6, y: y - 12, size: 8, font: bold, color: white });
    page.drawText("ASSIGNED TO", { x: assignedX, y: y - 12, size: 8, font: bold, color: white });
    page.drawText("CURRENT PROGRESS", { x: progCenter - bold.widthOfTextAtSize("CURRENT PROGRESS", 8) / 2, y: y - 12, size: 8, font: bold, color: white });
    page.drawText("CHANGE", { x: changeCenter - bold.widthOfTextAtSize("CHANGE", 8) / 2, y: y - 12, size: 8, font: bold, color: white });
    y -= thH;

    // Rows — every proposal item (active AND inactive).
    let idx = 0;
    for (const item of proj.items) {
      idx++;
      ensure(20);
      const rowH = 20;
      const midY = y - rowH / 2;
      const textY = midY - 3;
      page.drawText(String(idx), { x: colNumX + (colNumW - font.widthOfTextAtSize(String(idx), 9)) / 2, y: textY, size: 9, font, color: textDark });
      const itemMaxW = assignedX - 8 - (colItemX + 6);
      // Match the Extracted Checklist section: Change Order / Add New Item rows
      // are blue; proposal-extracted rows are the normal dark text.
      const itemColor = item.isUserAdded ? rgb(29 / 255, 78 / 255, 216 / 255) : textDark;
      page.drawText(fitText(sanitize(item.text), font, 9, itemMaxW), {
        x: colItemX + 6,
        y: textY,
        size: 9,
        font: item.isUserAdded ? bold : font,
        color: itemColor,
      });
      // Assigned subcontractor (or a dash when unassigned)
      const assignedMaxW = progCenter - 48 - assignedX;
      if (item.assignedTo) {
        page.drawText(fitText(sanitize(item.assignedTo), font, 9, assignedMaxW), { x: assignedX, y: textY, size: 9, font, color: textDark });
      } else {
        page.drawLine({ start: { x: assignedX, y: midY }, end: { x: assignedX + 8, y: midY }, thickness: 1.1, color: grey });
      }
      // status dot + progress %
      const isDone = item.isCompleted || item.progress >= 100;
      const isZero = !item.isActive || item.progress <= 0;
      const stColor = isDone ? green : isZero ? grey : amber;
      page.drawEllipse({ x: progCenter - 24, y: midY, xScale: 3.5, yScale: 3.5, color: stColor });
      page.drawText(`${item.progress}%`, { x: progCenter - 12, y: textY, size: 9, font: bold, color: stColor });
      // change delta or dash
      if (item.change === null || item.change === 0) {
        page.drawLine({ start: { x: changeCenter - 5, y: midY }, end: { x: changeCenter + 5, y: midY }, thickness: 1.3, color: grey });
      } else {
        const up = item.change > 0;
        const chText = `${up ? "+" : ""}${item.change}%`;
        page.drawText(chText, { x: changeCenter - bold.widthOfTextAtSize(chText, 9) / 2 + 3, y: textY, size: 9, font: bold, color: up ? green : red });
      }
      page.drawLine({ start: { x: margin, y: y - rowH }, end: { x: tableRight, y: y - rowH }, thickness: 0.5, color: border });
      y -= rowH;
    }
    y -= 16;
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

export interface ScheduleData {
  date: Date;
  dayName: string;
  projects: Array<{
    id: string;
    name: string;
    address: string;
    status: string;
    isUrgent: boolean;
    startTime: string | null; // HH:MM format
    estimatedEndTime: string | null; // HH:MM format
    subcontractors: Array<{
      id: string;
      companyName: string;
    }>;
  }>;
}

export interface PDFReportOptions {
  scheduleData: ScheduleData[];
  weekStart: Date;
  weekEnd: Date;
  generatedAt: Date;
  uniqueProjectCount?: number; // Number of unique projects (not counting duplicates across days)
}

const STATUS_COLORS: Record<string, { r: number; g: number; b: number }> = {
  "shop-drawings": { r: 30, g: 64, b: 175 },
  fabrication: { r: 146, g: 64, b: 14 },
  "on-site": { r: 146, g: 64, b: 14 },
  installed: { r: 22, g: 101, b: 52 },
  "inspection-passed": { r: 22, g: 101, b: 52 },
};

const STATUS_BG_COLORS: Record<string, { r: number; g: number; b: number }> = {
  "shop-drawings": { r: 219, g: 234, b: 254 },
  fabrication: { r: 254, g: 243, b: 199 },
  "on-site": { r: 254, g: 215, b: 170 },
  installed: { r: 220, g: 252, b: 231 },
  "inspection-passed": { r: 220, g: 252, b: 231 },
};

// Helper to convert 24-hour format to 12-hour format with AM/PM
const convert24To12Hour = (time24: string): string => {
  if (!time24 || time24 === "-") return "-";
  
  try {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12; // Convert 0 to 12 for midnight
    return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
  } catch {
    return time24; // Return original if conversion fails
  }
};

// Helper to convert 0-255 RGB to 0-1 normalized RGB for pdf-lib
const normalizeColor = (color: { r: number; g: number; b: number }) => {
  return {
    r: color.r / 255,
    g: color.g / 255,
    b: color.b / 255,
  };
};

export async function generateSchedulePDF(
  options: PDFReportOptions
): Promise<Buffer> {
  const { scheduleData, weekStart, weekEnd, generatedAt } = options;

  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page dimensions
  const pageWidth = 595; // A4 width in points
  const pageHeight = 842; // A4 height in points
  const margin = 40;
  const contentWidth = pageWidth - 2 * margin;

  // Helper to sanitize text - remove ALL non-ASCII characters
  const sanitize = (text: string): string => {
    if (!text) return '';
    return text
      .split('')
      .map(char => {
        const code = char.charCodeAt(0);
        // Keep only ASCII printable characters (32-126)
        if (code >= 32 && code <= 126) return char;
        // Replace common Unicode with ASCII equivalents
        if (char === '\u2013' || char === '\u2014') return '-'; // en-dash, em-dash
        if (char === '\u2019' || char === '\u2018') return "'"; // smart quotes
        if (char === '\u201C' || char === '\u201D') return '"'; // smart double quotes
        if (char === '\u2605') return '★'; // Star symbol for urgent projects
        return ''; // Remove everything else
      })
      .join('')
      .trim()
      .substring(0, 150);
  };

  // Helper to format dates
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper to format datetime
  const formatDateTime = (date: Date): string => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Add header and metadata to page
  const addHeader = (page: any, pageNum: number, totalPages: number) => {
    let y = pageHeight - margin;

    // Title
    page.drawText(sanitize("Bolted Iron Hub"), {
      x: margin,
      y,
      size: 28,
      font: helveticaBold,
      color: rgb(220 / 255, 38 / 255, 38 / 255), // Red
    });
    y -= 35;

    // Red line
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 3,
      color: rgb(220 / 255, 38 / 255, 38 / 255), // Red
    });
    y -= 15;

    // Subtitle
    page.drawText(sanitize("Weekly Schedule Report"), {
      x: margin,
      y,
      size: 16,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    y -= 25;

    return y;
  };

  // Add metadata table as 2-column table
  const addMetadata = (page: any, y: number): number => {
    // Use uniqueProjectCount if provided (counts unique projects), otherwise sum all day projects (includes duplicates)
    console.log('[PDF Generator] options.uniqueProjectCount:', options.uniqueProjectCount);
    console.log('[PDF Generator] scheduleData days:', scheduleData.length);
    const totalProjects = options.uniqueProjectCount ?? scheduleData.reduce((sum, day) => sum + day.projects.length, 0);
    console.log('[PDF Generator] Final totalProjects:', totalProjects);
    const rowHeight = 20;
    const labelColWidth = 150;
    const valueColWidth = contentWidth - labelColWidth - 2;

    const metadata = [
      { label: sanitize("Week Duration"), value: sanitize(`${formatDate(weekStart)} - ${formatDate(weekEnd)}`) },
      { label: sanitize("Total Projects"), value: sanitize(totalProjects.toString()) },
      { label: sanitize("Export Date"), value: sanitize(formatDateTime(generatedAt)) },
      { label: sanitize("Report Period"), value: sanitize("7 days") },
    ];

    const tableHeight = metadata.length * rowHeight;

    // Draw table header
    page.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: contentWidth,
      height: rowHeight,
      color: rgb(220 / 255, 38 / 255, 38 / 255), // Red
    });

    page.drawText(sanitize("Metric"), {
      x: margin + 5,
      y: y - 15,
      size: 10,
      font: helveticaBold,
      color: rgb(1, 1, 1), // White
    });

    page.drawText(sanitize("Value"), {
      x: margin + labelColWidth + 5,
      y: y - 15,
      size: 10,
      font: helveticaBold,
      color: rgb(1, 1, 1), // White
    });

    y -= rowHeight;

    // Draw table rows
    metadata.forEach((item, index) => {
      // Alternate row background
      if (index % 2 === 0) {
        page.drawRectangle({
          x: margin,
          y: y - rowHeight,
          width: contentWidth,
          height: rowHeight,
          color: rgb(249 / 255, 250 / 255, 251 / 255), // Light gray
        });
      }

      // Border
      page.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: contentWidth,
        height: rowHeight,
        borderColor: rgb(229 / 255, 231 / 255, 235 / 255), // Light border
        borderWidth: 0.5,
      });

      // Label column
      page.drawText(item.label, {
        x: margin + 5,
        y: y - 15,
        size: 10,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });

      // Value column
      page.drawText(item.value, {
        x: margin + labelColWidth + 5,
        y: y - 15,
        size: 10,
        font: helvetica,
        color: rgb(0, 0, 0),
      });

      y -= rowHeight;
    });

    return y - 20;
  };

  // Add table header
  const addTableHeader = (page: any, y: number): number => {
    const headerHeight = 25;
    const headerBg = { r: 220, g: 38, b: 38 };
    const headerText = { r: 255, g: 255, b: 255 };

    page.drawRectangle({
      x: margin,
      y: y - headerHeight,
      width: contentWidth,
      height: headerHeight,
      color: rgb(headerBg.r / 255, headerBg.g / 255, headerBg.b / 255), // Red header
    });

    const columns = [
      { label: sanitize("Date"), width: 70 },
      { label: sanitize("Day"), width: 60 },
      { label: sanitize("Project Name"), width: 120 },
      { label: sanitize("Address"), width: 100 },
      { label: sanitize("Time Duration"), width: 100 },
      { label: sanitize("Status"), width: 80 },
    ];

    let x = margin + 5;
    columns.forEach((col) => {
      page.drawText(sanitize(col.label), {
        x,
        y: y - 18,
        size: 10,
        font: helveticaBold,
        color: rgb(headerText.r / 255, headerText.g / 255, headerText.b / 255), // White text
      });
      x += col.width;
    });

    return y - headerHeight - 5;
  };

  // Add table row
  const addTableRow = (page: any, y: number, data: any): number => {
    const rowHeight = 20;
    const columns = [
      { key: "date", width: 70 },
      { key: "day", width: 60 },
      { key: "name", width: 120 },
      { key: "address", width: 100 },
      { key: "timeDuration", width: 100 },
      { key: "status", width: 80 },
    ];

    // Alternate row background - Yellow for urgent, light gray for normal
    if (data.isUrgent) {
      page.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: rgb(254 / 255, 243 / 255, 199 / 255), // Yellow background for urgent
      });
    } else if (data.rowNum % 2 === 0) {
      page.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: rgb(249 / 255, 250 / 255, 251 / 255), // Light gray
      });
    }

    // Border
    page.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: contentWidth,
      height: rowHeight,
      borderColor: rgb(229 / 255, 231 / 255, 235 / 255), // Light border
      borderWidth: 0.5,
    });

    let x = margin + 5;
    columns.forEach((col) => {
      if (col.key === "timeDuration") {
        // Display start and end times vertically (converted to 12-hour format)
        const startTime = convert24To12Hour(data.startTime || "-");
        const endTime = convert24To12Hour(data.estimatedEndTime || "-");
        
        page.drawText(sanitize(startTime), {
          x,
          y: y - 10,
          size: 8,
          font: helvetica,
          color: rgb(0, 0, 0),
        });
        
        page.drawText(sanitize(endTime), {
          x,
          y: y - 18,
          size: 8,
          font: helvetica,
          color: rgb(0, 0, 0),
        });
      } else {
        let value = sanitize(data[col.key] || "-");
        // Add asterisk after project name for urgent projects
        if (col.key === "name" && data.isUrgent) {
          value = value + " *";
        }
        const textColor = (col.key === "name" && data.isUrgent) 
          ? rgb(180 / 255, 83 / 255, 9 / 255) // Orange-brown for urgent project names
          : rgb(0, 0, 0); // Black for normal text
        page.drawText(value, {
          x,
          y: y - 15,
          size: 9,
          font: helvetica,
          color: textColor,
        });
      }
      x += col.width;
    });

    return y - rowHeight;
  };

  // Add footer
  const addFooter = (page: any, pageNum: number, totalPages: number) => {
    const footerY = 30;

    page.drawLine({
      start: { x: margin, y: footerY + 10 },
      end: { x: pageWidth - margin, y: footerY + 10 },
      thickness: 0.5,
      color: rgb(229 / 255, 231 / 255, 235 / 255), // Light border
    });

    page.drawText(sanitize("Generated from Bolted Iron Hub System"), {
      x: margin,
      y: footerY,
      size: 9,
      font: helvetica,
      color: rgb(107 / 255, 114 / 255, 128 / 255),
    });

    page.drawText(sanitize("This is a confidential report. Please handle appropriately."), {
      x: margin,
      y: footerY - 12,
      size: 8,
      font: helvetica,
      color: rgb(107 / 255, 114 / 255, 128 / 255),
    });

    const pageText = `Page ${pageNum} of ${totalPages}`;
    page.drawText(sanitize(pageText), {
      x: pageWidth - margin - 50,
      y: footerY,
      size: 9,
      font: helvetica,
      color: rgb(107 / 255, 114 / 255, 128 / 255),
    });
  };

  // Calculate total pages needed
  const rowsPerPage = 20; // Approximate rows per page
  const totalRows = scheduleData.reduce((sum, day) => sum + Math.max(1, day.projects.length), 0);
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;

  // Generate pages
  let currentPage = 1;
  let rowsOnCurrentPage = 0;
  let currentY = 0;
  let page = pdfDoc.addPage([pageWidth, pageHeight]);

  currentY = addHeader(page, currentPage, totalPages);
  
  // Add metadata only on first page
  if (currentPage === 1) {
    currentY = addMetadata(page, currentY);
  }

  currentY = addTableHeader(page, currentY);

  // Add data rows - filter out days with no projects
  let rowNum = 0;
  for (const dayData of scheduleData) {
    // Skip days with no projects
    if (dayData.projects.length === 0) {
      continue;
    } else {
      // Projects on this day
      for (const project of dayData.projects) {
        if (currentY < 80) {
          addFooter(page, currentPage, totalPages);
          currentPage++;
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = addHeader(page, currentPage, totalPages);
          currentY = addTableHeader(page, currentY);
          rowsOnCurrentPage = 0;
        }

        currentY = addTableRow(page, currentY, {
          date: sanitize(formatDate(dayData.date)),
          day: sanitize(dayData.dayName),
          name: sanitize(project.name),
          address: sanitize(project.address || "-"),
          startTime: project.startTime || "-",
          estimatedEndTime: project.estimatedEndTime || "-",
          status: sanitize(project.status),
          isUrgent: project.isUrgent,
          rowNum,
        });
        rowNum++;
        rowsOnCurrentPage++;
      }
    }
  }



  // Add footer to last page
  addFooter(page, currentPage, totalPages);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}


// Projects List PDF Generation
export interface ProjectsListData {
  id: string;
  name: string;
  status: string;
  isUrgent: boolean;
  subcontractors: Array<{
    id: string;
    companyName: string;
  }>;
  startDate: Date | null;
  estimatedEndDate: Date | null;
  startTime: string | null; // HH:MM format
  estimatedEndTime: string | null; // HH:MM format
}

export interface ProjectsListPDFOptions {
  projects: ProjectsListData[];
  generatedAt: Date;
  filterSummary: string;
  exportNote?: string;
}

export async function generateProjectsListPDF(
  options: ProjectsListPDFOptions
): Promise<Buffer> {
  const { projects, generatedAt, filterSummary, exportNote } = options;

  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page dimensions
  const pageWidth = 595; // A4 width in points
  const pageHeight = 842; // A4 height in points
  const margin = 40;
  const contentWidth = pageWidth - 2 * margin;

  // Helper to sanitize text
  const sanitize = (text: string): string => {
    if (!text) return '';
    return text
      .split('')
      .map(char => {
        const code = char.charCodeAt(0);
        if (code >= 32 && code <= 126) return char;
        if (char === '\u2013' || char === '\u2014') return '-';
        if (char === '\u2019' || char === '\u2018') return "'";
        if (char === '\u201C' || char === '\u201D') return '"';
        if (char === '\u2605') return '★'; // Star symbol for urgent projects
        return '';
      })
      .join('')
      .trim()
      .substring(0, 150);
  };

  // Helper to format dates
  const formatDate = (date: Date | null): string => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper to get day name
  const getDayName = (date: Date | null): string => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
  };

  // Helper to format datetime
  const formatDateTime = (date: Date): string => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Add header
  const addHeader = (page: any, pageNum: number, totalPages: number) => {
    let y = pageHeight - margin;

    // Title
    page.drawText(sanitize("Bolted Iron Hub"), {
      x: margin,
      y,
      size: 28,
      font: helveticaBold,
      color: rgb(220 / 255, 38 / 255, 38 / 255), // Red
    });
    y -= 35;

    // Red line
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 3,
      color: rgb(220 / 255, 38 / 255, 38 / 255), // Red
    });
    y -= 15;

    // Subtitle
    page.drawText(sanitize("Projects List Report"), {
      x: margin,
      y,
      size: 16,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    y -= 25;

    return y;
  };

  // Add metadata table
  const addMetadata = (page: any, y: number): number => {
    const rowHeight = 20;
    const labelColWidth = 150;
    const valueColWidth = contentWidth - labelColWidth - 2;

    const metadata = [
      { label: sanitize("Total Projects"), value: sanitize(projects.length.toString()) },
      { label: sanitize("Export Date"), value: sanitize(formatDateTime(generatedAt)) },
      { label: sanitize("Filters Applied"), value: sanitize(filterSummary) },
    ];

    const tableHeight = metadata.length * rowHeight;

    // Draw table header
    page.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: contentWidth,
      height: rowHeight,
      color: rgb(220 / 255, 38 / 255, 38 / 255), // Red
    });

    page.drawText(sanitize("Metric"), {
      x: margin + 5,
      y: y - 15,
      size: 10,
      font: helveticaBold,
      color: rgb(1, 1, 1), // White
    });

    page.drawText(sanitize("Value"), {
      x: margin + labelColWidth + 5,
      y: y - 15,
      size: 10,
      font: helveticaBold,
      color: rgb(1, 1, 1), // White
    });

    y -= rowHeight;

    // Draw table rows
    metadata.forEach((item, index) => {
      // Alternate row background
      if (index % 2 === 0) {
        page.drawRectangle({
          x: margin,
          y: y - rowHeight,
          width: contentWidth,
          height: rowHeight,
          color: rgb(249 / 255, 250 / 255, 251 / 255), // Light gray
        });
      }

      // Border
      page.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: contentWidth,
        height: rowHeight,
        borderColor: rgb(229 / 255, 231 / 255, 235 / 255), // Light border
        borderWidth: 0.5,
      });

      // Label column
      page.drawText(item.label, {
        x: margin + 5,
        y: y - 15,
        size: 10,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });

      // Value column
      page.drawText(item.value, {
        x: margin + labelColWidth + 5,
        y: y - 15,
        size: 10,
        font: helvetica,
        color: rgb(0, 0, 0),
      });

      y -= rowHeight;
    });

    return y - 20;
  };

  // Add table header for projects
  const addProjectsTableHeader = (page: any, y: number): number => {
    const headerHeight = 25;
    const headerBg = { r: 220, g: 38, b: 38 };

    page.drawRectangle({
      x: margin,
      y: y - headerHeight,
      width: contentWidth,
      height: headerHeight,
      color: rgb(headerBg.r / 255, headerBg.g / 255, headerBg.b / 255), // Red header
    });

    const columns = [
      { label: sanitize("Project Name"), width: 130 },
      { label: sanitize("Status"), width: 90 },
      { label: sanitize("Time Duration"), width: 100 },
      { label: sanitize("Start Date"), width: 80 },
      { label: sanitize("Est. End"), width: 80 },
    ];

    let x = margin + 5;
    columns.forEach(col => {
      page.drawText(col.label, {
        x,
        y: y - 15,
        size: 9,
        font: helveticaBold,
        color: rgb(1, 1, 1), // White
      });
      x += col.width;
    });

    return y - headerHeight;
  };

  // Add footer
  const addFooter = (page: any, pageNum: number, totalPages: number) => {
    const footerY = 30;

    page.drawLine({
      start: { x: margin, y: footerY + 10 },
      end: { x: pageWidth - margin, y: footerY + 10 },
      thickness: 0.5,
      color: rgb(229 / 255, 231 / 255, 235 / 255), // Light border
    });

    page.drawText(sanitize("Generated from Bolted Iron Hub System"), {
      x: margin,
      y: footerY,
      size: 9,
      font: helvetica,
      color: rgb(107 / 255, 114 / 255, 128 / 255),
    });

    page.drawText(sanitize("This is a confidential report. Please handle appropriately."), {
      x: margin,
      y: footerY - 12,
      size: 8,
      font: helvetica,
      color: rgb(107 / 255, 114 / 255, 128 / 255),
    });

    const pageText = `Page ${pageNum} of ${totalPages}`;
    page.drawText(sanitize(pageText), {
      x: pageWidth - margin - 50,
      y: footerY,
      size: 9,
      font: helvetica,
      color: rgb(107 / 255, 114 / 255, 128 / 255),
    });
  };

  // Add projects table rows
  const addProjectsTableRows = (page: any, y: number, projectsToAdd: ProjectsListData[], pageRef: any): number => {
    const rowHeight = 20;
    const columns = [
      { width: 130 },
      { width: 90 },
      { width: 100 },
      { width: 80 },
      { width: 80 },
    ];
    let currentPage = pageRef.current;

    projectsToAdd.forEach((project, index) => {
      // Check if we need a new page
      if (y - rowHeight < margin + 50) {
        addFooter(currentPage, 0, 0);
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        pageRef.current = currentPage;
        y = addHeader(currentPage, 0, 0);
        y = addProjectsTableHeader(currentPage, y);
      }

      // Alternate row background - Yellow for urgent, light gray for normal
      if (project.isUrgent) {
        currentPage.drawRectangle({
          x: margin,
          y: y - rowHeight,
          width: contentWidth,
          height: rowHeight,
          color: rgb(254 / 255, 243 / 255, 199 / 255), // Yellow background for urgent
        });
      } else if (index % 2 === 0) {
        currentPage.drawRectangle({
          x: margin,
          y: y - rowHeight,
          width: contentWidth,
          height: rowHeight,
          color: rgb(249 / 255, 250 / 255, 251 / 255), // Light gray
        });
      }

      // Border
      currentPage.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: contentWidth,
        height: rowHeight,
        borderColor: rgb(229 / 255, 231 / 255, 235 / 255), // Light border
        borderWidth: 0.5,
      });

      // Project Name with asterisk for urgent projects (★ not supported by WinAnsi)
      const projectNameDisplay = project.isUrgent ? `${project.name} *` : project.name;
      currentPage.drawText(sanitize(projectNameDisplay), {
        x: margin + 5,
        y: y - 15,
        size: 9,
        font: helvetica,
        color: project.isUrgent ? rgb(180 / 255, 83 / 255, 9 / 255) : rgb(0, 0, 0), // Orange-brown for urgent
      });

      // Status
      currentPage.drawText(sanitize(project.status), {
        x: margin + columns[0].width + 5,
        y: y - 15,
        size: 9,
        font: helvetica,
        color: rgb(0, 0, 0),
      });

      // Time Duration (converted to 12-hour format)
      const startTime = convert24To12Hour(project.startTime || "-");
      const endTime = convert24To12Hour(project.estimatedEndTime || "-");
      currentPage.drawText(sanitize(startTime), {
        x: margin + columns[0].width + columns[1].width + 5,
        y: y - 10,
        size: 8,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      currentPage.drawText(sanitize(endTime), {
        x: margin + columns[0].width + columns[1].width + 5,
        y: y - 18,
        size: 8,
        font: helvetica,
        color: rgb(0, 0, 0),
      });

      // Start Date with day name
      const startDateStr = formatDate(project.startDate);
      const startDayName = getDayName(project.startDate);
      currentPage.drawText(sanitize(startDateStr), {
        x: margin + columns[0].width + columns[1].width + columns[2].width + 5,
        y: y - 10,
        size: 8,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      if (startDayName) {
        currentPage.drawText(sanitize(startDayName), {
          x: margin + columns[0].width + columns[1].width + columns[2].width + 5,
          y: y - 18,
          size: 7,
          font: helvetica,
          color: rgb(107 / 255, 114 / 255, 128 / 255), // Muted color
        });
      }

      // Est. End Date with day name
      const endDateStr = formatDate(project.estimatedEndDate);
      const endDayName = getDayName(project.estimatedEndDate);
      currentPage.drawText(sanitize(endDateStr), {
        x: margin + columns[0].width + columns[1].width + columns[2].width + columns[3].width + 5,
        y: y - 10,
        size: 8,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      if (endDayName) {
        currentPage.drawText(sanitize(endDayName), {
          x: margin + columns[0].width + columns[1].width + columns[2].width + columns[3].width + 5,
          y: y - 18,
          size: 7,
          font: helvetica,
          color: rgb(107 / 255, 114 / 255, 128 / 255), // Muted color
        });
      }

      y -= rowHeight;
    });

    pageRef.current = currentPage;
    return y;
  };

  // Create first page
  const page1 = pdfDoc.addPage([pageWidth, pageHeight]);
  const pageRef = { current: page1 };
  let y = addHeader(page1, 1, 1);
  y = addMetadata(page1, y);
  y -= 20;
  y = addProjectsTableHeader(page1, y);
  y = addProjectsTableRows(page1, y, projects, pageRef);

  // Add footer to last page
  addFooter(pageRef.current, 1, 1);

  // Convert PDF to buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
