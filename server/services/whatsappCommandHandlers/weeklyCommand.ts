/**
 * WhatsApp /weekly Command Handler
 * Retrieves weekly schedule with projects and dates
 */

import { getDb } from '../../db';
import { projects } from '../../../drizzle/schema';
import { formatCompleteMessage, formatErrorMessage, formatList } from '../whatsappResponseFormatter';
import { generateWeeklySchedulePDF } from '../whatsappPDFGenerator';
import { storagePut } from '../../storage';
import { gte, lte } from 'drizzle-orm';

/**
 * Handle /weekly command
 * Usage: /weekly
 * Returns weekly schedule with all projects for the current week
 */
export async function handleWeeklyCommand(args: string[]): Promise<{
  message: string;
  pdfPath?: string;
  pdfUrl?: string;
}> {
  try {
    // Get current week dates
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);

    // Query projects for the week
    const dbInstance = await getDb();
    if (!dbInstance) {
      return {
        message: formatErrorMessage(
          'Database connection failed',
          'Please try again later'
        ),
      };
    }
    const weeklyProjects = await (dbInstance as any).query.projects.findMany({
      where: (projects: any, { and, or, gte, lte }: any) =>
        and(
          or(
            // Projects that start this week
            and(
              gte(projects.startDate, startOfWeek),
              lte(projects.startDate, endOfWeek)
            ),
            // Projects that end this week
            and(
              gte(projects.estimatedEndDate, startOfWeek),
              lte(projects.estimatedEndDate, endOfWeek)
            ),
            // Projects that span this week
            and(
              lte(projects.startDate, endOfWeek),
              gte(projects.estimatedEndDate, startOfWeek)
            )
          ),
          // Exclude completed projects
          (projects: any) => projects.status !== 'Inspection Passed'
        ),
    });

    if (weeklyProjects.length === 0) {
      return {
        message: formatCompleteMessage(
          '📅 Weekly Schedule',
          'No projects scheduled for this week',
          `Week of ${startOfWeek.toLocaleDateString()}`
        ),
      };
    }

    // Format schedule by date
    const scheduleByDate: Record<string, string[]> = {};
    const formatDate = (date: Date | null) => {
      if (!date) return 'No date';
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    };

    weeklyProjects.forEach((project: any): void => {
      const startDate = project.startDate ? formatDate(project.startDate) : 'TBD';
      if (!scheduleByDate[startDate]) {
        scheduleByDate[startDate] = [];
      }
      scheduleByDate[startDate].push(
        `${project.name} (${project.status})`
      );
    });

    // Build message
    let scheduleText = '';
    Object.entries(scheduleByDate).forEach(([date, items]) => {
      scheduleText += `\n*${date}*\n`;
      items.forEach((item) => {
        scheduleText += `• ${item}\n`;
      });
    });

    const message = formatCompleteMessage(
      '📅 Weekly Schedule',
      `${weeklyProjects.length} projects scheduled\n${scheduleText}`,
      `Week of ${startOfWeek.toLocaleDateString()}`
    );

    // Generate PDF report
    let pdfPath: string | undefined;
    let pdfUrl: string | undefined;

    try {
      const scheduleData = weeklyProjects.map((project: any) => ({
        date: project.startDate
          ? new Date(project.startDate).toLocaleDateString()
          : 'TBD',
        project: project.name,
        task: project.description || 'No description',
        status: project.status,
      }));

      pdfPath = await generateWeeklySchedulePDF(scheduleData);

      // Upload PDF to S3
      if (pdfPath) {
        const fileBuffer = require('fs').readFileSync(pdfPath);
        const fileName = `weekly_schedule_${Date.now()}.pdf`;
        const { url } = await storagePut(
          `whatsapp-reports/${fileName}`,
          fileBuffer,
          'application/pdf'
        );
        pdfUrl = url;
      }
    } catch (pdfError) {
      console.error('[WhatsApp] Error generating weekly schedule PDF:', pdfError);
      // Continue without PDF if generation fails
    }

    return {
      message,
      pdfPath,
      pdfUrl,
    };
  } catch (error) {
    console.error('[WhatsApp] Error in /weekly command:', error);
    return {
      message: formatErrorMessage(
        'Failed to retrieve weekly schedule',
        'Please try again later'
      ),
    };
  }
}
