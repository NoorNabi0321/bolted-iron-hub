/**
 * WhatsApp /pending Command Handler
 * Retrieves projects pending approval or action
 */

import { getDb } from '../../db';
import { projects } from '../../../drizzle/schema';
import { formatCompleteMessage, formatErrorMessage, formatList } from '../whatsappResponseFormatter';
import { inArray } from 'drizzle-orm';

/**
 * Handle /pending command
 * Usage: /pending
 * Returns projects that are pending approval or awaiting action
 */
export async function handlePendingCommand(args: string[]): Promise<{
  message: string;
}> {
  try {
    // Query projects with pending statuses
    const pendingStatuses = ['Shop Drawings', 'Fabrication'];

    const dbInstance = await getDb();
    if (!dbInstance) {
      return {
        message: formatErrorMessage(
          'Database connection failed',
          'Please try again later'
        ),
      };
    }
    const pendingProjects = await (dbInstance as any).query.projects.findMany({
      where: (projects: any) => inArray(projects.status, pendingStatuses),
      limit: 20, // Limit to 20 most recent
    });

    if (pendingProjects.length === 0) {
      return {
        message: formatCompleteMessage(
          '✅ No Pending Projects',
          'All projects are either in progress or completed!',
          'Great job staying on top of things!'
        ),
      };
    }

    // Format pending projects
    const pendingList = pendingProjects.map((project: any) => {
      const status = project.status === 'Shop Drawings' ? '📋' : '🔨';
      return `${status} ${project.name} - ${project.status}`;
    });

    const message = formatCompleteMessage(
      '⏳ Pending Projects',
      `${pendingProjects.length} projects awaiting action:\n\n${pendingList.join('\n')}`,
      'Use /project <name> for full details'
    );

    return {
      message,
    };
  } catch (error) {
    console.error('[WhatsApp] Error in /pending command:', error);
    return {
      message: formatErrorMessage(
        'Failed to retrieve pending projects',
        'Please try again later'
      ),
    };
  }
}
