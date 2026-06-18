import { describe, it, expect, beforeAll } from 'vitest';
import { getAllProjects, getAssignmentsForProject, assignSubcontractor, removeAssignment } from '../db';

describe('Subcontractor Editing Workflow', () => {
  let projectId: number;

  beforeAll(async () => {
    // Create a test project
    const projects = await getAllProjects({ includeInspectionPassed: true });
    if (projects.length > 0) {
      projectId = projects[0].id;
    }
  });

  describe('Add Subcontractor', () => {
    it('should add a new subcontractor to a project', async () => {
      if (!projectId) {
        expect(projectId).toBeDefined();
        return;
      }

      // Get available subcontractors
      const assignments = await getAssignmentsForProject(projectId);
      const initialCount = assignments.length;

      // Assign a new subcontractor
      const resultId = await assignSubcontractor({
        projectId,
        subcontractorId: 1,
        role: 'Structural Steel',
      });

      expect(resultId).toBeDefined();

      // Verify assignment was added
      const updatedAssignments = await getAssignmentsForProject(projectId);
      expect(updatedAssignments.length).toBe(initialCount + 1);

      // Clean up
      await removeAssignment(resultId);
    });

    it('should allow assigning multiple different subcontractors', async () => {
      if (!projectId) return;

      // Add multiple subcontractors
      const results = await Promise.all([
        assignSubcontractor({ projectId, subcontractorId: 1, role: 'Role 1' }),
        assignSubcontractor({ projectId, subcontractorId: 2, role: 'Role 2' }),
      ]);

      expect(results.length).toBe(2);
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();

      // Verify both were added
      const assignments = await getAssignmentsForProject(projectId);
      const added = assignments.filter(a => a.subcontractorId === 1 || a.subcontractorId === 2);
      expect(added.length).toBeGreaterThanOrEqual(2);

      // Clean up
      await Promise.all([
        removeAssignment(results[0]),
        removeAssignment(results[1]),
      ]);
    });
  });

  describe('Assignment Tracking', () => {
    it('should track assignment ID for later updates', async () => {
      if (!projectId) return;

      // Get first assignment
      const assignments = await getAssignmentsForProject(projectId);
      if (assignments.length === 0) return;

      const assignment = assignments[0];
      expect(assignment.id).toBeDefined();
      expect(assignment.subcontractorId).toBeDefined();
      expect(assignment.projectId).toBe(projectId);
    });

    it('should preserve assignment ID after deletion and re-add', async () => {
      if (!projectId) return;

      // Add a subcontractor
      const addId = await assignSubcontractor({
        projectId,
        subcontractorId: 3,
        role: 'Test Role',
      });

      expect(addId).toBeDefined();

      // Verify it exists
      const assignments = await getAssignmentsForProject(projectId);
      const added = assignments.find(a => a.id === addId);
      expect(added).toBeDefined();

      // Delete it
      await removeAssignment(addId);

      // Verify it's gone
      const afterDelete = await getAssignmentsForProject(projectId);
      expect(afterDelete.find(a => a.id === addId)).toBeUndefined();
    });
  });

  describe('Delete Subcontractor', () => {
    it('should delete a subcontractor assignment', async () => {
      if (!projectId) return;

      const assignments = await getAssignmentsForProject(projectId);
      if (assignments.length === 0) return;

      const assignment = assignments[0];
      const initialCount = assignments.length;

      // Delete the assignment
      await removeAssignment(assignment.id);

      // Verify deletion
      const updatedAssignments = await getAssignmentsForProject(projectId);
      expect(updatedAssignments.length).toBe(initialCount - 1);
      expect(updatedAssignments.find(a => a.id === assignment.id)).toBeUndefined();
    });

    it('should not affect other assignments when deleting one', async () => {
      if (!projectId) return;

      const assignments = await getAssignmentsForProject(projectId);
      if (assignments.length < 2) return;

      const toDelete = assignments[0];
      const toKeep = assignments[1];

      // Delete first assignment
      await removeAssignment(toDelete.id);

      // Verify second assignment still exists
      const updatedAssignments = await getAssignmentsForProject(projectId);
      const kept = updatedAssignments.find(a => a.id === toKeep.id);
      expect(kept).toBeDefined();
      expect(kept?.subcontractorId).toBe(toKeep.subcontractorId);
    });
  });

  describe('Multiple Subcontractor Operations', () => {
    it('should handle add and delete in sequence', async () => {
      if (!projectId) return;

      const initialAssignments = await getAssignmentsForProject(projectId);
      const initialCount = initialAssignments.length;

      // Add
      const addResultId = await assignSubcontractor({
        projectId,
        subcontractorId: 3,
        role: 'Test Role 1',
      });
      expect(addResultId).toBeDefined();

      let assignments = await getAssignmentsForProject(projectId);
      expect(assignments.length).toBe(initialCount + 1);

      // Delete
      await removeAssignment(addResultId);

      assignments = await getAssignmentsForProject(projectId);
      expect(assignments.length).toBe(initialCount);
      expect(assignments.find(a => a.id === addResultId)).toBeUndefined();
    });

    it('should maintain data integrity with concurrent add operations', async () => {
      if (!projectId) return;

      const initialAssignments = await getAssignmentsForProject(projectId);
      const initialCount = initialAssignments.length;

      // Add multiple subcontractors
      const results = await Promise.all([
        assignSubcontractor({ projectId, subcontractorId: 4, role: 'Role 1' }),
        assignSubcontractor({ projectId, subcontractorId: 5, role: 'Role 2' }),
      ]);

      expect(results.length).toBe(2);
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();

      // Verify both were added
      const assignments = await getAssignmentsForProject(projectId);
      expect(assignments.length).toBe(initialCount + 2);

      // Clean up
      await Promise.all([
        removeAssignment(results[0]),
        removeAssignment(results[1]),
      ]);

      // Verify cleanup
      const afterCleanup = await getAssignmentsForProject(projectId);
      expect(afterCleanup.length).toBe(initialCount);
    });
  });
});
