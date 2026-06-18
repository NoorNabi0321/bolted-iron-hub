import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

/**
 * Final correct migration to set all project dates to UTC midnight
 * 
 * Goal: Store dates as UTC midnight so they display consistently worldwide
 * Example: User sets May 11 → Store as 2026-05-11T00:00:00.000Z
 * This displays as May 11 for all users regardless of timezone
 * 
 * Current state after previous migrations:
 * - 263 Penn st shows 2026-05-09T00:00:00.000Z (should be 2026-05-11T00:00:00.000Z)
 * - All dates are 2 days too early
 * 
 * Solution: Add 2 days (48 hours) to all current dates
 */

async function migrateDatesUTCMidnight() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('Starting UTC midnight migration...\n');
    
    // Get all projects with dates
    const [projects] = await conn.execute(
      'SELECT id, name, startDate, estimatedEndDate FROM projects WHERE startDate IS NOT NULL'
    );
    
    console.log(`Found ${projects.length} projects with start dates\n`);
    
    let updatedCount = 0;
    
    for (const project of projects) {
      const oldStartDate = new Date(project.startDate);
      const oldEndDate = project.estimatedEndDate ? new Date(project.estimatedEndDate) : null;
      
      // Add 2 days (48 hours) to correct the offset
      const newStartDate = new Date(oldStartDate.getTime() + (48 * 60 * 60 * 1000));
      let newEndDate = null;
      if (oldEndDate) {
        newEndDate = new Date(oldEndDate.getTime() + (48 * 60 * 60 * 1000));
      }
      
      // Update the database
      await conn.execute(
        'UPDATE projects SET startDate = ?, estimatedEndDate = ? WHERE id = ?',
        [newStartDate.toISOString(), newEndDate ? newEndDate.toISOString() : null, project.id]
      );
      
      console.log(`✓ Updated: ${project.name}`);
      console.log(`  Start: ${oldStartDate.toISOString()} → ${newStartDate.toISOString()}`);
      if (oldEndDate) {
        console.log(`  End:   ${oldEndDate.toISOString()} → ${newEndDate.toISOString()}`);
      }
      console.log();
      
      updatedCount++;
    }
    
    console.log(`\nUTC midnight migration complete! Updated ${updatedCount} projects`);
    console.log('\nVerifying 263 Penn st:');
    const [verify] = await conn.execute(
      'SELECT startDate FROM projects WHERE name = "263 Penn st" LIMIT 1'
    );
    if (verify.length > 0) {
      console.log('263 Penn st startDate:', verify[0].startDate);
      console.log('Expected: 2026-05-11T00:00:00.000Z');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    conn.end();
  }
}

migrateDatesUTCMidnight();
