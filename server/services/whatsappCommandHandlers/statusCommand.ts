/**
 * /status Command Handler
 * Get project status by name
 */

import { getDb } from '../../db';
import { projects } from '../../../drizzle/schema';
import { like, or } from 'drizzle-orm';

export async function handleStatusCommand(projectName: string): Promise<string> {
  if (!projectName.trim()) {
    return '❌ Please provide a project name.\nExample: /status 610 dekalb';
  }

  try {
    const db = await getDb();
    if (!db) {
      return '❌ Database connection error. Please try again later.';
    }

    // Search for project by name or address
    const result = await db.select().from(projects)
      .where(or(
        like(projects.name, `%${projectName}%`),
        like(projects.address, `%${projectName}%`)
      ))
      .limit(1);
    
    const project = result[0];

    if (!project) {
      return `❌ Project "*${projectName}*" not found.\n\nTry /list to see all projects.`;
    }

    const statusEmojiMap: Record<string, string> = {
      'Planning': '📋',
      'On-Site': '🏗️',
      'In Progress': '⚙️',
      'Completed': '✅',
      'On Hold': '⏸️',
      'Shop Drawings': '📐',
    };
    const statusEmoji = statusEmojiMap[project.status as string] || '📌';

    const message = `
*${statusEmoji} Project Status*

*Name:* ${project.name}
*Address:* ${project.address}
*Status:* ${project.status}
*Start Date:* ${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}
*Est. End Date:* ${project.estimatedEndDate ? new Date(project.estimatedEndDate).toLocaleDateString() : 'Not set'}
*Primary Subcontractor:* Not assigned

---
Use /project ${project.name} for full details
    `.trim();

    return message;
  } catch (error) {
    console.error('Error in statusCommand:', error);
    return '❌ Error fetching project status. Please try again later.';
  }
}
