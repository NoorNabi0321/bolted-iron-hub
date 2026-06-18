import { 
  projects, 
  projectAssignments, 
  subcontractors, 
  projectChecklistItems, 
  projectNotes, 
  changeOrders,
  financials
} from '../../drizzle/schema';
import { eq, and, gte, lt, desc } from 'drizzle-orm';
import { getDb } from '../db';

/**
 * Get full project details including all related data
 */
export async function getProjectDetails(projectName: string) {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[WhatsApp] Database connection failed');
      return null;
    }
    
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.name, projectName))
      .limit(1);

    if (!project || project.length === 0) return null;

    const projectData = project[0];

    // Get assignments with subcontractor details
    const assignments = await db
      .select()
      .from(projectAssignments)
      .where(eq(projectAssignments.projectId, projectData.id))
      .leftJoin(subcontractors, eq(projectAssignments.subcontractorId, subcontractors.id));

    // Get checklist items
    const checklistItems = await db
      .select()
      .from(projectChecklistItems)
      .where(eq(projectChecklistItems.projectId, projectData.id))
      .orderBy(desc(projectChecklistItems.createdAt));

    // Get change orders
    const changeOrdersList = await db
      .select()
      .from(changeOrders)
      .where(eq(changeOrders.projectId, projectData.id))
      .orderBy(desc(changeOrders.createdAt));

    // Get recent notes (last 10)
    const notesList = await db
      .select()
      .from(projectNotes)
      .where(eq(projectNotes.projectId, projectData.id))
      .orderBy(desc(projectNotes.createdAt))
      .limit(10);

    // Get financials
    const financial = await db
      .select()
      .from(financials)
      .where(eq(financials.projectId, projectData.id))
      .limit(1);

    return {
      project: projectData,
      assignments: assignments || [],
      checklistItems: checklistItems || [],
      changeOrders: changeOrdersList || [],
      notes: notesList || [],
      financial: financial && financial.length > 0 ? financial[0] : null,
    };
  } catch (error) {
    console.error('[WhatsApp] Error getting project details:', error);
    return null;
  }
}

/**
 * Get assigned subcontractors for a project
 */
export async function getProjectTeam(projectName: string) {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[WhatsApp] Database connection failed');
      return null;
    }
    
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.name, projectName))
      .limit(1);

    if (!project || project.length === 0) return null;

    const assignments = await db
      .select({
        assignment: projectAssignments,
        subcontractor: subcontractors,
      })
      .from(projectAssignments)
      .where(eq(projectAssignments.projectId, project[0].id))
      .leftJoin(subcontractors, eq(projectAssignments.subcontractorId, subcontractors.id));

    // Format the response to match the expected structure
    return assignments.map((item: any) => ({
      ...item.assignment,
      subcontractor: item.subcontractor,
    }));
  } catch (error) {
    console.error('[WhatsApp] Error getting project team:', error);
    return null;
  }
}

/**
 * Get project checklist items
 */
export async function getProjectChecklist(projectName: string) {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[WhatsApp] Database connection failed');
      return null;
    }
    
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.name, projectName))
      .limit(1);

    if (!project || project.length === 0) return null;

    const items = await db
      .select()
      .from(projectChecklistItems)
      .where(eq(projectChecklistItems.projectId, project[0].id))
      .orderBy(desc(projectChecklistItems.createdAt));

    return items;
  } catch (error) {
    console.error('[WhatsApp] Error getting checklist:', error);
    return null;
  }
}

/**
 * Get project notes (last 10)
 */
export async function getProjectNotes(projectName: string) {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[WhatsApp] Database connection failed');
      return null;
    }
    
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.name, projectName))
      .limit(1);

    if (!project || project.length === 0) return null;

    const notes = await db
      .select()
      .from(projectNotes)
      .where(eq(projectNotes.projectId, project[0].id))
      .orderBy(desc(projectNotes.createdAt))
      .limit(10);

    return notes;
  } catch (error) {
    console.error('[WhatsApp] Error getting notes:', error);
    return null;
  }
}

/**
 * Get project change orders
 */
export async function getProjectChangeOrders(projectName: string) {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[WhatsApp] Database connection failed');
      return null;
    }
    
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.name, projectName))
      .limit(1);

    if (!project || project.length === 0) return null;

    const orders = await db
      .select()
      .from(changeOrders)
      .where(eq(changeOrders.projectId, project[0].id))
      .orderBy(desc(changeOrders.createdAt));

    return orders;
  } catch (error) {
    console.error('[WhatsApp] Error getting change orders:', error);
    return null;
  }
}

/**
 * Get projects by date
 */
export async function getProjectsByDate(date: Date) {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[WhatsApp] Database connection failed');
      return null;
    }
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const projectList = await db
      .select()
      .from(projects)
      .where(and(
        gte(projects.createdAt, startOfDay),
        lt(projects.createdAt, endOfDay)
      ))
      .orderBy(desc(projects.createdAt));

    return projectList;
  } catch (error) {
    console.error('[WhatsApp] Error getting projects by date:', error);
    return null;
  }
}

/**
 * Get all projects
 */
export async function getAllProjects() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[WhatsApp] Database connection failed');
      return null;
    }
    
    const projectList = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));

    return projectList;
  } catch (error) {
    console.error('[WhatsApp] Error getting all projects:', error);
    return null;
  }
}

/**
 * Get project count by date
 */
export async function getProjectCountByDate(date: Date): Promise<number> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[WhatsApp] Database connection failed');
      return 0;
    }
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await db
      .select()
      .from(projects)
      .where(and(
        gte(projects.createdAt, startOfDay),
        lt(projects.createdAt, endOfDay)
      ));

    return result.length;
  } catch (error) {
    console.error('[WhatsApp] Error getting project count by date:', error);
    return 0;
  }
}

/**
 * Get total project count
 */
export async function getTotalProjectCount(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[WhatsApp] Database connection failed');
      return 0;
    }
    
    const result = await db
      .select()
      .from(projects);

    return result.length;
  } catch (error) {
    console.error('[WhatsApp] Error getting total project count:', error);
    return 0;
  }
}

/**
 * Get dashboard insights
 */
export async function getDashboardInsights() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[WhatsApp] Database connection failed');
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalSubcontractors: 0,
        projectPipeline: {
          'Shop Drawings': 0,
          'Fabrication': 0,
          'On-Site': 0,
          'Installed': 0,
          'Inspection Passed': 0,
        },
      };
    }
    
    const allProjects = await db.select().from(projects);
    const allAssignments = await db.select().from(projectAssignments);

    // Count by status
    const statusCounts: Record<string, number> = {};
    allProjects.forEach((p: any) => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });

    // Count active and completed
    const activeProjects = allProjects.filter((p: any) => 
      ['Shop Drawings', 'Fabrication', 'On-Site', 'Installed'].includes(p.status)
    ).length;
    
    const completedProjects = allProjects.filter((p: any) => 
      p.status === 'Inspection Passed'
    ).length;

    // Count unique subcontractors
    const uniqueSubcontractors = new Set(
      allAssignments.map((a: any) => a.subcontractorId)
    ).size;

    return {
      totalProjects: allProjects.length,
      activeProjects,
      completedProjects,
      totalSubcontractors: uniqueSubcontractors,
      projectPipeline: {
        'Shop Drawings': statusCounts['Shop Drawings'] || 0,
        'Fabrication': statusCounts['Fabrication'] || 0,
        'On-Site': statusCounts['On-Site'] || 0,
        'Installed': statusCounts['Installed'] || 0,
        'Inspection Passed': statusCounts['Inspection Passed'] || 0,
      },
    };
  } catch (error) {
    console.error('[WhatsApp] Error getting dashboard insights:', error);
    return {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalSubcontractors: 0,
      projectPipeline: {
        'Shop Drawings': 0,
        'Fabrication': 0,
        'On-Site': 0,
        'Installed': 0,
        'Inspection Passed': 0,
      },
    };
  }
}

/**
 * Get project by name
 */
export async function getProjectByName(projectName: string) {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[WhatsApp] Database connection failed');
      return null;
    }
    
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.name, projectName))
      .limit(1);

    return project && project.length > 0 ? project[0] : null;
  } catch (error) {
    console.error('[WhatsApp] Error getting project by name:', error);
    return null;
  }
}
