/**
 * WhatsApp Project Lookup Service
 * Fetches project data from database for WhatsApp commands
 */

import {
  getAllProjects,
  getProjectById,
  getAssignmentsForProject,
  getChecklistsForProject,
  getNotesForProject,
} from '../db';

/**
 * Project lookup result with all required data
 */
export interface ProjectLookupResult {
  id: number;
  name: string;
  address: string | null;
  description: string | null;
  status: string;
  startDate: Date | null;
  estimatedEndDate: Date | null;
  actualEndDate: Date | null;
  subcontractors: any[];
  checklists: any[];
  notes: any[];
}

/**
 * Lookup project by name with fuzzy matching
 * @param projectName - Project name to search for
 * @returns Project lookup result or null
 */
export async function lookupProjectByName(projectName: string): Promise<ProjectLookupResult | null> {
  if (!projectName || typeof projectName !== 'string') {
    return null;
  }

  try {
    const searchTerm = projectName.toLowerCase().trim();

    // Get all projects
    const allProjects = await getAllProjects();

    if (!allProjects || allProjects.length === 0) {
      return null;
    }

    let matchedProject = null;

    // Try exact match first (case-insensitive)
    for (const project of allProjects) {
      if (project.name.toLowerCase() === searchTerm) {
        matchedProject = project;
        break;
      }
    }

    // Try partial match (contains search term)
    if (!matchedProject) {
      for (const project of allProjects) {
        if (project.name.toLowerCase().includes(searchTerm)) {
          matchedProject = project;
          break;
        }
      }
    }

    // Try reverse match (search term contains project name)
    if (!matchedProject) {
      for (const project of allProjects) {
        if (searchTerm.includes(project.name.toLowerCase())) {
          matchedProject = project;
          break;
        }
      }
    }

    if (!matchedProject) {
      return null;
    }

    // Fetch additional data for the matched project
    return await getFullProjectData(matchedProject.id);
  } catch (error) {
    console.error('[WhatsApp] Error looking up project:', error);
    return null;
  }
}

/**
 * Get full project data including all related information
 * @param projectId - Project ID
 * @returns Full project lookup result
 */
export async function getFullProjectData(projectId: number): Promise<ProjectLookupResult | null> {
  try {
    const project = await getProjectById(projectId);

    if (!project) {
      return null;
    }

    // Fetch related data in parallel
    const [subcontractors, checklists, notes] = await Promise.all([
      getAssignmentsForProject(projectId),
      getChecklistsForProject(projectId),
      getNotesForProject(projectId, false), // false = not admin view
    ]);

    return {
      id: project.id,
      name: project.name,
      address: project.address || null,
      description: project.description || null,
      status: project.status || 'Unknown',
      startDate: project.startDate || null,
      estimatedEndDate: project.estimatedEndDate || null,
      actualEndDate: project.actualEndDate || null,
      subcontractors: subcontractors || [],
      checklists: checklists || [],
      notes: notes || [],
    };
  } catch (error) {
    console.error('[WhatsApp] Error fetching full project data:', error);
    return null;
  }
}

/**
 * Get project status
 * @param projectId - Project ID
 * @returns Project status or null
 */
export async function getProjectStatus(projectId: number): Promise<string | null> {
  try {
    const project = await getProjectById(projectId);
    return project ? project.status || 'Unknown' : null;
  } catch (error) {
    console.error('[WhatsApp] Error fetching project status:', error);
    return null;
  }
}

/**
 * Get project subcontractors
 * @param projectId - Project ID
 * @returns Array of subcontractors
 */
export async function getProjectSubcontractors(projectId: number): Promise<any[]> {
  try {
    const assignments = await getAssignmentsForProject(projectId);
    return assignments || [];
  } catch (error) {
    console.error('[WhatsApp] Error fetching project subcontractors:', error);
    return [];
  }
}

/**
 * Get project deadline info
 * @param projectId - Project ID
 * @returns Deadline info object
 */
export async function getProjectDeadlineInfo(projectId: number): Promise<{
  deadline: Date | null;
  daysRemaining: number | null;
  isOverdue: boolean;
  status: string;
}> {
  try {
    const project = await getProjectById(projectId);

    if (!project || !project.estimatedEndDate) {
      return {
        deadline: null,
        daysRemaining: null,
        isOverdue: false,
        status: 'No deadline set',
      };
    }

    const now = Date.now();
    const deadlineTime = project.estimatedEndDate.getTime();
    const daysRemaining = Math.ceil((deadlineTime - now) / (1000 * 60 * 60 * 24));

    let status = 'On-track';
    if (daysRemaining < 0) {
      status = 'Overdue';
    } else if (daysRemaining <= 7) {
      status = 'At-risk';
    }

    return {
      deadline: project.estimatedEndDate,
      daysRemaining,
      isOverdue: daysRemaining < 0,
      status,
    };
  } catch (error) {
    console.error('[WhatsApp] Error fetching project deadline:', error);
    return {
      deadline: null,
      daysRemaining: null,
      isOverdue: false,
      status: 'Error fetching deadline',
    };
  }
}

/**
 * Get project checklists
 * @param projectId - Project ID
 * @returns Array of checklists with completion info
 */
export async function getProjectChecklistInfo(projectId: number): Promise<{
  items: any[];
  totalItems: number;
  completedItems: number;
  percentageComplete: number;
}> {
  try {
    const checklists = await getChecklistsForProject(projectId);

    if (!checklists || checklists.length === 0) {
      return {
        items: [],
        totalItems: 0,
        completedItems: 0,
        percentageComplete: 0,
      };
    }

    const completedItems = checklists.filter(item => item.isCompleted).length;
    const percentageComplete = Math.round((completedItems / checklists.length) * 100);

    return {
      items: checklists,
      totalItems: checklists.length,
      completedItems,
      percentageComplete,
    };
  } catch (error) {
    console.error('[WhatsApp] Error fetching project checklist:', error);
    return {
      items: [],
      totalItems: 0,
      completedItems: 0,
      percentageComplete: 0,
    };
  }
}

/**
 * Get project notes
 * @param projectId - Project ID
 * @returns Array of notes
 */
export async function getProjectNotesInfo(projectId: number): Promise<any[]> {
  try {
    const notes = await getNotesForProject(projectId, false); // false = not admin view
    return notes || [];
  } catch (error) {
    console.error('[WhatsApp] Error fetching project notes:', error);
    return [];
  }
}

/**
 * Format date for WhatsApp display
 * @param date - Date object or null
 * @returns Formatted date string
 */
export function formatDateForWhatsApp(date: Date | null): string {
  if (!date) {
    return 'Not set';
  }

  try {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Get status emoji for project status
 * @param status - Project status
 * @returns Status emoji
 */
export function getStatusEmoji(status: string): string {
  const statusMap: Record<string, string> = {
    'Shop Drawings': '📋',
    'Fabrication': '🔨',
    'On-Site': '✅',
    'Installed': '⚙️',
    'Inspection Passed': '✔️',
  };

  return statusMap[status] || '📌';
}

/**
 * Get status indicator for deadline
 * @param status - Deadline status (On-track, At-risk, Overdue)
 * @returns Status indicator emoji
 */
export function getDeadlineStatusIndicator(status: string): string {
  const indicators: Record<string, string> = {
    'On-track': '✅',
    'At-risk': '⚠️',
    'Overdue': '❌',
  };

  return indicators[status] || '📌';
}

/**
 * Validate project lookup result
 * @param result - Project lookup result
 * @returns boolean - True if result is valid
 */
export function isValidProjectLookup(result: ProjectLookupResult | null): boolean {
  return result !== null && result.id > 0 && result.name !== '';
}

/**
 * Get project summary for quick display
 * @param projectName - Project name to lookup
 * @returns Project summary or error message
 */
export async function getProjectSummary(projectName: string): Promise<{
  success: boolean;
  project?: ProjectLookupResult;
  error?: string;
}> {
  try {
    const project = await lookupProjectByName(projectName);

    if (!project) {
      return {
        success: false,
        error: `Project not found: "${projectName}"`,
      };
    }

    return {
      success: true,
      project,
    };
  } catch (error) {
    console.error('[WhatsApp] Error getting project summary:', error);
    return {
      success: false,
      error: 'Error looking up project. Please try again.',
    };
  }
}
