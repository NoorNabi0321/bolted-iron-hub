import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

/**
 * Comprehensive migration to fix all date issues
 * 
 * Step 1: Undo previous migrations by subtracting 52 hours
 * Step 2: Apply correct timezone fix
 * 
 * The goal is to store dates as UTC midnight, so:
 * - User sets May 11 in Pakistan (UTC+5)
 * - We store it as May 11 00:00 UTC (which displays as May 11 05:00 Pakistan time)
 * - This way, all users see May 11 regardless of timezone
 */

async function migrateComprehensive() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('Starting comprehensive date migration...\n');
    
    // Get all projects with dates
    const [projects] = await conn.execute(
      'SELECT id, name, startDate, estimatedEndDate FROM projects WHERE startDate IS NOT NULL'
    );
    
    console.log(`Found ${projects.length} projects with start dates\n`);
    
    let updatedCount = 0;
    
    for (const project of projects) {
      const oldStartDate = new Date(project.startDate);
      const oldEndDate = project.estimatedEndDate ? new Date(project.estimatedEndDate) : null;
      
      // Step 1: Undo previous migrations by subtracting 52 hours
      const undoneStartDate = new Date(oldStartDate.getTime() - (52 * 60 * 60 * 1000));
      const undoneEndDate = oldEndDate ? new Date(oldEndDate.getTime() - (52 * 60 * 60 * 1000)) : null;
      
      // Step 2: Apply correct fix
      // Extract the UTC date and create a new date at midnight UTC
      // This represents the actual date the user set
      const startYear = undoneStartDate.getUTCFullYear();
      const startMonth = undoneStartDate.getUTCMonth();
      const startDay = undoneStartDate.getUTCDate();
      const newStartDate = new Date(Date.UTC(startYear, startMonth, startDay, 0, 0, 0, 0));
      
      let newEndDate = null;
      if (undoneEndDate) {
        const endYear = undoneEndDate.getUTCFullYear();
        const endMonth = undoneEndDate.getUTCMonth();
        const endDay = undoneEndDate.getUTCDate();
        newEndDate = new Date(Date.UTC(endYear, endMonth, endDay, 23, 59, 59, 999));
      }
      
      // Update the database
      await conn.execute(
        'UPDATE projects SET startDate = ?, estimatedEndDate = ? WHERE id = ?',
        [newStartDate.toISOString(), newEndDate ? newEndDate.toISOString() : null, project.id]
      );
      
      console.log(`✓ Updated: ${project.name}`);
      console.log(`  Original:  ${oldStartDate.toISOString()}`);
      console.log(`  Undone:    ${undoneStartDate.toISOString()}`);
      console.log(`  Final:     ${newStartDate.toISOString()}`);
      if (oldEndDate) {
        console.log(`  End Final: ${newEndDate.toISOString()}`);
      }
      console.log();
      
      updatedCount++;
    }
    
    console.log(`\nComprehensive migration complete! Updated ${updatedCount} projects`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    conn.end();
  }
}

migrateComprehensive();
