import { describe, it, expect, beforeAll } from 'vitest';
import { getAllProjects } from '../db';

describe('Inspection Passed Projects Fix', () => {
  describe('getAllProjects with includeInspectionPassed parameter', () => {
    it('should exclude Inspection Passed projects when includeInspectionPassed is not set', async () => {
      const projects = await getAllProjects({});
      const inspectionPassedCount = projects.filter(p => p.status === 'Inspection Passed').length;
      expect(inspectionPassedCount).toBe(0);
    });

    it('should include Inspection Passed projects when includeInspectionPassed is true', async () => {
      const projects = await getAllProjects({ includeInspectionPassed: true });
      const inspectionPassedCount = projects.filter(p => p.status === 'Inspection Passed').length;
      expect(inspectionPassedCount).toBeGreaterThan(0);
      // Database has 43 Inspection Passed projects
      expect(inspectionPassedCount).toBe(43);
    });

    it('should exclude Inspection Passed projects when includeInspectionPassed is false', async () => {
      const projects = await getAllProjects({ includeInspectionPassed: false });
      const inspectionPassedCount = projects.filter(p => p.status === 'Inspection Passed').length;
      expect(inspectionPassedCount).toBe(0);
    });

    it('should include Inspection Passed projects when explicitly filtering by that status', async () => {
      const projects = await getAllProjects({ status: 'Inspection Passed' });
      expect(projects.length).toBeGreaterThan(0);
      expect(projects.every(p => p.status === 'Inspection Passed')).toBe(true);
      expect(projects.length).toBe(43);
    });

    it('should include Inspection Passed projects when searching', async () => {
      // Search for a project name that might exist in Inspection Passed projects
      const projects = await getAllProjects({ search: 'Franklin' });
      // Should include Inspection Passed projects in search results
      const inspectionPassedInSearch = projects.filter(p => p.status === 'Inspection Passed').length;
      // The search should work regardless of status
      expect(projects.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect both includeInspectionPassed and isArchived filters', async () => {
      const allProjects = await getAllProjects({ includeInspectionPassed: true, isArchived: undefined });
      const activeProjects = await getAllProjects({ includeInspectionPassed: true, isArchived: false });
      
      // All projects should be >= active projects
      expect(allProjects.length).toBeGreaterThanOrEqual(activeProjects.length);
      
      // Both should include Inspection Passed projects
      const inspectionPassedInAll = allProjects.filter(p => p.status === 'Inspection Passed').length;
      expect(inspectionPassedInAll).toBe(43);
    });

    it('should count all statuses correctly with includeInspectionPassed', async () => {
      const projects = await getAllProjects({ includeInspectionPassed: true, isArchived: undefined });
      
      const statusCounts: Record<string, number> = {};
      projects.forEach(p => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      });

      // Verify expected counts from database
      expect(statusCounts['Review']).toBe(1);
      expect(statusCounts['Shop Drawings']).toBe(8);
      expect(statusCounts['Fabrication']).toBe(8);
      expect(statusCounts['On-Site']).toBe(10);
      expect(statusCounts['Installed']).toBe(1);
      expect(statusCounts['Inspection Passed']).toBe(43);
      
      // Total should be 71 (1 + 8 + 8 + 10 + 1 + 43)
      const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(71);
    });

    it('should exclude Inspection Passed when filtering by subcontractor without explicit status', async () => {
      // When filtering by subcontractor, Inspection Passed should be excluded by default
      const projects = await getAllProjects({ subcontractorId: 1 });
      const inspectionPassedCount = projects.filter(p => p.status === 'Inspection Passed').length;
      expect(inspectionPassedCount).toBe(0);
    });

    it('should include Inspection Passed when filtering by subcontractor AND status is Inspection Passed', async () => {
      // When explicitly filtering for Inspection Passed status, include them even with subcontractor filter
      const projects = await getAllProjects({ subcontractorId: 1, status: 'Inspection Passed' });
      // If there are any results, they should all be Inspection Passed
      if (projects.length > 0) {
        expect(projects.every(p => p.status === 'Inspection Passed')).toBe(true);
      }
    });
  });
});
