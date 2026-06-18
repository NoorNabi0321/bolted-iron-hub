/**
 * WhatsApp /project Command Handler
 * Retrieves full project details with PDF report
 */

import { getDb } from '../../db';
import { projects } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { formatCompleteMessage, formatErrorMessage } from '../whatsappResponseFormatter';
import { generateProjectReportPDF } from '../whatsappPDFGenerator';
import { storagePut } from '../../storage';

/**
 * Handle /project command
 * Usage: /project <project_name>
 * Returns full project details with PDF report
 */
export async function handleProjectCommand(args: string[]): Promise<{
  message: string;
  pdfPath?: string;
  pdfUrl?: string;
}> {
  try {
    if (args.length === 0) {
      return {
        message: formatErrorMessage(
          'Project name required',
          'Usage: /project <project_name>\nExample: /project 610 dekalb'
        ),
      };
    }

    const projectName = args.join(' ');

    // Query project by name (case-insensitive)
    const dbInstance = await getDb();
    if (!dbInstance) {
      return {
        message: formatErrorMessage(
          'Database connection failed',
          'Please try again later'
        ),
      };
    }
    const projectData = await (dbInstance as any).query.projects.findFirst({
      where: (projects: any, { ilike }: any) => ilike(projects.name, `%${projectName}%`),
    });

    if (!projectData) {
      return {
        message: formatErrorMessage(
          `Project "${projectName}" not found`,
          'Check the project name and try again'
        ),
      };
    }

    // Format project details
    const formatDate = (date: Date | null) =>
      date ? new Date(date).toLocaleDateString() : 'Not set';

    const details = `
*Project Details*

*Name:* ${projectData.name}
*Address:* ${projectData.address || 'Not specified'}
*Borough:* ${projectData.borough || 'Not specified'}
*Status:* ${projectData.status}

*Timeline*
*Start Date:* ${formatDate(projectData.startDate)}
*Est. End Date:* ${formatDate(projectData.estimatedEndDate)}
${projectData.actualEndDate ? `*Actual End Date:* ${formatDate(projectData.actualEndDate)}` : ''}

*General Contractor*
*Company:* ${projectData.gcCompany || 'Not specified'}
*Contact:* ${projectData.gcContactName || 'Not specified'}
*Phone:* ${projectData.gcContactPhone || 'Not specified'}
*Email:* ${projectData.gcContactEmail || 'Not specified'}

*Site Supervisor*
*Name:* ${projectData.siteSuperName || 'Not assigned'}
*Phone:* ${projectData.siteSuperPhone || 'Not specified'}

*Description*
${projectData.description || 'No description available'}
    `.trim();

    const message = formatCompleteMessage(
      `📋 ${projectData.name}`,
      details,
      'Generating PDF report...'
    );

    // Generate PDF report
    let pdfPath: string | undefined;
    let pdfUrl: string | undefined;

    try {
      pdfPath = await generateProjectReportPDF({
        name: projectData.name,
        address: projectData.address,
        borough: projectData.borough,
        status: projectData.status,
        startDate: projectData.startDate,
        estimatedEndDate: projectData.estimatedEndDate,
        actualEndDate: projectData.actualEndDate,
        gcCompany: projectData.gcCompany,
        gcContactName: projectData.gcContactName,
        gcContactPhone: projectData.gcContactPhone,
        gcContactEmail: projectData.gcContactEmail,
        siteSuperName: projectData.siteSuperName,
        siteSuperPhone: projectData.siteSuperPhone,
        description: projectData.description,
      });

      // Upload PDF to S3
      if (pdfPath) {
        const fileBuffer = require('fs').readFileSync(pdfPath);
        const fileName = `project_${projectData.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        const { url } = await storagePut(
          `whatsapp-reports/${fileName}`,
          fileBuffer,
          'application/pdf'
        );
        pdfUrl = url;
      }
    } catch (pdfError) {
      console.error('[WhatsApp] Error generating project PDF:', pdfError);
      // Continue without PDF if generation fails
    }

    return {
      message,
      pdfPath,
      pdfUrl,
    };
  } catch (error) {
    console.error('[WhatsApp] Error in /project command:', error);
    return {
      message: formatErrorMessage(
        'Failed to retrieve project details',
        'Please try again later'
      ),
    };
  }
}
