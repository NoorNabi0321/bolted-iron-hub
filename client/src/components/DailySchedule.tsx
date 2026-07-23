import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, X, FileDown, Mail, MessageCircle, Star } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusFilterDropdown } from "@/components/StatusFilterDropdown";
import { SubcontractorFilterDropdown } from "@/components/SubcontractorFilterDropdown";

interface Project {
  id: number;
  name: string;
  address: string | null;
  borough: string | null;
  status: string;
  startDate: Date | string | null;
  estimatedEndDate: Date | string | null;
  primarySubcontractorId: number | null;
}

interface Subcontractor {
  id: number;
  companyName: string;
}

interface ProjectAssignment {
  id: number;
  projectId: number;
  subcontractorId: number;
  role: string | null;
  assignedAt: Date | string;
  subcontractor: {
    id: number;
    companyName: string;
  };
}

interface DailyScheduleProps {
  projects: Project[];
  subcontractors: Subcontractor[];
}

function toDate(d: Date | string | null): Date | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return isNaN(date.getTime()) ? null : date;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isWithinRange(day: Date, start: Date | null, end: Date | null): boolean {
  if (!start) return false;
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const rangeEnd = end
    ? new Date(end.getFullYear(), end.getMonth(), end.getDate())
    : rangeStart;
  return dayStart >= rangeStart && dayStart <= rangeEnd;
}

function formatDayLabel(date: Date): string {
  const today = new Date();
  if (isSameDay(date, today)) return "Today";
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(date, tomorrow)) return "Tomorrow";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function DailySchedule({ projects, subcontractors }: DailyScheduleProps) {
  const [, setLocation] = useLocation();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSubIds, setSelectedSubIds] = useState<number[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<Record<number, ProjectAssignment[]>>({});
  const [showPDFDialog, setShowPDFDialog] = useState(false);
  const [pdfData, setPdfData] = useState<{ url: string; filename: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const utils = trpc.useUtils();
  const [statusOverrides, setStatusOverrides] = useState<Record<number, string>>({});
  const exportPDFMutation = trpc.projects.exportSchedulePDF.useMutation();

  const subsMap = useMemo(() => {
    const map = new Map<number, string>();
    subcontractors.forEach((s) => map.set(s.id, s.companyName));
    return map;
  }, [subcontractors]);

  // Fetch assignments for all projects
  useEffect(() => {
    let cancelled = false;
    
    const fetchAllAssignments = async () => {
      if (projects.length === 0) return;
      
      const assignments: Record<number, ProjectAssignment[]> = {};
      const promises = projects.map(async (project) => {
        try {
          const result = await utils.projects.getAssignments.fetch({ projectId: project.id });
          if (!cancelled) {
            assignments[project.id] = result || [];
          }
        } catch (error) {
          if (!cancelled) {
            assignments[project.id] = [];
          }
        }
      });
      
      await Promise.all(promises);
      if (!cancelled) {
        setProjectAssignments(assignments);
      }
    };
    
    fetchAllAssignments();
    
    return () => {
      cancelled = true;
    };
  }, [projects.map(p => p.id).join(','), utils]);

  // Generate 7 days starting from today + weekOffset
  const days = useMemo(() => {
    const today = new Date();
    // Start from today (not Sunday) and add weekOffset weeks
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  // Get projects scheduled for a specific day with filters applied
  const getProjectsForDay = (day: Date) => {
    return projects.filter((p) => {
      // Auto-remove projects with 'Inspection Passed' status
      if (p.status === 'Inspection Passed') return false;
      
      const start = toDate(p.startDate);
      const end = toDate(p.estimatedEndDate);
      
      // Project must have a start date
      if (!start) return false;
      
      // Determine if project should appear on this day
      let shouldAppear = false;
      
      if (end) {
        // If both start and end dates exist, show on all days in range
        shouldAppear = isWithinRange(day, start, end);
      } else if (p.status === "Review") {
        // No end date + Review: hide (Inspection Passed is already excluded above).
        shouldAppear = false;
      } else {
        // No estimated end date: show every day from the start date onwards,
        // until the project moves to Inspection Passed or Review.
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        shouldAppear = dayStart >= rangeStart;
      }
      
      if (!shouldAppear) return false;
      
      // Apply date filter
      if (selectedDate && !isSameDay(day, selectedDate)) return false;
      
      // Apply status filter (multi-select: show if status is in selectedStatuses or if no statuses selected)
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(p.status)) return false;
      
      // Apply subcontractor filter
      if (selectedSubIds.length > 0) {
        // Check if project has any assignments to any of the selected subcontractors
        const projectAssigns = projectAssignments[p.id] || [];
        const hasSubcontractor = projectAssigns.some(a => selectedSubIds.includes(a.subcontractorId));
        if (!hasSubcontractor) return false;
      }
      
      return true;
    });
  };

  // Get all unique statuses from projects
  const allStatuses = useMemo(() => {
    const statuses = new Set(projects.map(p => p.status));
    return Array.from(statuses).sort();
  }, [projects]);

  // Get dates with projects for calendar highlighting
  const datesWithProjects = useMemo(() => {
    const dates = new Set<string>();
    const today = new Date();
    const maxDaysAhead = 365; // Show up to 1 year ahead for single-date projects
    
    projects.forEach(p => {
      // Skip projects with 'Inspection Passed' status
      if (p.status === 'Inspection Passed') return;
      
      const start = toDate(p.startDate);
      const end = toDate(p.estimatedEndDate);
      
      if (start) {
        if (end) {
          // If both start and end dates exist, add all days in range
          let current = new Date(start);
          while (current <= end) {
            dates.add(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }
        } else {
          // If only start date exists, behavior depends on project status
          if (p.status === "Shop Drawings" || p.status === "Review") {
            // For Shop Drawings and Review: only add the start date
            dates.add(start.toISOString().split('T')[0]);
          } else {
            // For other statuses: add start date and all subsequent days up to maxDaysAhead
            let current = new Date(start);
            const maxDate = new Date(today);
            maxDate.setDate(maxDate.getDate() + maxDaysAhead);
            while (current <= maxDate) {
              dates.add(current.toISOString().split('T')[0]);
              current.setDate(current.getDate() + 1);
            }
          }
        }
      }
    });
    return dates;
  }, [projects]);

  const weekLabel = useMemo(() => {
    const start = days[0];
    const end = days[6];
    const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${startStr} – ${endStr}`;
  }, [days]);

  const today = new Date();

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="w-5 h-5 text-red-500" />
            Weekly Schedule
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setWeekOffset((w) => w - 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <button
              onClick={() => setWeekOffset(0)}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors px-2"
            >
              {weekLabel}
            </button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setWeekOffset((w) => w + 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setIsExporting(true);
                try {
                  const weekStart = days[0].getTime();
                  const weekEnd = days[6].getTime();
                  const timezoneOffset = new Date().getTimezoneOffset(); // Minutes offset from UTC
                  const result = await exportPDFMutation.mutateAsync({
                    weekStart,
                    weekEnd,
                    timezoneOffset,
                    statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
                    subcontractorIds: selectedSubIds.length > 0 ? selectedSubIds : undefined,
                    selectedDate: selectedDate ? selectedDate.getTime() : undefined,
                  });
                  setPdfData(result);
                  setShowPDFDialog(true);
                } catch (error) {
                  console.error("Failed to export PDF", error);
                } finally {
                  setIsExporting(false);
                }
              }}
              disabled={isExporting}
              className="gap-1"
            >
              <FileDown className="w-4 h-4" />
              {isExporting ? "Exporting..." : "Export PDF"}
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Date Filter Calendar */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">Date:</span>
            <button
              onClick={() => setSelectedDate(null)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                selectedDate === null
                  ? 'bg-red-100 border-red-300 text-red-700'
                  : 'border-border hover:bg-accent'
              }`}
            >
              All
            </button>
            {days.map(day => {
              const dateStr = day.toISOString().split('T')[0];
              const hasProjects = datesWithProjects.has(dateStr);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                  disabled={!hasProjects}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    isSelected
                      ? 'bg-red-100 border-red-300 text-red-700'
                      : hasProjects
                      ? 'border-border hover:bg-accent cursor-pointer'
                      : 'border-border/30 text-muted-foreground/30 cursor-not-allowed'
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {/* Subcontractor Filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground">Sub:</span>
            <SubcontractorFilterDropdown
              subcontractors={subcontractors}
              selectedSubIds={selectedSubIds}
              onSubcontractorChange={setSelectedSubIds}
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground">Status:</span>
            <StatusFilterDropdown
              selectedStatuses={selectedStatuses}
              onStatusChange={setSelectedStatuses}
            />
          </div>

          {/* Clear filters button */}
          {(selectedDate || selectedSubIds.length > 0 || selectedStatuses.length > 0) && (
            <button
              onClick={() => {
                setSelectedDate(null);
                setSelectedSubIds([]);
                setSelectedStatuses([]);
              }}
              className="px-2 py-1 text-xs rounded border border-border hover:bg-accent transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {days.map((day) => {
            const dayProjects = getProjectsForDay(day);
            const isToday = isSameDay(day, today);
            const isPast = day < today && !isToday;
            const dayLabel = formatDayLabel(day);
            const weekday = day.toLocaleDateString("en-US", { weekday: "short" });
            const dateNum = day.getDate();

            // Hide empty days when filters are applied
            const hasActiveFilters = selectedDate || selectedSubIds.length > 0 || selectedStatuses.length > 0;
            if (hasActiveFilters && dayProjects.length === 0) {
              return null;
            }

            return (
              <div
                key={day.toISOString()}
                className={`rounded-lg border transition-all ${
                  isToday
                    ? "border-red-300 bg-red-50/50"
                    : isPast
                    ? "border-border/50 bg-muted/20"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-stretch">
                  {/* Day label */}
                  <div
                    className={`flex flex-col items-center justify-center px-3 sm:px-4 py-3 border-r min-w-[60px] sm:min-w-[72px] ${
                      isToday ? "border-red-200 bg-red-100/60" : "border-border/50"
                    }`}
                  >
                    <span className={`text-xs font-medium ${isToday ? "text-red-600" : "text-muted-foreground"}`}>
                      {weekday}
                    </span>
                    <span className={`text-lg sm:text-xl font-bold ${isToday ? "text-red-600" : isPast ? "text-muted-foreground" : "text-foreground"}`}>
                      {dateNum}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">Today</span>
                    )}
                  </div>

                  {/* Projects for this day */}
                  <div className="flex-1 p-2 sm:p-3">
                    {dayProjects.length === 0 ? (
                      <p className={`text-xs sm:text-sm py-1 ${isPast ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                        No jobs scheduled
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {dayProjects.map((project) => (
                          <div
                            key={project.id}
                            onClick={(e) => {
                              // Don't navigate if clicking on status badge
                              if ((e.target as HTMLElement).closest('button')) return;
                              setLocation(`/projects/${project.id}`);
                            }}
                            className={`flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-md cursor-pointer transition-colors group ${
                              project.isUrgent
                                ? "bg-yellow-50 hover:bg-yellow-100"
                                : "hover:bg-accent/50"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="text-xs sm:text-sm font-medium text-foreground truncate group-hover:text-red-600 transition-colors">
                                  {project.name}
                                  {project.isUrgent && <span className="ml-1 text-orange-700">*</span>}
                                </p>
                                {project.isUrgent && (
                                  <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600 fill-yellow-600 flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mt-0.5 flex-wrap">
                                {project.address && (
                                  <span className="flex items-center gap-0.5 truncate">
                                    <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                                    <span className="truncate">{project.address}</span>
                                  </span>
                                )}
                                {/* Show all assigned subcontractors */}
                                {(projectAssignments[project.id]?.length ?? 0) > 0 && (
                                  <span className="flex items-center gap-0.5 flex-wrap">
                                    {projectAssignments[project.id]!.map((assignment, idx) => (
                                      <span key={assignment.id} className="inline-flex items-center gap-0.5">
                                        {idx > 0 && <span className="text-muted-foreground/50">,</span>}
                                        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                                        <span className="truncate">{assignment.subcontractor.companyName}</span>
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </div>
                            </div>
                            <StatusBadge status={statusOverrides[project.id] || project.status} projectId={project.id} className="text-[10px] sm:text-xs flex-shrink-0" onStatusChange={(newStatus) => setStatusOverrides({...statusOverrides, [project.id]: newStatus})} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* PDF Preview Dialog */}
      <Dialog open={showPDFDialog} onOpenChange={setShowPDFDialog}>
        <DialogContent className="w-[95vw] h-[95vh] max-w-none flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Weekly Schedule PDF Report</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto bg-muted/30">
              {pdfData ? (
                <iframe
                  src={pdfData.url}
                  className="w-full h-full"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Loading PDF...</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="px-6 py-4 flex gap-2 bg-background border-t flex-wrap justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPDFDialog(false)}>
                Cancel
              </Button>
              {pdfData && (
                <Button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = pdfData.url;
                    link.download = pdfData.filename;
                    link.click();
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
            {pdfData && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const subject = encodeURIComponent("Weekly Schedule Report");
                    const body = encodeURIComponent(`Check out the Weekly Schedule Report:\n\n${pdfData.url}`);
                    const userAgent = navigator.userAgent.toLowerCase();
                    const isIOS = /iphone|ipad|ipod/.test(userAgent);
                    const isAndroid = /android/.test(userAgent);
                    const isMobile = isIOS || isAndroid;

                    if (isMobile) {
                      // On mobile, use mailto: which opens the default email app
                      window.location.href = `mailto:?subject=${subject}&body=${body}`;
                    } else {
                      // On desktop, open Gmail web
                      window.open(`https://mail.google.com/mail/u/0/?view=cm&fs=1&su=${subject}&body=${body}`, "_blank");
                    }
                  }}
                  className="gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span className="hidden sm:inline">Gmail</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const text = encodeURIComponent(`Check out the Weekly Schedule Report: ${pdfData.url}`);
                    const userAgent = navigator.userAgent.toLowerCase();
                    const isIOS = /iphone|ipad|ipod/.test(userAgent);
                    const isAndroid = /android/.test(userAgent);
                    const isMobile = isIOS || isAndroid;

                    if (isMobile) {
                      // On mobile, use WhatsApp deep link to open native app
                      window.open(`whatsapp://send?text=${text}`, "_blank");
                    } else {
                      // On desktop, use WhatsApp Web
                      window.open(`https://wa.me/?text=${text}`, "_blank");
                    }
                  }}
                  className="gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
