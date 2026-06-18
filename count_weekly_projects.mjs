import { getDb } from './server/db.ts';
import { projects } from './drizzle/schema.ts';
import { ne } from 'drizzle-orm';

const db = getDb();

// Helper functions from DailySchedule.tsx
function toDate(d) {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  return isNaN(date.getTime()) ? null : date;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isWithinRange(day, start, end) {
  if (!start) return false;
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const rangeEnd = end
    ? new Date(end.getFullYear(), end.getMonth(), end.getDate())
    : rangeStart;
  return dayStart >= rangeStart && dayStart <= rangeEnd;
}

// Get all projects excluding Inspection Passed
const allProjects = await db.select().from(projects).where(ne(projects.status, 'Inspection Passed'));

console.log('Weekly Schedule Project Count Analysis');
console.log('======================================\n');

// Generate 7 days starting from today
const today = new Date();
today.setHours(0, 0, 0, 0);
const days = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(today);
  d.setDate(today.getDate() + i);
  return d;
});

const dayLabels = ['Tue 18', 'Wed 19', 'Thu 20', 'Fri 21', 'Sat 22', 'Sun 23', 'Mon 24'];

let totalCount = 0;

days.forEach((day, index) => {
  const dayLabel = dayLabels[index];
  
  const projectsForDay = allProjects.filter(p => {
    const start = toDate(p.startDate);
    const end = toDate(p.estimatedEndDate);
    
    if (!start) return false;
    
    let shouldAppear = false;
    
    if (end) {
      shouldAppear = isWithinRange(day, start, end);
    } else {
      if (p.status === 'Shop Drawings' || p.status === 'Review') {
        shouldAppear = isSameDay(day, start);
      } else {
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        shouldAppear = dayStart >= rangeStart;
      }
    }
    
    return shouldAppear;
  });
  
  const count = projectsForDay.length;
  totalCount += count;
  console.log(`${dayLabel}: ${count} projects`);
});

console.log('\n======================================');
console.log(`Total: ${totalCount} projects`);

process.exit(0);
