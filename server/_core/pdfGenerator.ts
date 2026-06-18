import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

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


// ─── Weekly Progress Report PDF ───────────────────────────────────────────────
export interface ProgressReportData {
  projects: Array<{
    id: number;
    name: string;
    status: string;
    totalItems: number;
    completedItems: number;
    progressPercentage: number;
  }>;
  weekStart: Date;
  weekEnd: Date;
  totalProjects: number;
  totalItems: number;
  totalCompleted: number;
  generatedAt: Date;
}

export async function generateProgressReportPDF(
  data: ProgressReportData
): Promise<Buffer> {
  const { projects, weekStart, weekEnd, totalProjects, totalItems, totalCompleted, generatedAt } = data;

  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page dimensions
  const pageWidth = 595; // A4 width in points
  const pageHeight = 842; // A4 height in points
  const margin = 40;
  const contentWidth = pageWidth - 2 * margin;

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
        return '';
      })
      .join('')
      .trim()
      .substring(0, 150);
  };

  const normalizeColor = (color: { r: number; g: number; b: number }) => {
    return {
      r: color.r / 255,
      g: color.g / 255,
      b: color.b / 255,
    };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const addHeader = (page: PDFPage, pageNum: number) => {
    const y = pageHeight - margin;
    
    // Title
    page.drawText('BOLTED IRON HUB', {
      x: margin,
      y: y - 20,
      size: 24,
      font: helveticaBold,
      color: normalizeColor({ r: 220, g: 38, b: 38 }),
    });

    page.drawText('Weekly Project Progress Report', {
      x: margin,
      y: y - 45,
      size: 14,
      font: helveticaBold,
      color: normalizeColor({ r: 0, g: 0, b: 0 }),
    });

    // Horizontal line
    page.drawLine({
      start: { x: margin, y: y - 50 },
      end: { x: pageWidth - margin, y: y - 50 },
      thickness: 1,
      color: normalizeColor({ r: 200, g: 200, b: 200 }),
    });

    return y - 70;
  };

  const addMetadata = (page: PDFPage, startY: number) => {
    let y = startY;
    const labelWidth = 150;
    const labelColor = normalizeColor({ r: 100, g: 100, b: 100 });
    const valueColor = normalizeColor({ r: 0, g: 0, b: 0 });

    const metadata = [
      { label: 'Report Period:', value: `${formatDate(weekStart)} - ${formatDate(weekEnd)}` },
      { label: 'Generated:', value: formatDate(generatedAt) },
      { label: 'Total Projects:', value: totalProjects.toString() },
      { label: 'Total Items:', value: totalItems.toString() },
      { label: 'Completed Items:', value: totalCompleted.toString() },
      { label: 'Overall Progress:', value: `${totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0}%` },
    ];

    metadata.forEach(({ label, value }) => {
      page.drawText(label, {
        x: margin,
        y,
        size: 10,
        font: helveticaBold,
        color: labelColor,
      });

      page.drawText(value, {
        x: margin + labelWidth,
        y,
        size: 10,
        font: helvetica,
        color: valueColor,
      });

      y -= 18;
    });

    return y - 10;
  };

  const addProjectsTable = (page: PDFPage, startY: number) => {
    let y = startY;
    const rowHeight = 50;
    const colWidths = {
      name: contentWidth * 0.35,
      status: contentWidth * 0.15,
      items: contentWidth * 0.15,
      progress: contentWidth * 0.35,
    };

    // Table header
    const headerY = y;
    const headerColor = normalizeColor({ r: 220, g: 38, b: 38 });
    const headerBgColor = normalizeColor({ r: 255, g: 240, b: 240 });

    page.drawRect({
      x: margin,
      y: headerY - 25,
      width: contentWidth,
      height: 25,
      color: headerBgColor,
      borderColor: normalizeColor({ r: 200, g: 200, b: 200 }),
      borderWidth: 1,
    });

    let x = margin + 5;
    const headers = ['Project Name', 'Status', 'Items', 'Progress'];
    headers.forEach((header, i) => {
      const width = i === 0 ? colWidths.name : i === 1 ? colWidths.status : i === 2 ? colWidths.items : colWidths.progress;
      page.drawText(header, {
        x,
        y: headerY - 18,
        size: 9,
        font: helveticaBold,
        color: headerColor,
      });
      x += width;
    });

    y -= 35;

    // Table rows
    projects.forEach((project) => {
      if (y < margin + 100) {
        // Add new page if needed
        const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin - 20;
        page = newPage;
      }

      // Row background
      page.drawRect({
        x: margin,
        y: y - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: normalizeColor({ r: 255, g: 255, b: 255 }),
        borderColor: normalizeColor({ r: 230, g: 230, b: 230 }),
        borderWidth: 1,
      });

      // Project name
      page.drawText(sanitize(project.name), {
        x: margin + 5,
        y: y - 15,
        size: 9,
        font: helvetica,
        color: normalizeColor({ r: 0, g: 0, b: 0 }),
        maxWidth: colWidths.name - 10,
      });

      // Status
      page.drawText(sanitize(project.status), {
        x: margin + colWidths.name + 5,
        y: y - 15,
        size: 9,
        font: helvetica,
        color: normalizeColor({ r: 0, g: 0, b: 0 }),
      });

      // Items count
      page.drawText(`${project.completedItems}/${project.totalItems}`, {
        x: margin + colWidths.name + colWidths.status + 5,
        y: y - 15,
        size: 9,
        font: helvetica,
        color: normalizeColor({ r: 0, g: 0, b: 0 }),
      });

      // Progress bar
      const progressX = margin + colWidths.name + colWidths.status + colWidths.items + 5;
      const progressWidth = colWidths.progress - 10;
      const progressHeight = 8;

      // Background bar
      page.drawRect({
        x: progressX,
        y: y - 20,
        width: progressWidth,
        height: progressHeight,
        color: normalizeColor({ r: 230, g: 230, b: 230 }),
        borderColor: normalizeColor({ r: 200, g: 200, b: 200 }),
        borderWidth: 0.5,
      });

      // Progress fill
      const fillWidth = (progressWidth * project.progressPercentage) / 100;
      page.drawRect({
        x: progressX,
        y: y - 20,
        width: fillWidth,
        height: progressHeight,
        color: normalizeColor({ r: 34, g: 197, b: 94 }),
      });

      // Progress percentage
      page.drawText(`${project.progressPercentage}%`, {
        x: progressX + progressWidth + 5,
        y: y - 18,
        size: 8,
        font: helveticaBold,
        color: normalizeColor({ r: 34, g: 197, b: 94 }),
      });

      y -= rowHeight;
    });

    return y;
  };

  const addFooter = (page: PDFPage) => {
    const footerY = margin - 10;
    const pageNum = pdfDoc.getPages().length;

    page.drawText(`Generated on ${formatDate(new Date())} | Page ${pageNum}`, {
      x: margin,
      y: footerY,
      size: 8,
      font: helvetica,
      color: normalizeColor({ r: 150, g: 150, b: 150 }),
    });

    page.drawText('Bolted Iron Hub - Project Management System', {
      x: pageWidth - margin - 200,
      y: footerY,
      size: 8,
      font: helvetica,
      color: normalizeColor({ r: 150, g: 150, b: 150 }),
    });
  };

  // Create first page
  const page1 = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = addHeader(page1, 1);
  y = addMetadata(page1, y);
  y -= 20;
  addProjectsTable(page1, y);

  // Add footer to all pages
  pdfDoc.getPages().forEach((page) => {
    addFooter(page);
  });

  // Convert PDF to buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}


// Project Progress Report PDF Generator - Matching Weekly Schedule Export Style
export interface ProjectProgressData {
  name: string;
  status: string;
  totalItems: number;
  completedItems: number;
  progressPercentage: number;
}

export interface ProjectProgressReportOptions {
  projects: ProjectProgressData[];
  weekStart: Date;
  weekEnd: Date;
  totalProjects: number;
  totalItems: number;
  totalCompleted: number;
  generatedAt: Date;
}

export async function generateProjectProgressPDF(
  options: ProjectProgressReportOptions
): Promise<Buffer> {
  const { projects, weekStart, weekEnd, totalProjects, totalItems, totalCompleted, generatedAt } = options;

  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page dimensions
  const pageWidth = 595; // A4 width in points
  const pageHeight = 842; // A4 height in points
  const margin = 40;
  const contentWidth = pageWidth - 2 * margin;

  // Helper to sanitize text
  const sanitize = (text: unknown): string => {
    if (text === null || text === undefined) return '';
    const str = String(text);
    return str
      .split('')
      .map(char => {
        const code = char.charCodeAt(0);
        if (code >= 32 && code <= 126) return char;
        if (char === '\u2013' || char === '\u2014') return '-';
        if (char === '\u2019' || char === '\u2018') return "'";
        if (char === '\u201C' || char === '\u201D') return '"';
        return '';
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
    page.drawText(sanitize("Project Progress Report"), {
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
    const rowHeight = 20;
    const labelColWidth = 150;
    const valueColWidth = contentWidth - labelColWidth - 2;

    const metadata = [
      { label: sanitize("Week Duration"), value: sanitize(`${formatDate(weekStart)} - ${formatDate(weekEnd)}`) },
      { label: sanitize("Total Projects"), value: sanitize(totalProjects.toString()) },
      { label: sanitize("Total Checklist Items"), value: sanitize(totalItems.toString()) },
      { label: sanitize("Completed Items"), value: sanitize(totalCompleted.toString()) },
      { label: sanitize("Overall Progress"), value: sanitize(`${totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0}%`) },
      { label: sanitize("Export Date"), value: sanitize(formatDateTime(generatedAt)) },
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
      { label: sanitize("Project Name"), width: 180 },
      { label: sanitize("Status"), width: 100 },
      { label: sanitize("Items"), width: 80 },
      { label: sanitize("Completed"), width: 80 },
      { label: sanitize("Progress"), width: 75 },
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

  // Add table row with progress bar
  const addTableRow = (page: any, y: number, data: any, rowNum: number): number => {
    const rowHeight = 25;
    const columns = [
      { key: "name", width: 180 },
      { key: "status", width: 100 },
      { key: "totalItems", width: 80 },
      { key: "completedItems", width: 80 },
      { key: "progressPercentage", width: 75 },
    ];

    // Alternate row background
    if (rowNum % 2 === 0) {
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
      if (col.key === "progressPercentage") {
        // Draw progress bar and percentage
        const progressWidth = 60;
        const barHeight = 8;
        const barY = y - 18;

        // Background bar (light gray)
        page.drawRectangle({
          x,
          y: barY,
          width: progressWidth,
          height: barHeight,
          color: rgb(229 / 255, 231 / 255, 235 / 255),
          borderColor: rgb(156 / 255, 163 / 255, 175 / 255),
          borderWidth: 0.5,
        });

        // Progress bar (green)
        const filledWidth = (data.progressPercentage / 100) * progressWidth;
        if (filledWidth > 0) {
          page.drawRectangle({
            x,
            y: barY,
            width: filledWidth,
            height: barHeight,
            color: rgb(34 / 255, 197 / 255, 94 / 255), // Green
          });
        }

        // Percentage text
        page.drawText(sanitize(`${data.progressPercentage}%`), {
          x: x + progressWidth + 5,
          y: y - 15,
          size: 9,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });
      } else {
        let value = sanitize(data[col.key] || "-");
        page.drawText(value, {
          x,
          y: y - 15,
          size: 9,
          font: helvetica,
          color: rgb(0, 0, 0),
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

  // Create pages and add content
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = addHeader(currentPage, 1, 1);
  y = addMetadata(currentPage, y);
  y -= 20;
  y = addTableHeader(currentPage, y);

  let rowNum = 0;
  const rowHeight = 25;
  const footerSpace = 60;

  for (const project of projects) {
    // Check if we need a new page
    if (y - rowHeight < footerSpace) {
      addFooter(currentPage, pdfDoc.getPageCount(), 1);
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = addHeader(currentPage, pdfDoc.getPageCount(), 1);
      y -= 20;
      y = addTableHeader(currentPage, y);
    }

    y = addTableRow(currentPage, y, project, rowNum);
    rowNum++;
  }

  // Add footer to all pages
  pdfDoc.getPages().forEach((page, index) => {
    addFooter(page, index + 1, pdfDoc.getPageCount());
  });

  // Convert PDF to buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
