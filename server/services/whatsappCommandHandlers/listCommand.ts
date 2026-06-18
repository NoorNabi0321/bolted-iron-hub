/**
 * /list Command Handler
 * List all active projects (10 per page)
 */

import { getDb } from '../../db';
import { projects } from '../../../drizzle/schema';
import { desc } from 'drizzle-orm';

export async function handleListCommand(): Promise<string> {
  try {
    const db = await getDb();
    if (!db) {
      return '❌ Database connection error. Please try again later.';
    }

    // Get all projects, limit to 10
    const projectList = await db.select().from(projects)
      .orderBy(desc(projects.createdAt))
      .limit(10);

    if (projectList.length === 0) {
      return '📭 No projects found.';
    }

    let message = `*📋 Active Projects (${projectList.length} total)*\n\n`;

    projectList.forEach((p, index) => {
      const statusEmoji = {
        'Planning': '📋',
        'On-Site': '🏗️',
        'In Progress': '⚙️',
        'Completed': '✅',
        'On Hold': '⏸️',
        'Shop Drawings': '📐',
      }[p.status as string] || '📌';

      message += `${index + 1}. ${statusEmoji} *${p.name}*\n`;
      message += `   📍 ${p.address || 'No address'}\n`;
      message += `   Status: ${p.status}\n\n`;
    });

    message += '---\nUse /status <project_name> for details';

    return message;
  } catch (error) {
    console.error('Error in listCommand:', error);
    return '❌ Error fetching projects. Please try again later.';
  }
}
