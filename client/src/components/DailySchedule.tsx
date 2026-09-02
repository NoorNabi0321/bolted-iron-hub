import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, X, FileDown, Mail, MessageCircle, Star, Layers, Link2Off } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { nyToday } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
  const today = nyToday();
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

  // "Unfinished items" filter: jobs with any open checklist item, incl. passed inspection.
  const [unfinishedOnly, setUnfinishedOnly] = useState(false);
  const { data: unfinishedProjects = [] } = trpc.projects.list.useQuery(
    { unfinishedOnly: true },
    { enabled: unfinishedOnly }
  );
  const scheduleProjects = (unfinishedOnly ? unfinishedProjects : projects) as typeof projects;

  // ── Daily combinations (drag/long-press a job onto another to merge for a day) ──
  const { data: combinations = [] } = trpc.projects.scheduleCombinations.useQuery();
  const combineMutation = trpc.projects.combineProjects.useMutation({
    onSuccess: () => utils.projects.scheduleCombinations.invalidate(),
    onError: (e) => toast.error(e.message || "Failed to combine jobs"),
  });
  const uncombineMutation = trpc.projects.uncombineProject.useMutation({
    onSuccess: () => utils.projects.scheduleCombinations.invalidate(),
  });
  const [armed, setArmed] = useState<{ id: number; day: string } | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [comboDialog, setComboDialog] = useState<{ day: string; projects: { id: number; name: string }[] } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragOverIdRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const pointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  useEffect(() => { dragOverIdRef.current = dragOverId; }, [dragOverId]);

  const vibrate = (ms: number) => { try { (navigator as any).vibrate?.(ms); } catch {} };

  const moveGhost = (x: number, y: number) => {
    if (ghostRef.current) {
      ghostRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -140%)`;
    }
  };

  // While a job is "picked up" (long-press), track the finger/cursor across cards
  // so the job it is hovering over highlights blue, a floating chip follows the
  // finger, and the page can't scroll under the drag. Drop = combine on release.
  useEffect(() => {
    if (!armed) return;
    const onMove = (e: PointerEvent) => {
      pointerPosRef.current = { x: e.clientX, y: e.clientY };
      moveGhost(e.clientX, e.clientY);
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const card = el?.closest("[data-project-id]") as HTMLElement | null;
      let next: number | null = null;
      if (card && card.getAttribute("data-day") === armed.day) {
        const tid = Number(card.getAttribute("data-project-id"));
        if (tid && tid !== armed.id) next = tid;
      }
      if (next !== dragOverIdRef.current) {
        if (next) vibrate(12); // tick when a new target lights up
        setDragOverId(next);
      }
    };
    // Hard scroll-lock: a non-passive touchmove that preventDefaults keeps the
    // list still under the finger so the drag feels anchored, not scrolly.
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); };
    const onUp = () => {
      const target = dragOverIdRef.current;
      if (target && target !== armed.id) {
        vibrate(25);
        combineMutation.mutate({ day: armed.day, sourceId: armed.id, targetId: target });
      }
      setArmed(null);
      setDragOverId(null);
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 350);
    };
    moveGhost(pointerPosRef.current.x, pointerPosRef.current.y);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("touchmove", onTouchMove);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed]);

  const dayKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  const combosByDay = useMemo(() => {
    const map = new Map<string, number[][]>();
    for (const c of combinations) {
      if (!map.has(c.day)) map.set(c.day, []);
      map.get(c.day)!.push(c.projectIds);
    }
    return map;
  }, [combinations]);

  // Resolve any project by id (from the full list, not just the day's scheduled
  // ones) so a combined job that later leaves a day's list — e.g. moved to
  // "Inspection Passed" — stays inside its group instead of dissolving it.
  const projectById = useMemo(() => {
    const map = new Map<number, Project>();
    for (const p of projects) map.set(p.id, p);
    return map;
  }, [projects]);

  // Whether a project passes the user-driven Status / Subcontractor filters.
  // (Kept separate from the date/inspection scheduling rules so a combined group
  // still honours these filters without dissolving over inspection state.)
  const passesUserFilters = (p: Project) => {
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(p.status)) return false;
    if (selectedSubIds.length > 0) {
      const assigns = projectAssignments[p.id] || [];
      if (!assigns.some((a) => selectedSubIds.includes(a.subcontractorId))) return false;
    }
    return true;
  };

  const startArm = (id: number, day: string) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setArmed({ id, day });
      vibrate(30); // "grabbed" buzz
    }, 250);
  };
  const cancelArm = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const subsMap = useMemo(() => {
    const map = new Map<number, string>();
    subcontractors.forEach((s) => map.set(s.id, s.companyName));
    return map;
  }, [subcontractors]);

  // Fetch assignments for all projects
  useEffect(() => {
    let cancelled = false;
    
    const fetchAllAssignments = async () => {
      if (scheduleProjects.length === 0) return;

      const assignments: Record<number, ProjectAssignment[]> = {};
      const promises = scheduleProjects.map(async (project) => {
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
  }, [scheduleProjects.map(p => p.id).join(','), utils]);

  // Generate 7 days starting from today + weekOffset
  const days = useMemo(() => {
    const today = nyToday();
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
    return scheduleProjects.filter((p) => {
      // Auto-remove 'Inspection Passed' — unless the Unfinished-items filter is on,
      // which is meant to surface passed jobs that still have open items.
      if (!unfinishedOnly && p.status === 'Inspection Passed') return false;
      
      const start = toDate(p.startDate);
      const end = toDate(p.estimatedEndDate);

      let shouldAppear = false;

      if (unfinishedOnly) {
        // Surface every unfinished job across the week: from its start date onwards
        // (ignoring end date so passed jobs still show), or on all days if no start.
        if (!start) {
          shouldAppear = true;
        } else {
          const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
          const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          shouldAppear = dayStart >= rangeStart;
        }
      } else {
        // Project must have a start date
        if (!start) return false;

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
    const statuses = new Set(scheduleProjects.map(p => p.status));
    return Array.from(statuses).sort();
  }, [projects]);

  // Get dates with projects for calendar highlighting
  const datesWithProjects = useMemo(() => {
    const dates = new Set<string>();
    const today = nyToday();
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

  const today = nyToday();

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

          {/* Unfinished-items filter */}
          <button
            onClick={() => setUnfinishedOnly((v) => !v)}
            className={`px-2 py-1 text-xs rounded border transition-colors flex items-center gap-1 ${
              unfinishedOnly ? "bg-amber-600 text-white border-amber-600" : "border-border hover:bg-accent"
            }`}
            title="Jobs with open (unfinished) checklist items — including passed inspection"
          >
            Unfinished items
          </button>

          {/* Clear filters button */}
          {(selectedDate || selectedSubIds.length > 0 || selectedStatuses.length > 0 || unfinishedOnly) && (
            <button
              onClick={() => {
                setSelectedDate(null);
                setSelectedSubIds([]);
                setSelectedStatuses([]);
                setUnfinishedOnly(false);
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
            const dk = dayKey(day);
            // A combination is anchored to a calendar day: it renders on that day's
            // row until the day itself scrolls out of the window. Members are looked
            // up by id from ALL projects (not just this day's scheduled ones) so a
            // job that left the list — e.g. moved to "Inspection Passed" — keeps the
            // group intact instead of splitting it apart.
            const showCombosHere = !selectedDate || isSameDay(day, selectedDate);
            const dayCombos = showCombosHere
              ? (combosByDay.get(dk) ?? [])
                  .map((ids) => ids.map((id) => projectById.get(id)).filter((p): p is Project => !!p))
                  // keep the group intact across inspection state, but still honour
                  // the Status / Sub filters — hide a group none of whose jobs match.
                  .filter((members) => members.length >= 2 && members.some(passesUserFilters))
              : [];
            const comboMemberIds = new Set(dayCombos.flat().map((p) => p.id));

            // Hide empty days when filters are applied
            const hasActiveFilters = selectedDate || selectedSubIds.length > 0 || selectedStatuses.length > 0 || unfinishedOnly;
            if (hasActiveFilters && dayProjects.length === 0 && dayCombos.length === 0) {
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
                    {dayProjects.length === 0 && dayCombos.length === 0 ? (
                      <p className={`text-xs sm:text-sm py-1 ${isPast ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                        No jobs scheduled
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {armed && armed.day === dk && (
                          <p className="text-[10px] text-blue-600 font-medium px-1">
                            Drag onto another job to combine — release on the highlighted job.
                          </p>
                        )}
                        {dayCombos.map((members, gi) => {
                          const anchorId = members[0].id;
                          const isDropTarget = dragOverId === anchorId && armed?.day === dk;
                          return (
                            <div
                              key={`combo-${gi}`}
                              data-project-id={anchorId}
                              data-day={dk}
                              onClick={() => {
                                if (suppressClickRef.current) return;
                                setComboDialog({ day: dk, projects: members.map((m) => ({ id: m.id, name: m.name })) });
                              }}
                              className={`flex items-center gap-2 p-1.5 sm:p-2 rounded-md cursor-pointer border transition-all ${
                                isDropTarget
                                  ? "bg-blue-100 border-blue-400 ring-2 ring-blue-400"
                                  : "bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
                              }`}
                            >
                              <Layers className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-indigo-900 truncate">
                                  {members.map((m) => m.name).join("  +  ")}
                                </p>
                                <p className="text-[10px] sm:text-xs text-indigo-600 mt-0.5">
                                  {members.length} jobs combined — tap to open one
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        {dayProjects.filter((p) => !comboMemberIds.has(p.id)).map((project) => {
                          const isPickedUp = armed?.id === project.id;
                          const isDropTarget = dragOverId === project.id && armed?.day === dk && armed?.id !== project.id;
                          const isPotentialTarget = !!armed && armed.day === dk && armed.id !== project.id && !isDropTarget;
                          const effStatus = statusOverrides[project.id] || project.status;
                          const isMeasurements = effStatus === "Measurements";
                          return (
                          <div
                            key={project.id}
                            data-project-id={project.id}
                            data-day={dk}
                            style={{ touchAction: armed ? "none" : "pan-y" }}
                            onPointerDown={(e) => { if (e.button != null && e.button > 0) return; pointerPosRef.current = { x: e.clientX, y: e.clientY }; startArm(project.id, dk); }}
                            onPointerMove={() => { if (!armed) cancelArm(); }}
                            onPointerUp={() => { if (!armed) cancelArm(); }}
                            onPointerLeave={() => { if (!armed) cancelArm(); }}
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('button')) return;
                              if (suppressClickRef.current || armed) return;
                              setLocation(`/projects/${project.id}`);
                            }}
                            className={`flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-md cursor-pointer transition-all group select-none ${
                              isPickedUp
                                ? "border-2 border-dashed border-indigo-300 bg-indigo-50/50 opacity-50"
                                : isDropTarget
                                ? "ring-2 ring-blue-500 bg-blue-100"
                                : isPotentialTarget
                                ? "ring-1 ring-blue-200 bg-blue-50/50"
                                : ""
                            } ${
                              isPickedUp || isDropTarget || isPotentialTarget
                                ? ""
                                : project.isUrgent
                                ? "bg-yellow-50 hover:bg-yellow-100"
                                : isMeasurements
                                ? "bg-blue-50 hover:bg-blue-100"
                                : "hover:bg-accent/50"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <p className={`text-xs sm:text-sm font-medium truncate group-hover:text-red-600 transition-colors ${isMeasurements ? "text-blue-700" : "text-foreground"}`}>
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
                            {isPickedUp ? (
                              <span className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-indigo-600 flex-shrink-0">
                                <Layers className="w-3 h-3" /> Dragging…
                              </span>
                            ) : (
                              <StatusBadge status={statusOverrides[project.id] || project.status} projectId={project.id} className="text-[10px] sm:text-xs flex-shrink-0" onStatusChange={(newStatus) => setStatusOverrides({...statusOverrides, [project.id]: newStatus})} />
                            )}
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Floating drag chip that follows the finger while a job is picked up */}
      {armed && (
        <div
          ref={(el) => {
            ghostRef.current = el;
            if (el) {
              const { x, y } = pointerPosRef.current;
              el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -140%)`;
            }
          }}
          className="fixed left-0 top-0 z-[60] pointer-events-none"
        >
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white shadow-2xl text-xs font-semibold whitespace-nowrap opacity-95">
            <Layers className="w-4 h-4" />
            {projectById.get(armed.id)?.name ?? "Job"}
          </div>
        </div>
      )}

      {/* Combined-jobs chooser */}
      <Dialog open={!!comboDialog} onOpenChange={(o) => !o && setComboDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Combined jobs</DialogTitle>
            <DialogDescription>Which job would you like to open?</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {comboDialog?.projects.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1 justify-start"
                  onClick={() => {
                    setComboDialog(null);
                    setLocation(`/projects/${p.id}`);
                  }}
                >
                  {p.name}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Remove this job from the combination"
                  onClick={() => {
                    if (!comboDialog) return;
                    uncombineMutation.mutate({ day: comboDialog.day, projectId: p.id });
                    const remaining = comboDialog.projects.filter((x) => x.id !== p.id);
                    setComboDialog(remaining.length >= 2 ? { ...comboDialog, projects: remaining } : null);
                  }}
                >
                  <Link2Off className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
