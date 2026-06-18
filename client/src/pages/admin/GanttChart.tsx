import { StatusDot } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, getStatusIndex, PROJECT_STATUSES } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { useMemo } from "react";

interface Project {
  id: number;
  name: string;
  status: string;
  startDate?: Date | null;
  estimatedEndDate?: Date | null;
  borough?: string | null;
}

interface GanttChartProps {
  projects: Project[];
}

const STATUS_COLORS = [
  "oklch(0.60 0.18 240)", // Shop Drawings - blue
  "oklch(0.65 0.16 75)",  // Fabrication - amber
  "oklch(0.65 0.18 50)",  // On-Site - orange
  "oklch(0.60 0.16 160)", // Installed - emerald
  "oklch(0.60 0.16 145)", // Inspection Passed - green
];

export default function GanttChart({ projects }: GanttChartProps) {
  const projectsWithDates = projects.filter((p) => p.startDate);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (projectsWithDates.length === 0) {
      const now = new Date();
      return {
        minDate: now,
        maxDate: new Date(now.getTime() + 90 * 86400000),
        totalDays: 90,
      };
    }
    const starts = projectsWithDates.map((p) => new Date(p.startDate!).getTime());
    const ends = projectsWithDates.map((p) =>
      p.estimatedEndDate
        ? new Date(p.estimatedEndDate).getTime()
        : new Date(p.startDate!).getTime() + 60 * 86400000
    );
    const minTs = Math.min(...starts);
    const maxTs = Math.max(...ends);
    const minDate = new Date(minTs - 7 * 86400000);
    const maxDate = new Date(maxTs + 7 * 86400000);
    const totalDays = Math.max(30, (maxDate.getTime() - minDate.getTime()) / 86400000);
    return { minDate, maxDate, totalDays };
  }, [projectsWithDates]);

  // Generate month markers
  const months = useMemo(() => {
    const result: { label: string; pct: number }[] = [];
    const d = new Date(minDate);
    d.setDate(1);
    while (d <= maxDate) {
      const pct = ((d.getTime() - minDate.getTime()) / 86400000 / totalDays) * 100;
      if (pct >= 0 && pct <= 100) {
        result.push({
          label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          pct,
        });
      }
      d.setMonth(d.getMonth() + 1);
    }
    return result;
  }, [minDate, maxDate, totalDays]);

  if (projectsWithDates.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-16 text-center">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No projects with dates to display</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Add start dates to projects to see them on the timeline
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Project Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Month header */}
          <div className="flex border-b border-border bg-muted/20">
            <div className="w-56 flex-shrink-0 px-4 py-2 text-xs text-muted-foreground font-medium border-r border-border">
              Project
            </div>
            <div className="flex-1 relative h-8">
              {months.map((m) => (
                <div
                  key={m.label}
                  className="absolute top-0 h-full flex items-center"
                  style={{ left: `${m.pct}%` }}
                >
                  <div className="h-full w-px bg-border" />
                  <span className="text-xs text-muted-foreground ml-1 whitespace-nowrap">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Project rows */}
          {projectsWithDates.map((project) => {
            const start = new Date(project.startDate!).getTime();
            const end = project.estimatedEndDate
              ? new Date(project.estimatedEndDate).getTime()
              : start + 60 * 86400000;
            const minTs = minDate.getTime();
            const range = totalDays * 86400000;
            const leftPct = ((start - minTs) / range) * 100;
            const widthPct = Math.max(0.5, ((end - start) / range) * 100);
            const colorIdx = getStatusIndex(project.status);
            const color = STATUS_COLORS[colorIdx] ?? STATUS_COLORS[0];

            return (
              <div key={project.id} className="flex border-b border-border/50 hover:bg-accent/20 transition-colors group">
                <div className="w-56 flex-shrink-0 px-4 py-3 border-r border-border/50">
                  <div className="flex items-center gap-2">
                    <StatusDot status={project.status} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{project.borough ?? ""}</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 relative py-3 px-2">
                  {/* Grid lines */}
                  {months.map((m) => (
                    <div
                      key={m.label}
                      className="absolute top-0 h-full w-px bg-border/30"
                      style={{ left: `${m.pct}%` }}
                    />
                  ))}
                  {/* Bar */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-5 rounded-full flex items-center px-2 overflow-hidden"
                    style={{
                      left: `${Math.max(0, leftPct)}%`,
                      width: `${Math.min(widthPct, 100 - Math.max(0, leftPct))}%`,
                      background: color,
                      opacity: 0.85,
                    }}
                    title={`${formatDate(project.startDate)} → ${formatDate(project.estimatedEndDate)}`}
                  >
                    <span className="text-xs text-white font-medium truncate opacity-90">
                      {project.name}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
