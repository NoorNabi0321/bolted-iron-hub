/**
 * WhatsApp /report Command Handler
 * Generates comprehensive project report with statistics
 */

import { getDb } from '../../db';
import { projects } from '../../../drizzle/schema';
import { formatCompleteMessage, formatErrorMessage } from '../whatsappResponseFormatter';
import { generateSimpleReportPDF } from '../whatsappPDFGenerator';
import { storagePut } from '../../storage';

/**
 * Handle /report command
 * Usage: /report [type]
 * Returns project statistics and summary report
 * Types: summary (default), active, completed
 */
export async function handleReportCommand(args: string[]): Promise<{
  message: string;
  pdfPath?: string;
  pdfUrl?: string;
}> {
  try {
    const reportType = args[0]?.toLowerCase() || 'summary';

    // Query all projects
    const dbInstance = await getDb();
    if (!dbInstance) {
      return {
        message: formatErrorMessage(
          'Database connection failed',
          'Please try again later'
        ),
      };
    }
    const allProjects = await (dbInstance as any).query.projects.findMany();

    // Calculate statistics
    const stats = {
      total: allProjects.length,
      active: allProjects.filter((p: any) => p.status !== 'Inspection Passed').length,
      completed: allProjects.filter((p: any) => p.status === 'Inspection Passed').length,
      shopDrawings: allProjects.filter((p: any) => p.status === 'Shop Drawings').length,
      fabrication: allProjects.filter((p: any) => p.status === 'Fabrication').length,
      onSite: allProjects.filter((p: any) => p.status === 'On-Site').length,
      installed: allProjects.filter((p: any) => p.status === 'Installed').length,
      inspectionPassed: allProjects.filter((p: any) => p.status === 'Inspection Passed')
        .length,
    };

    // Build report message
    let reportContent = '';

    if (reportType === 'summary' || reportType === 'all') {
      reportContent = `
*📊 PROJECT SUMMARY REPORT*

*Overall Statistics*
Total Projects: ${stats.total}
Active Projects: ${stats.active}
Completed Projects: ${stats.completed}

*Status Breakdown*
📋 Shop Drawings: ${stats.shopDrawings}
🔨 Fabrication: ${stats.fabrication}
🏗️ On-Site: ${stats.onSite}
⚙️ Installed: ${stats.installed}
✅ Inspection Passed: ${stats.inspectionPassed}

*Completion Rate*
${stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}%` : '0%'} (${stats.completed}/${stats.total})
      `.trim();
    } else if (reportType === 'active') {
      const activeProjects = allProjects.filter((p: any) => p.status !== 'Inspection Passed');
      reportContent = `
*🔄 ACTIVE PROJECTS REPORT*

Total Active: ${activeProjects.length}

${activeProjects
  .slice(0, 15)
  .map((p: any) => `• ${p.name} - ${p.status}`)
  .join('\n')}
${activeProjects.length > 15 ? `\n... and ${activeProjects.length - 15} more` : ''}
      `.trim();
    } else if (reportType === 'completed') {
      const completedProjects = allProjects.filter(
        (p: any) => p.status === 'Inspection Passed'
      );
      reportContent = `
*✅ COMPLETED PROJECTS REPORT*

Total Completed: ${completedProjects.length}

${completedProjects
  .slice(0, 15)
  .map((p: any) => `• ${p.name}`)
  .join('\n')}
${completedProjects.length > 15 ? `\n... and ${completedProjects.length - 15} more` : ''}
      `.trim();
    } else {
      return {
        message: formatErrorMessage(
          'Invalid report type',
          'Usage: /report [summary|active|completed]\nExample: /report active'
        ),
      };
    }

    const message = formatCompleteMessage(
      '📊 Project Report',
      reportContent,
      `Generated: ${new Date().toLocaleString()}`
    );

    // Generate PDF report
    let pdfPath: string | undefined;
    let pdfUrl: string | undefined;

    try {
      const pdfTitle = `Project Report - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`;
      pdfPath = await generateSimpleReportPDF(pdfTitle, reportContent);

      // Upload PDF to S3
      if (pdfPath) {
        const fileBuffer = require('fs').readFileSync(pdfPath);
        const fileName = `project_report_${reportType}_${Date.now()}.pdf`;
        const { url } = await storagePut(
          `whatsapp-reports/${fileName}`,
          fileBuffer,
          'application/pdf'
        );
        pdfUrl = url;
      }
    } catch (pdfError) {
      console.error('[WhatsApp] Error generating report PDF:', pdfError);
      // Continue without PDF if generation fails
    }

    return {
      message,
      pdfPath,
      pdfUrl,
    };
  } catch (error) {
    console.error('[WhatsApp] Error in /report command:', error);
    return {
      message: formatErrorMessage(
        'Failed to generate report',
        'Please try again later'
      ),
    };
  }
}
