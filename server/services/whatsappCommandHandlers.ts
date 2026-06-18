import {
  getProjectDetails,
  getProjectTeam,
  getProjectChecklist,
  getProjectNotes,
  getProjectChangeOrders,
  getProjectsByDate,
  getAllProjects,
  getProjectCountByDate,
  getTotalProjectCount,
  getDashboardInsights,
  getProjectByName,
} from '../db/whatsappQueries';
import { formatCommandHelp } from './whatsappCommandRegistry';
import { getDb } from '../db';
import { whatsappCommandPermissions } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * /project <project-name> - Get full project details
 */
export async function handleProjectCommand(projectName: string): Promise<string> {
  try {
    const data = await getProjectDetails(projectName);
    
    if (!data) {
      return `❌ Project "${projectName}" not found.`;
    }

    const { project, assignments, checklistItems, changeOrders, notes, financial } = data;
    
    // Calculate checklist completion
    const completedItems = checklistItems.filter((i: any) => i.isCompleted).length;
    const totalItems = checklistItems.length;
    const checklistPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Format response
    let response = `📋 PROJECT DETAILS\n`;
    response += `═══════════════════════════════════\n`;
    response += `Name: ${project.name}\n`;
    response += `Address: ${project.address || 'Not available'}\n`;
    response += `Borough: ${project.borough || 'Not available'}\n`;
    response += `Status: ${project.status}\n`;
    response += `\n👥 GC CONTACT\n`;
    response += `Company: ${project.gcCompany || 'Not available'}\n`;
    response += `Contact: ${project.gcContactName || 'Not available'}\n`;
    response += `Phone: ${project.gcContactPhone || 'Not available'}\n`;
    response += `Email: ${project.gcContactEmail || 'Not available'}\n`;
    response += `\n👷 SITE SUPERVISOR\n`;
    response += `Name: ${project.siteSuperName || 'Not available'}\n`;
    response += `Phone: ${project.siteSuperPhone || 'Not available'}\n`;
    response += `\n📅 DATES\n`;
    response += `Start: ${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not available'}\n`;
    response += `Est. End: ${project.estimatedEndDate ? new Date(project.estimatedEndDate).toLocaleDateString() : 'Not available'}\n`;
    response += `\n👥 TEAM\n`;
    if (assignments.length > 0) {
      assignments.forEach((a: any, i: number) => {
        response += `${i + 1}. ${a.subcontractor?.companyName || 'Unknown'} (${a.role || 'Not specified'})\n`;
      });
    } else {
      response += `No subcontractors assigned\n`;
    }
    response += `\n✅ CHECKLIST\n`;
    if (checklistItems.length > 0) {
      response += `${completedItems}/${totalItems} items complete (${checklistPercent}%)\n`;
    } else {
      response += `Checklist: Not available\n`;
    }
    response += `\n📝 CHANGE ORDERS\n`;
    if (changeOrders.length > 0) {
      response += `${changeOrders.length} change order(s)\n`;
    } else {
      response += `Change Orders: Not available\n`;
    }
    response += `\n💰 FINANCIALS\n`;
    if (financial) {
      response += `Contract Value: $${financial.contractValue || 'N/A'}\n`;
      response += `Billed: $${financial.amountBilled || 'N/A'}\n`;
      response += `Received: $${financial.amountReceived || 'N/A'}\n`;
    } else {
      response += `Financials: Not available\n`;
    }
    response += `═══════════════════════════════════`;

    return response;
  } catch (error) {
    return `❌ Error retrieving project details: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * /status <project-name> - Get current project status only
 */
export async function handleStatusCommand(projectName: string): Promise<string> {
  try {
    const project = await getProjectByName(projectName);
    
    if (!project) {
      return `❌ Project "${projectName}" not found.`;
    }

    const response = `📊 PROJECT STATUS\n` +
      `═══════════════════════════════════\n` +
      `Project: ${project.name}\n` +
      `Status: ${project.status}\n` +
      `Last Updated: ${new Date(project.updatedAt).toLocaleString()}\n` +
      `═══════════════════════════════════`;

    return response;
  } catch (error) {
    return `❌ Error retrieving status: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * /team <project-name> - List assigned subcontractors
 */
export async function handleTeamCommand(projectName: string): Promise<string> {
  try {
    const assignments = await getProjectTeam(projectName);
    
    if (!assignments) {
      return `❌ Project "${projectName}" not found.`;
    }

    if (assignments.length === 0) {
      return `⚠️ No subcontractor has been assigned to this project.`;
    }

    let response = `👥 PROJECT TEAM\n`;
    response += `═══════════════════════════════════\n`;

    assignments.forEach((a: any, i: number) => {
      const subcontractorName = a.subcontractor?.companyName?.trim() || 'Unknown';
      response += `${i + 1}. ${subcontractorName} - ${a.role || 'Not specified'}\n`;
    });

    response += `═══════════════════════════════════`;
    return response;
  } catch (error) {
    return `❌ Error retrieving team: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * /checklist <project-name> - Show project checklist
 */
export async function handleChecklistCommand(projectName: string): Promise<string> {
  try {
    const items = await getProjectChecklist(projectName);
    
    if (!items) {
      return `❌ Project "${projectName}" not found.`;
    }

    if (items.length === 0) {
      return `⚠️ No checklist items available for this project.`;
    }

    let response = `✅ PROJECT CHECKLIST\n`;
    response += `═══════════════════════════════════\n\n`;

    items.forEach((item: any, i: number) => {
      const status = item.isCompleted ? '✓ COMPLETED' : '○ PENDING';
      response += `${i + 1}. ${item.text} [${status}]\n`;
    });

    response += `\n═══════════════════════════════════`;
    return response;
  } catch (error) {
    return `❌ Error retrieving checklist: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * /notes <project-name> - Show project notes (last 10)
 */
export async function handleNotesCommand(projectName: string): Promise<string> {
  try {
    const notes = await getProjectNotes(projectName);
    
    if (!notes) {
      return `❌ Project "${projectName}" not found.`;
    }

    if (notes.length === 0) {
      return `⚠️ No notes available for this project.`;
    }

    let response = `📏 PROJECT NOTES\n`;
    response += `═══════════════════════════════════\n\n`;

    notes.forEach((note: any, i: number) => {
      response += `${i + 1}. ${note.content}\n\n`;
    });

    response += `═══════════════════════════════════`;
    return response;
  } catch (error) {
    return `❌ Error retrieving notes: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * /changes <project-name> - Show change orders
 */
export async function handleChangesCommand(projectName: string): Promise<string> {
  try {
    const changes = await getProjectChangeOrders(projectName);
    
    if (!changes) {
      return `❌ Project "${projectName}" not found.`;
    }

    if (changes.length === 0) {
      return `⚠️ No change orders available for this project.`;
    }

    let response = `📋 CHANGE ORDERS\n`;
    response += `═══════════════════════════════════\n`;
    response += `Project: ${projectName}\n`;
    response += `Total: ${changes.length}\n\n`;

    changes.forEach((co: any, i: number) => {
      response += `${i + 1}. Order #${co.orderNumber}\n`;
      response += `   Amount: $${co.amount}\n`;
      response += `   Status: ${co.status}\n`;
      response += `   Created: ${new Date(co.createdAt).toLocaleDateString()}\n`;
      if (co.approvedBy) {
        response += `   Approved by: ${co.approvedBy}\n`;
      }
      response += `\n`;
    });

    response += `═══════════════════════════════════`;
    return response;
  } catch (error) {
    return `❌ Error retrieving change orders: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * /list [date] - List all projects or projects for a specific date
 */
export async function handleListCommand(dateStr?: string): Promise<string> {
  try {
    let projects;
    let dateLabel = 'Today';

    if (dateStr) {
      // Parse date (YYYY-MM-DD format)
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return `❌ Invalid date format. Use YYYY-MM-DD (e.g., 2026-03-17)`;
      }
      projects = await getProjectsByDate(date);
      dateLabel = date.toLocaleDateString();
    } else {
      projects = await getAllProjects();
      dateLabel = 'All Projects';
    }

    if (!projects || projects.length === 0) {
      return `⚠️ No projects found for ${dateLabel}.`;
    }

    let response = `📋 PROJECT LIST\n`;
    response += `═══════════════════════════════════\n`;
    response += `Date: ${dateLabel}\n`;
    response += `Total: ${projects.length}\n\n`;

    projects.forEach((p: any, i: number) => {
      response += `${i + 1}. ${p.name}\n`;
      response += `   Address: ${p.address || 'Not available'}\n`;
      response += `   Status: ${p.status}\n\n`;
    });

    response += `═══════════════════════════════════`;
    return response;
  } catch (error) {
    return `❌ Error retrieving projects: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * /insights - Show dashboard insights
 */
export async function handleInsightsCommand(): Promise<string> {
  try {
    const insights = await getDashboardInsights();

    let response = `📊 DASHBOARD INSIGHTS\n`;
    response += `═══════════════════════════════════\n`;
    response += `\n📈 SUMMARY\n`;
    response += `Total Projects: ${insights.totalProjects}\n`;
    response += `Active Projects: ${insights.activeProjects}\n`;
    response += `Completed Projects: ${insights.completedProjects}\n`;
    response += `Total Subcontractors: ${insights.totalSubcontractors}\n`;
    response += `\n🔄 PROJECT PIPELINE\n`;
    response += `Shop Drawings: ${insights.projectPipeline['Shop Drawings']}\n`;
    response += `Fabrication: ${insights.projectPipeline['Fabrication']}\n`;
    response += `On-Site: ${insights.projectPipeline['On-Site']}\n`;
    response += `Installed: ${insights.projectPipeline['Installed']}\n`;
    response += `Inspection Passed: ${insights.projectPipeline['Inspection Passed']}\n`;
    response += `═══════════════════════════════════`;

    return response;
  } catch (error) {
    return `❌ Error retrieving insights: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Get list of enabled commands from database
 */
async function getEnabledCommands(): Promise<string[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const permissions = await db
      .select()
      .from(whatsappCommandPermissions)
      .where(eq(whatsappCommandPermissions.isEnabled, true));

    return permissions.map((p: any) => p.command);
  } catch (error) {
    console.error('[WhatsApp Commands] Error getting enabled commands:', error);
    return [];
  }
}

/**
 * /help - Show all available commands
 */
export async function handleHelpCommand(commandName?: string): Promise<string> {
  try {
    // Get enabled commands from database
    const enabledCommands = await getEnabledCommands();
    return formatCommandHelp(commandName, enabledCommands);
  } catch (error) {
    console.error('[WhatsApp Commands] Error in help command:', error);
    // Fallback to showing all commands if database fails
    return formatCommandHelp(commandName);
  }
}

/**
 * Execute a command handler
 * @param commandType - Command type
 * @param projectName - Optional project name for commands that need it
 * @returns Response message
 */
export async function executeCommandHandler(
  commandType: string,
  projectName?: string
): Promise<string> {
  try {
    switch (commandType) {
      case 'project':
        return await handleProjectCommand(projectName || '');
      case 'team':
        return await handleTeamCommand(projectName || '');
      case 'checklist':
        return await handleChecklistCommand(projectName || '');
      case 'notes':
        return await handleNotesCommand(projectName || '');
      case 'list':
        return await handleListCommand(projectName);

      case 'insights':
        return await handleInsightsCommand();
      case 'help':
        return await handleHelpCommand(projectName);
      default:
        return `❌ Unknown command: ${commandType}. Type /help for available commands.`;
    }
  } catch (error) {
    return `❌ Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
