/**
 * WhatsApp PDF Generator
 * Generates PDF reports for WhatsApp bot responses
 */

import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export interface ProjectPDFData {
  name: string;
  address: string | null;
  borough: string | null;
  status: string;
  startDate: Date | null;
  estimatedEndDate: Date | null;
  actualEndDate: Date | null;
  gcCompany: string | null;
  gcContactName: string | null;
  gcContactPhone: string | null;
  gcContactEmail: string | null;
  siteSuperName: string | null;
  siteSuperPhone: string | null;
  description: string | null;
  primarySubcontractorName?: string;
}

/**
 * Generate project report PDF
 */
export async function generateProjectReportPDF(
  project: ProjectPDFData,
  outputPath?: string
): Promise<string> {
  try {
    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    
    const { height } = page.getSize();
    let yPosition = height - 50;
    
    // Helper function to draw text
    const drawText = (text: string, size: number = 12, bold: boolean = false) => {
      page.drawText(text, {
        x: 50,
        y: yPosition,
        size,
        color: rgb(0, 0, 0),
      });
      yPosition -= size + 10;
    };
    
    // Helper function to draw section
    const drawSection = (title: string, content: string) => {
      page.drawText(title, {
        x: 50,
        y: yPosition,
        size: 11,
        color: rgb(0.2, 0.2, 0.2),
      });
      yPosition -= 15;
      
      page.drawText(content, {
        x: 70,
        y: yPosition,
        size: 10,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
    };
    
    // Title
    drawText('PROJECT REPORT', 16);
    yPosition -= 10;
    
    // Project name
    drawText(`Project: ${project.name}`, 14);
    
    // Basic Info
    drawSection('Address:', project.address || 'Not specified');
    drawSection('Borough:', project.borough || 'Not specified');
    drawSection('Status:', project.status);
    
    // Dates
    const formatDate = (date: Date | null) => 
      date ? new Date(date).toLocaleDateString() : 'Not set';
    
    drawSection('Start Date:', formatDate(project.startDate));
    drawSection('Estimated End Date:', formatDate(project.estimatedEndDate));
    
    if (project.actualEndDate) {
      drawSection('Actual End Date:', formatDate(project.actualEndDate));
    }
    
    // GC Information
    if (project.gcCompany || project.gcContactName) {
      yPosition -= 10;
      page.drawText('GENERAL CONTRACTOR', {
        x: 50,
        y: yPosition,
        size: 12,
        color: rgb(0.2, 0.2, 0.2),
      });
      yPosition -= 15;
      
      if (project.gcCompany) {
        drawSection('Company:', project.gcCompany);
      }
      if (project.gcContactName) {
        drawSection('Contact Name:', project.gcContactName);
      }
      if (project.gcContactPhone) {
        drawSection('Phone:', project.gcContactPhone);
      }
      if (project.gcContactEmail) {
        drawSection('Email:', project.gcContactEmail);
      }
    }
    
    // Site Supervisor
    if (project.siteSuperName) {
      yPosition -= 10;
      page.drawText('SITE SUPERVISOR', {
        x: 50,
        y: yPosition,
        size: 12,
        color: rgb(0.2, 0.2, 0.2),
      });
      yPosition -= 15;
      
      drawSection('Name:', project.siteSuperName);
      if (project.siteSuperPhone) {
        drawSection('Phone:', project.siteSuperPhone);
      }
    }
    
    // Description
    if (project.description) {
      yPosition -= 10;
      page.drawText('DESCRIPTION', {
        x: 50,
        y: yPosition,
        size: 12,
        color: rgb(0.2, 0.2, 0.2),
      });
      yPosition -= 15;
      
      // Wrap description text
      const descLines = wrapText(project.description, 80);
      descLines.forEach(line => {
        page.drawText(line, {
          x: 70,
          y: yPosition,
          size: 10,
          color: rgb(0, 0, 0),
        });
        yPosition -= 12;
      });
    }
    
    // Footer
    yPosition = 30;
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 50,
      y: yPosition,
      size: 9,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    // Save PDF
    const fileName = `project_${project.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    const filePath = outputPath || path.join('/tmp', fileName);
    
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(filePath, pdfBytes);
    
    return filePath;
  } catch (error) {
    console.error('[WhatsApp] Error generating project PDF:', error);
    throw error;
  }
}

/**
 * Generate weekly schedule PDF
 */
export async function generateWeeklySchedulePDF(
  scheduleData: Array<{
    date: string;
    project: string;
    task: string;
    status: string;
  }>,
  outputPath?: string
): Promise<string> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    
    const { height } = page.getSize();
    let yPosition = height - 50;
    
    // Title
    page.drawText('WEEKLY SCHEDULE', {
      x: 50,
      y: yPosition,
      size: 16,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;
    
    // Week info
    page.drawText(`Week of: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: yPosition,
      size: 11,
      color: rgb(0.5, 0.5, 0.5),
    });
    yPosition -= 25;
    
    // Table header
    const drawTableRow = (date: string, project: string, task: string, status: string) => {
      page.drawText(date, { x: 50, y: yPosition, size: 10 });
      page.drawText(project, { x: 150, y: yPosition, size: 10 });
      page.drawText(task, { x: 300, y: yPosition, size: 10 });
      page.drawText(status, { x: 500, y: yPosition, size: 10 });
      yPosition -= 15;
    };
    
    // Headers
    page.drawText('Date', { x: 50, y: yPosition, size: 11, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('Project', { x: 150, y: yPosition, size: 11, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('Task', { x: 300, y: yPosition, size: 11, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('Status', { x: 500, y: yPosition, size: 11, color: rgb(0.2, 0.2, 0.2) });
    yPosition -= 20;
    
    // Data rows
    scheduleData.forEach(item => {
      if (yPosition < 50) {
        // Add new page if needed
        page.drawText('(continued on next page)', {
          x: 50,
          y: yPosition,
          size: 9,
          color: rgb(0.5, 0.5, 0.5),
        });
        // In a real implementation, we'd add a new page here
        return;
      }
      drawTableRow(item.date, item.project, item.task, item.status);
    });
    
    // Footer
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 50,
      y: 30,
      size: 9,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    // Save PDF
    const fileName = `weekly_schedule_${Date.now()}.pdf`;
    const filePath = outputPath || path.join('/tmp', fileName);
    
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(filePath, pdfBytes);
    
    return filePath;
  } catch (error) {
    console.error('[WhatsApp] Error generating weekly schedule PDF:', error);
    throw error;
  }
}

/**
 * Generate project report PDF (simple text version)
 */
export async function generateSimpleReportPDF(
  title: string,
  content: string,
  outputPath?: string
): Promise<string> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    
    const { height } = page.getSize();
    let yPosition = height - 50;
    
    // Title
    page.drawText(title, {
      x: 50,
      y: yPosition,
      size: 16,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;
    
    // Content
    const lines = wrapText(content, 80);
    lines.forEach(line => {
      if (yPosition < 50) {
        // Would add new page in real implementation
        return;
      }
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 11,
        color: rgb(0, 0, 0),
      });
      yPosition -= 15;
    });
    
    // Footer
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 50,
      y: 30,
      size: 9,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    // Save PDF
    const fileName = `report_${Date.now()}.pdf`;
    const filePath = outputPath || path.join('/tmp', fileName);
    
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(filePath, pdfBytes);
    
    return filePath;
  } catch (error) {
    console.error('[WhatsApp] Error generating simple report PDF:', error);
    throw error;
  }
}

/**
 * Wrap text to fit within character limit
 */
function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  const words = text.split(' ');
  let currentLine = '';
  
  words.forEach(word => {
    if ((currentLine + word).length > width) {
      if (currentLine) {
        lines.push(currentLine.trim());
      }
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });
  
  if (currentLine) {
    lines.push(currentLine.trim());
  }
  
  return lines;
}

/**
 * Delete temporary PDF file
 */
export async function deletePDF(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('[WhatsApp] Error deleting PDF:', error);
  }
}

/**
 * Check if PDF file exists
 */
export function pdfExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Get PDF file size
 */
export function getPDFFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}
