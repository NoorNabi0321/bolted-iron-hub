import CRMLayout from "@/components/CRMLayout";
import { StatusBadge } from "@/components/StatusBadge";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { formatDate, formatTime, PROJECT_STATUSES } from "@/lib/utils";
import { Calendar, FolderOpen, List, Plus, Search, X, Trash2, FileDown, Mail, MessageCircle, Star } from "lucide-react";
import { useState, useEffect } from "react";
import React from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import ProjectForm from "./ProjectForm";
import GanttChart from "./GanttChart";
import { useNavigation } from "@/contexts/NavigationContext";

type ViewMode = "list" | "gantt";

export default function AdminProjects() {
  const [, setLocation] = useLocation();
  const [pendingNavigation, setPendingNavigation] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (pendingNavigation) {
      sessionStorage.setItem('projectReferrer', 'projects');
      setLocation(`/projects/${pendingNavigation}`);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, setLocation]);
  const { setReferrerSource } = useNavigation();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subFilter, setSubFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [statusOverrides, setStatusOverrides] = useState<Record<number, string>>({});
  const [dateOverrides, setDateOverrides] = useState<Record<number, { startDate?: number | null; estimatedEndDate?: number | null }>>({});
  const [editingDateField, setEditingDateField] = useState<{ projectId: number; field: 'startDate' | 'estimatedEndDate' } | null>(null);
  const [isUnassigned, setIsUnassigned] = useState(false);
  const [projectAssignments, setProjectAssignments] = useState<Record<number, any[]>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ projectId: number; projectName: string } | null>(null);
  const [showPDFDialog, setShowPDFDialog] = useState(false);
  const [pdfData, setPdfData] = useState<{ url: string; filename: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);


  const utils = trpc.useUtils();
  const { data: projects = [], isLoading } = trpc.projects.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    subcontractorId: !isUnassigned && subFilter !== "all" ? parseInt(subFilter) : undefined,
    isUnassigned: isUnassigned || undefined,
    isArchived: false,
  });
  const { data: subs = [] } = trpc.subcontractors.list.useQuery();

  const exportPDFMutation = trpc.projects.exportProjectsListPDF.useMutation();

  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      toast.success("Project deleted");
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete project");
    },
  });

  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update project");
    },
  });

  React.useEffect(() => {
    let cancelled = false;
    
    const fetchAllAssignments = async () => {
      if (projects.length === 0) return;
      
      const assignments: Record<number, any[]> = {};
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

  return (
    <CRMLayout>
      <div className="space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {projects.length} active project{projects.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700 text-white gap-2 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <ProjectForm
                onSuccess={() => {
                  setShowCreateDialog(false);
                  utils.projects.list.invalidate();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 sm:gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={isUnassigned ? "not-assigned" : subFilter} onValueChange={(value) => {
              if (value === "not-assigned") {
                setIsUnassigned(true);
                setSubFilter("all");
              } else {
                setIsUnassigned(false);
                setSubFilter(value);
              }
            }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Subcontractor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subs</SelectItem>
                <SelectItem value="not-assigned">Not Assigned</SelectItem>
                {subs.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Export PDF Button */}
            <Dialog open={showPDFDialog} onOpenChange={setShowPDFDialog}>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  setIsExporting(true);
                  try {
                    const result = await exportPDFMutation.mutateAsync({
                      status: statusFilter !== "all" ? (statusFilter as any) : undefined,
                      subcontractorId: !isUnassigned && subFilter !== "all" ? parseInt(subFilter) : undefined,
                      search: search || undefined,
                      isUnassigned: isUnassigned || undefined,
                    });
                    setPdfData(result);
                    setShowPDFDialog(true);
                  } catch (error) {
                    console.error("Failed to export PDF", error);
                    toast.error("Failed to export PDF");
                  } finally {
                    setIsExporting(false);
                  }
                }}
                disabled={isExporting}
                className="gap-2"
                title="Export PDF"
              >
                <FileDown className="w-4 h-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </Button>
              <DialogContent className="w-[95vw] h-[95vh] max-w-none flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                  <DialogTitle>Projects PDF Report</DialogTitle>
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
                <div className="px-6 py-4 flex gap-2 bg-background border-t flex-wrap justify-between">
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
                          const subject = encodeURIComponent("Projects Report");
                          const body = encodeURIComponent(`Check out the Projects Report:\n\n${pdfData.url}`);
                          const userAgent = navigator.userAgent.toLowerCase();
                          const isIOS = /iphone|ipad|ipod/.test(userAgent);
                          const isAndroid = /android/.test(userAgent);
                          const isMobile = isIOS || isAndroid;

                          if (isMobile) {
                            window.location.href = `mailto:?subject=${subject}&body=${body}`;
                          } else {
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
                          const text = encodeURIComponent(`Check out the Projects Report: ${pdfData.url}`);
                          const userAgent = navigator.userAgent.toLowerCase();
                          const isIOS = /iphone|ipad|ipod/.test(userAgent);
                          const isAndroid = /android/.test(userAgent);
                          const isMobile = isIOS || isAndroid;

                          if (isMobile) {
                            window.open(`whatsapp://send?text=${text}`, "_blank");
                          } else {
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
                </div>
              </DialogContent>
            </Dialog>

            {/* View toggle */}
            <div className="hidden sm:flex items-center gap-1 border border-border rounded-lg p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-red-600 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("gantt")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "gantt"
                    ? "bg-red-600 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Gantt view"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === "gantt" ? (
          <GanttChart projects={projects} />
        ) : (
          <Card className="border-border overflow-hidden">
            {isLoading ? (
              <CardContent className="p-4 sm:p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-secondary/50 rounded-lg animate-pulse" />
                ))}
              </CardContent>
            ) : projects.length === 0 ? (
              <CardContent className="py-12 sm:py-16 text-center">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-foreground font-medium">No projects found</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Try adjusting your filters or create a new project
                </p>
              </CardContent>
            ) : (
              <>
                {/* Desktop table header */}
                <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 bg-secondary/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-3">Project Name</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Subcontractor</div>
                  <div className="col-span-2">Start Date</div>
                  <div className="col-span-2">Est. End</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>

                {/* Projects list */}
                <div className="divide-y divide-border">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => setPendingNavigation(project.id)}
                      className={`cursor-pointer transition-colors group ${
                        project.isUrgent
                          ? "bg-yellow-50 hover:bg-yellow-100"
                          : "hover:bg-secondary/30"
                      }`}
                    >
                      {/* Desktop row */}
                      <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 items-center">
                        <div className="col-span-3 min-w-0 flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground truncate group-hover:text-red-600 transition-colors">
                                {project.name}
                              </p>
                              {project.isUrgent && (
                                <Star className="w-4 h-4 text-yellow-600 fill-yellow-600 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {project.address ?? "No address"}
                            </p>
                          </div>
                        </div>
                        <div className="col-span-2 flex items-center">
                          <div onClick={(e) => e.stopPropagation()}>
                            <StatusBadge 
                              status={statusOverrides[project.id] || project.status} 
                              projectId={project.id}
                              onStatusChange={(newStatus) => {
                                // Update UI immediately with local state
                                setStatusOverrides({...statusOverrides, [project.id]: newStatus});
                              }}
                            />
                          </div>
                        </div>
                        <div className="col-span-2 flex items-center gap-1 flex-wrap">
                          {projectAssignments[project.id]?.length > 0 ? (
                            projectAssignments[project.id].map((assignment) => (
                              <span
                                key={assignment.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                              >
                                {assignment.subcontractor.companyName}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                        <div className="col-span-2 flex items-center text-sm text-muted-foreground cursor-pointer hover:opacity-70 transition-opacity" title="Click to edit start date" onClick={(e) => { e.stopPropagation(); setEditingDateField({ projectId: project.id, field: 'startDate' }); }}>
                          {dateOverrides[project.id]?.startDate !== undefined ? (
                            <div className="flex flex-col">
                              <span>
                                {dateOverrides[project.id]?.startDate ? formatDate(new Date(dateOverrides[project.id]?.startDate!)) : "—"}
                              </span>
                              {dateOverrides[project.id]?.startDate && (
                                <span className="text-xs text-muted-foreground/70 mt-0.5">
                                  {new Date(dateOverrides[project.id]?.startDate!).toLocaleDateString('en-US', { weekday: 'long' })}
                                </span>
                              )}
                            </div>
                          ) : project.startDate ? (
                            <div className="flex flex-col">
                              <span>
                                {formatDate(project.startDate)}
                                {project.startTime && ` • ${formatTime(project.startTime)}`}
                              </span>
                              <span className="text-xs text-muted-foreground/70 mt-0.5">
                                {new Date(project.startDate).toLocaleDateString('en-US', { weekday: 'long' })}
                              </span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </div>
                        <div className="col-span-2 flex items-center text-sm text-muted-foreground cursor-pointer hover:opacity-70 transition-opacity" title="Click to edit end date" onClick={(e) => { e.stopPropagation(); setEditingDateField({ projectId: project.id, field: 'estimatedEndDate' }); }}>
                          {dateOverrides[project.id]?.estimatedEndDate !== undefined ? (
                            <div className="flex flex-col">
                              <span>
                                {dateOverrides[project.id]?.estimatedEndDate ? formatDate(new Date(dateOverrides[project.id]?.estimatedEndDate!)) : "—"}
                              </span>
                              {dateOverrides[project.id]?.estimatedEndDate && (
                                <span className="text-xs text-muted-foreground/70 mt-0.5">
                                  {new Date(dateOverrides[project.id]?.estimatedEndDate!).toLocaleDateString('en-US', { weekday: 'long' })}
                                </span>
                              )}
                            </div>
                          ) : project.estimatedEndDate ? (
                            <div className="flex flex-col">
                              <span>
                                {formatDate(project.estimatedEndDate)}
                                {project.estimatedEndTime && ` • ${formatTime(project.estimatedEndTime)}`}
                              </span>
                              <span className="text-xs text-muted-foreground/70 mt-0.5">
                                {new Date(project.estimatedEndDate).toLocaleDateString('en-US', { weekday: 'long' })}
                              </span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </div>
                        <div className="col-span-1 flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({ projectId: project.id, projectName: project.name });
                            }}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600 hover:text-red-700"
                            title="Delete project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Mobile card */}
                      <div className="lg:hidden p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="font-medium text-foreground group-hover:text-red-600 transition-colors">
                            {project.name}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <StatusBadge status={project.status} className="text-xs" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ projectId: project.id, projectName: project.name });
                              }}
                              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-600 hover:text-red-700"
                              title="Delete project"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {project.address ?? "No address"}
                        </p>
                        <div className="flex flex-col gap-2 text-xs">
                          {projectAssignments[project.id]?.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {projectAssignments[project.id].map((assignment) => (
                                <span
                                  key={assignment.id}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                                >
                                  {assignment.subcontractor.companyName}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="text-muted-foreground grid grid-cols-2 gap-3">
                            {project.startDate && (
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-foreground">Start Date</span>
                                <span className="text-sm">{formatDate(project.startDate)}</span>
                                {project.startTime && <span className="text-xs font-medium text-foreground">{formatTime(project.startTime)}</span>}
                                <span className="text-xs text-muted-foreground/70">
                                  {new Date(project.startDate).toLocaleDateString('en-US', { weekday: 'long' })}
                                </span>
                              </div>
                            )}
                            {project.estimatedEndDate && (
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-foreground">End Date</span>
                                <span className="text-sm">{formatDate(project.estimatedEndDate)}</span>
                                {project.estimatedEndTime && <span className="text-xs font-medium text-foreground">{formatTime(project.estimatedEndTime)}</span>}
                                <span className="text-xs text-muted-foreground/70">
                                  {new Date(project.estimatedEndDate).toLocaleDateString('en-US', { weekday: 'long' })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirm && (
          <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Project?</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Are you sure you want to delete <strong>{deleteConfirm.projectName}</strong>? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirm(null)}
                  >
                    No, Cancel
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => deleteMutation.mutate({ id: deleteConfirm.projectId })}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Yes, Delete"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Date Edit Dialog */}
        {editingDateField && (
          <Dialog open={!!editingDateField} onOpenChange={(open) => !open && setEditingDateField(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  Edit {editingDateField.field === 'startDate' ? 'Start Date' : 'End Date'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {editingDateField.field === 'startDate' ? 'Start Date' : 'End Date'}
                  </label>
                  <input
                    type="date"
                    id="date-input"
                    defaultValue={
                      dateOverrides[editingDateField.projectId]?.[editingDateField.field]
                        ? new Date(dateOverrides[editingDateField.projectId]?.[editingDateField.field]!).toISOString().split('T')[0]
                        : editingDateField.field === 'startDate'
                        ? projects.find(p => p.id === editingDateField.projectId)?.startDate
                          ? new Date(projects.find(p => p.id === editingDateField.projectId)!.startDate!).toISOString().split('T')[0]
                          : ''
                        : projects.find(p => p.id === editingDateField.projectId)?.estimatedEndDate
                        ? new Date(projects.find(p => p.id === editingDateField.projectId)!.estimatedEndDate!).toISOString().split('T')[0]
                        : ''
                    }
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setEditingDateField(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const project = projects.find(p => p.id === editingDateField.projectId);
                    const dateInput = document.getElementById('date-input') as HTMLInputElement;
                    if (project && dateInput?.value) {
                      const newDate = new Date(dateInput.value).getTime();
                      updateMutation.mutate({
                        id: editingDateField.projectId,
                        data: {
                          [editingDateField.field]: newDate
                        }
                      }, {
                        onSuccess: () => {
                          // Update UI immediately after successful save
                          setDateOverrides({
                            ...dateOverrides,
                            [editingDateField.projectId]: {
                              ...dateOverrides[editingDateField.projectId],
                              [editingDateField.field]: newDate
                            }
                          });
                          toast.success(`${editingDateField.field === 'startDate' ? 'Start' : 'End'} date updated`);
                          setEditingDateField(null);
                        },
                        onError: (error) => {
                          console.error('Date update error:', error);
                          toast.error('Failed to update date');
                        }
                      });
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Update
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

      </div>
    </CRMLayout>
  );
}
