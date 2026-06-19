import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  BILLING_STATUSES,
  formatCurrency,
  formatDate,
  formatFileSize,
  formatTime,
  getBillingStatusColor,
  PROJECT_STATUSES,
} from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Download,
  Edit,
  Edit2,
  FileText,
  Loader2,
  Lock,
  MessageSquare,
  Paperclip,
  Phone,
  Plus,
  Send,
  Trash2,
  User,
  UserPlus,
  X,
  CheckSquare,
  FileIcon,
  MessageCircle,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import { useNavigation } from "@/contexts/NavigationContext";
import ProjectForm from "./ProjectForm";
import ProjectChat from "@/components/ProjectChat";
import { ProjectChangeOrders } from "@/components/ProjectChangeOrders";
import { ProposalUploadSection } from "@/components/ProposalUploadSection";
import { ProjectChecklist } from "@/components/ProjectChecklist";
import { TabCarousel, TabItem } from "@/components/TabCarousel";
import CRMLayout from "@/components/CRMLayout";

type TabType = "project-info" | "checklist" | "files" | "financial";

export default function AdminProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id ?? "0");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("project-info");
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const tabOrder: TabType[] = ["project-info", "checklist", "files", "financial"];
  
  // Handle swipe gestures
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.changedTouches[0].screenX;
      touchStartY.current = e.changedTouches[0].screenY;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX.current = e.changedTouches[0].screenX;
      touchEndY.current = e.changedTouches[0].screenY;
      handleSwipe();
    };
    
    const handleSwipe = () => {
      const swipeThreshold = 50;
      const horizontalDiff = touchStartX.current - touchEndX.current;
      const verticalDiff = Math.abs(touchStartY.current - touchEndY.current);
      const horizontalDiffAbs = Math.abs(horizontalDiff);
      
      // Only trigger swipe if horizontal movement is significantly greater than vertical
      // Ratio of 1.5 means horizontal movement must be 1.5x greater than vertical
      if (horizontalDiffAbs > swipeThreshold && horizontalDiffAbs > verticalDiff * 1.5) {
        const currentIndex = tabOrder.indexOf(activeTab);
        
        if (horizontalDiff > 0 && currentIndex < tabOrder.length - 1) {
          // Swiped left, go to next tab
          setActiveTab(tabOrder[currentIndex + 1]);
        } else if (horizontalDiff < 0 && currentIndex > 0) {
          // Swiped right, go to previous tab
          setActiveTab(tabOrder[currentIndex - 1]);
        }
      }
    };
    
    const element = contentRef.current;
    if (element) {
      element.addEventListener("touchstart", handleTouchStart, false);
      element.addEventListener("touchend", handleTouchEnd, false);
      
      return () => {
        element.removeEventListener("touchstart", handleTouchStart);
        element.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [activeTab]);
  
  // Use browser history to go back
  const handleBack = () => {
    window.history.back();
  };
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [isAdminNote, setIsAdminNote] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: project, isLoading } = trpc.projects.get.useQuery({ id: projectId });
  const { data: assignments = [] } = trpc.projects.getAssignments.useQuery({ projectId });
  const { data: subs = [] } = trpc.subcontractors.list.useQuery();
  const { data: notes = [] } = trpc.projects.getNotes.useQuery({ projectId });
  const { data: files = [] } = trpc.projects.getFiles.useQuery({ projectId });
  const { data: financial } = trpc.projects.getFinancial.useQuery({ projectId });
  const { data: manualChecklistItems = [] } = trpc.projects.getChecklistItems.useQuery({ projectId, source: "manual" });
  const { data: extractedChecklistItems = [] } = trpc.projects.getChecklistItems.useQuery({ projectId, source: "extracted" });
  
  // For backward compatibility, use extracted items for the Files tab
  const checklistItems = extractedChecklistItems;

  const [financialForm, setFinancialForm] = useState({
    contractValue: "",
    amountBilled: "",
    amountReceived: "",
    subcontractorPayout: "",
    billingStatus: "Not Started" as const,
    notes: "",
  });

  const createNoteMutation = trpc.projects.addNote.useMutation({
    onSuccess: () => {
      setNoteContent("");
      setIsAdminNote(false);
      utils.projects.getNotes.invalidate({ projectId });
      toast.success("Note added");
    },
  });

  const deleteNoteMutation = trpc.projects.deleteNote.useMutation({
    onSuccess: () => {
      utils.projects.getNotes.invalidate({ projectId });
      toast.success("Note deleted");
    },
  });

  const uploadFileMutation = trpc.projects.uploadFile.useMutation({
    onSuccess: () => {
      utils.projects.getFiles.invalidate({ projectId });
      toast.success("File uploaded");
    },
  });

  const deleteFileMutation = trpc.projects.deleteFile.useMutation({
    onSuccess: () => {
      utils.projects.getFiles.invalidate({ projectId });
      toast.success("File deleted");
    },
  });

  const updateStatusMutation = trpc.projects.updateStatus.useMutation({
    onSuccess: () => {
      utils.projects.get.invalidate({ id: projectId });
      toast.success("Status updated");
    },
  });

  const deleteProjectMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      setLocation("/admin/projects");
    },
  });

  const updateFinancialMutation = trpc.projects.updateFinancial.useMutation({
    onSuccess: () => {
      utils.projects.getFinancial.invalidate({ projectId });
      toast.success("Financial data updated");
    },
  });

  const assignSubMutation = trpc.projects.assignSubcontractor.useMutation({
    onSuccess: () => {
      utils.projects.getAssignments.invalidate({ projectId });
      toast.success("Subcontractor assigned");
    },
  });

  const unassignSubMutation = trpc.projects.unassignSubcontractor.useMutation({
    onSuccess: () => {
      utils.projects.getAssignments.invalidate({ projectId });
      toast.success("Subcontractor unassigned");
    },
  });

  const uploadProposalMutation = trpc.projects.uploadProposalAndExtract.useMutation({
    onSuccess: () => {
      toast.success("Proposal uploaded and checklist items extracted!");
      utils.projects.getChecklistItems.invalidate({ projectId });
    },
    onError: (error) => {
      toast.error(`Failed to upload proposal: ${error.message}`);
    },
  });

  const updateChecklistMutation = trpc.projects.updateChecklistItem.useMutation({
    onSuccess: () => {
      utils.projects.getChecklistItems.invalidate({ projectId });
    },
  });

  const deleteChecklistMutation = trpc.projects.deleteChecklistItem.useMutation({
    onSuccess: () => {
      utils.projects.getChecklistItems.invalidate({ projectId });
      toast.success("Checklist item deleted");
    },
  });

  const assignChecklistMutation = trpc.projects.assignChecklistItem.useMutation({
    onSuccess: () => {
      utils.projects.getChecklistItems.invalidate({ projectId });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    // Check if it's a PDF file
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = (event.target?.result as string)?.split(",")[1];
      if (!base64String) {
        toast.error("Failed to read file");
        return;
      }

      uploadProposalMutation.mutate({
        projectId,
        fileName: file.name,
        fileBase64: base64String,
      });
    };
    reader.readAsDataURL(file);
  };

  if (isLoading || !project) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </CRMLayout>
    );
  }

  const assignedSubIds = assignments.map((a) => a.subcontractorId);
  const unassignedSubs = subs.filter((s) => !assignedSubIds.includes(s.id));

  // Tab definitions
  const tabs: TabItem[] = [
    { id: "project-info", label: "Project Info", icon: <Building2 className="w-4 h-4" /> },
    { id: "checklist", label: "Checklist", icon: <CheckSquare className="w-4 h-4" /> },
    { id: "files", label: "Files", icon: <FileIcon className="w-4 h-4" /> },
    { id: "financial", label: "Financial", icon: <DollarSign className="w-4 h-4" /> },
  ];

  // Delete confirmation dialog
  const DeleteConfirmDialog = () => (
    <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete this project? This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              deleteProjectMutation.mutate({ id: projectId });
              setDeleteConfirm(false);
            }}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      "Review": "bg-blue-100 text-blue-800",
      "Shop Drawings": "bg-purple-100 text-purple-800",
      "Fabrication": "bg-orange-100 text-orange-800",
      "On-Site": "bg-yellow-100 text-yellow-800",
      "Installed": "bg-green-100 text-green-800",
      "Inspection Passed": "bg-emerald-100 text-emerald-800",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    );
  };

  return (
    <CRMLayout>
      <div className="space-y-0 px-2 sm:px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 py-4 sm:py-6 bg-background -mx-2 sm:-mx-4 px-2 sm:px-4">
          <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={handleBack} className="flex-shrink-0 mt-0.5">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">{project.name}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                {project.address && `${project.address} • `}
                {project.borough}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center justify-end sm:justify-start flex-wrap">
            <Select defaultValue={project.status} onValueChange={(s) => updateStatusMutation.mutate({ id: project.id, status: s })}>
              <SelectTrigger className="h-10 text-xs px-3 flex-shrink-0 min-w-[120px] sm:h-8 sm:min-w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="xs" className="gap-1 px-3 h-10 text-xs flex-shrink-0 sm:h-8 sm:px-2 min-w-[80px] sm:min-w-auto">
                  <Edit className="w-3 h-3" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Project</DialogTitle>
                </DialogHeader>
                <ProjectForm
                  projectId={projectId}
                  defaultValues={{
                    name: project.name,
                    address: project.address ?? undefined,
                    borough: project.borough ?? undefined,
                    gcCompany: project.gcCompany ?? undefined,
                    gcContactName: project.gcContactName ?? undefined,
                    gcContactPhone: project.gcContactPhone ?? undefined,
                    gcContactEmail: project.gcContactEmail ?? undefined,
                    siteSuperName: project.siteSuperName ?? undefined,
                    siteSuperPhone: project.siteSuperPhone ?? undefined,
                    status: project.status,
                    startDate: project.startDate ?? null,
                    startTime: project.startTime ?? undefined,
                    estimatedEndDate: project.estimatedEndDate ?? null,
                    estimatedEndTime: project.estimatedEndTime ?? undefined,
                    description: project.description ?? undefined,
                    isUrgent: project.isUrgent ?? false,
                  }}
                  onSuccess={() => {
                    setShowEditDialog(false);
                    utils.projects.get.invalidate({ id: projectId });
                  }}
                />
              </DialogContent>
            </Dialog>
            <Button
              size="xs"
              className="bg-red-600 hover:bg-red-700 text-white gap-1 px-3 h-10 text-xs flex-shrink-0 sm:h-8 sm:px-2 min-w-[80px] sm:min-w-auto"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabCarousel 
          tabs={tabs as any} 
          activeTab={activeTab} 
          onTabChange={(id) => setActiveTab(id as TabType)} 
        />

        {/* Content Area */}
        <div 
          ref={contentRef}
          className="p-2 sm:p-4 min-h-[calc(100vh-300px)] transition-opacity duration-300"
        >
          {/* Project Info Tab - Project Details + GC Info */}
          {activeTab === "project-info" && (
            <div className="space-y-6">
              {/* Section 1: Project Details */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <StatusBadge status={project.status} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Subcontractor(s)</p>
                      <div className="text-foreground text-sm">
                        {assignments && assignments.length > 0 ? (
                          <div className="space-y-1">
                            {assignments.map((assignment) => {
                              const subcontractor = subs.find((s) => s.id === assignment.subcontractorId);
                              return (
                                <p key={assignment.id} className="truncate">
                                  {subcontractor?.companyName || "Unknown"}
                                  {assignment.role && <span className="text-xs text-muted-foreground ml-1">({assignment.role})</span>}
                                </p>
                              );
                            })}
                          </div>
                        ) : (
                          <p>—</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground mb-1 truncate">Start Date & Time</p>
                      <div className="text-foreground text-xs md:text-sm">
                        <p className="truncate">
                          {formatDate(project.startDate)}
                          {project.startTime && ` • ${formatTime(project.startTime)}`}
                        </p>
                        {project.startDate && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {new Date(project.startDate).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Karachi' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground mb-1 truncate">Est. End Date & Time</p>
                      <div className="text-foreground text-xs md:text-sm">
                        <p className="truncate">
                          {formatDate(project.estimatedEndDate)}
                          {project.estimatedEndTime && ` • ${formatTime(project.estimatedEndTime)}`}
                        </p>
                        {project.estimatedEndDate && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {new Date(project.estimatedEndDate).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Karachi' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {project.description && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-foreground">{project.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section 2: General Contractor Info */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    General Contractor
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Company</p>
                    <p className="text-foreground">{project.gcCompany ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Contact</p>
                    <p className="text-foreground">{project.gcContactName ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> GC Phone
                    </p>
                    <p className="text-foreground">{project.gcContactPhone ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> Site Super
                    </p>
                    <p className="text-foreground">
                      {project.siteSuperName ?? "—"}{project.siteSuperPhone ? ` · ${project.siteSuperPhone}` : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>

            </div>
          )}

          {/* Notes Tab - Notes + Chat */}
          {activeTab === "checklist" && (
            <div className="space-y-6">
              {/* Manual Checklist & Tasks (added/edited/completed/deleted by hand) */}
              <ProjectChecklist projectId={projectId} />

              {/* Section 1: Notes */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
                    ) : (
                      notes.map((note) => (
                        <div
                          key={note.id}
                          className={`p-3 rounded-lg text-sm ${note.isAdminOnly ? "bg-primary/5 border border-primary/20" : "bg-muted/30"}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-foreground">{note.authorName}</span>
                                {note.isAdminOnly && (
                                  <span className="text-xs text-primary flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" /> Admin only
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {new Date(note.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                            </div>
                            <button
                              onClick={() => deleteNoteMutation.mutate({ id: note.id })}
                              className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2 border-t border-border pt-4">
                    <Textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Add a note..."
                      rows={2}
                      className="bg-muted/30 border-border text-sm resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAdminNote}
                          onChange={(e) => setIsAdminNote(e.target.checked)}
                          className="rounded"
                        />
                        Admin only
                      </label>
                      <Button
                        size="sm"
                        onClick={() =>
                          noteContent.trim() &&
                          createNoteMutation.mutate({
                            projectId,
                            content: noteContent.trim(),
                            isAdminOnly: isAdminNote,
                          })
                        }
                        disabled={!noteContent.trim() || createNoteMutation.isPending}
                        className="gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Add Note
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 3: Project Chat */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Project Chat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProjectChat projectId={projectId} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Files Tab - Files & Attachments + Change Order + Proposal Upload & Auto-Checklist */}
          {activeTab === "files" && (
            <div className="space-y-6">
              {/* Section 1: Files & Attachments */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Files & Attachments
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadProposalMutation.isPending}
                    className="gap-1.5 h-7 text-xs"
                  >
                    {uploadProposalMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Upload
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf"
                  />
                </CardHeader>
                <CardContent>
                  {files.length === 0 ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <Paperclip className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">Click to upload files</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">{file.fileName}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <a
                              href={file.fileUrl}
                              download
                              className="p-1.5 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => deleteFileMutation.mutate({ id: file.id })}
                              className="p-1.5 rounded hover:bg-background transition-colors text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section 2: Change Orders */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Change Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProjectChangeOrders projectId={projectId} />
                </CardContent>
              </Card>

              {/* Section 3: Auto-Extracted Checklist from PDF */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2 md:pb-3">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <FileText className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
                    <span className="truncate">Extracted Checklist & Tasks</span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm font-medium text-gray-700 truncate">From Proposal PDF</p>
                      <p className="text-xs text-gray-500 mt-0.5 md:mt-1 truncate">
                        {checklistItems.length} of {checklistItems.length} items
                        {checklistItems.length > 0 &&
                          ` (${Math.round((checklistItems.filter((i) => i.isCompleted).length / checklistItems.length) * 100)}% complete)`}
                      </p>
                    </div>
                  </div>

                  {checklistItems.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No checklist items extracted yet</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Upload a proposal to automatically generate checklist items
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 md:space-y-4">
                      {/* Progress Bar */}
                      <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <span className="text-xs md:text-sm font-medium text-gray-700 flex-shrink-0">Progress</span>
                          <span className="text-xs md:text-sm font-semibold text-gray-900 text-right">
                            {checklistItems.filter((i) => i.isCompleted).length} of {checklistItems.length} items complete ({Math.round((checklistItems.filter((i) => i.isCompleted).length / checklistItems.length) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.round((checklistItems.filter((i) => i.isCompleted).length / checklistItems.length) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Checklist Items */}
                      <div className="space-y-1.5 md:space-y-2">
                        {checklistItems.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg border transition-all ${
                              item.isCompleted
                                ? "bg-gray-50 border-gray-200"
                                : "bg-white border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            {/* Tick Icon */}
                            <button
                              onClick={() =>
                                updateChecklistMutation.mutate({
                                  projectId,
                                  itemId: item.id,
                                  isCompleted: !item.isCompleted,
                                })
                              }
                              className="flex-shrink-0 p-0.5 md:p-1 hover:bg-gray-100 rounded-full transition-colors"
                              aria-label={item.isCompleted ? "Mark as incomplete" : "Mark as complete"}
                            >
                              {item.isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                              ) : (
                                <Circle className="w-4 h-4 md:w-5 md:h-5 text-gray-400 hover:text-gray-600" />
                              )}
                            </button>

                            {/* Item Text */}
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-xs md:text-sm break-words ${
                                  item.isCompleted
                                    ? "line-through text-gray-400"
                                    : "text-gray-900"
                                }`}
                              >
                                {item.text}
                              </p>
                            </div>

                            {/* Subcontractor Assignment Dropdown */}
                            <Select
                              value={item.assignedSubcontractorId?.toString() || "unassigned"}
                              onValueChange={(value) => {
                                const subcontractorId = value !== "unassigned" ? parseInt(value) : null;
                                assignChecklistMutation.mutate({
                                  projectId,
                                  itemId: item.id,
                                  subcontractorId,
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 w-32 text-xs flex-shrink-0">
                                <SelectValue placeholder="Assign to" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {assignments.map((assignment) => (
                                  <SelectItem key={assignment.subcontractorId} value={assignment.subcontractorId.toString()}>
                                    {assignment.subcontractor?.companyName || "Unknown"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Delete Icon */}
                            <button
                              onClick={() => deleteChecklistMutation.mutate({ projectId, itemId: item.id })}
                              className="flex-shrink-0 p-0.5 md:p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                              aria-label="Delete item"
                            >
                              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section 5: Proposal Upload & Auto-Checklist */}
              <ProposalUploadSection
                projectId={projectId}
                proposalId={project?.proposalId}
                proposalFileUrl={project?.proposalFileUrl}
                extractedItemsCount={project?.extractedItemsCount}
                onProposalUploaded={() => utils.projects.get.invalidate({ id: projectId })}
              />
            </div>
          )}

          {/* Financial Tab */}
          {activeTab === "financial" && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-red-500" />
                  Financial Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {financial ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Contract Value</p>
                      <p className="text-lg font-semibold text-foreground">{formatCurrency(financial.contractValue)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Amount Billed</p>
                      <p className="text-lg font-semibold text-foreground">{formatCurrency(financial.amountBilled)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Amount Received</p>
                      <p className="text-lg font-semibold text-foreground">{formatCurrency(financial.amountReceived)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Subcontractor Payout</p>
                      <p className="text-lg font-semibold text-foreground">{formatCurrency(financial.subcontractorPayout)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Billing Status</p>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getBillingStatusColor(financial.billingStatus)}`}>
                        {financial.billingStatus}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No financial data yet</p>
                )}

                <div className="border-t border-border pt-6 space-y-4">
                  <h3 className="font-medium text-foreground">Update Financial Data</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Contract Value</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={financialForm.contractValue}
                        onChange={(e) => setFinancialForm({ ...financialForm, contractValue: e.target.value })}
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Amount Billed</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={financialForm.amountBilled}
                        onChange={(e) => setFinancialForm({ ...financialForm, amountBilled: e.target.value })}
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Amount Received</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={financialForm.amountReceived}
                        onChange={(e) => setFinancialForm({ ...financialForm, amountReceived: e.target.value })}
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Subcontractor Payout</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={financialForm.subcontractorPayout}
                        onChange={(e) => setFinancialForm({ ...financialForm, subcontractorPayout: e.target.value })}
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Billing Status</Label>
                      <Select value={financialForm.billingStatus} onValueChange={(v) => setFinancialForm({ ...financialForm, billingStatus: v as any })}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BILLING_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    onClick={() =>
                      updateFinancialMutation.mutate({
                        projectId,
                        contractValue: financialForm.contractValue ? parseFloat(financialForm.contractValue) : 0,
                        amountBilled: financialForm.amountBilled ? parseFloat(financialForm.amountBilled) : 0,
                        amountReceived: financialForm.amountReceived ? parseFloat(financialForm.amountReceived) : 0,
                        subcontractorPayout: financialForm.subcontractorPayout ? parseFloat(financialForm.subcontractorPayout) : 0,
                        billingStatus: financialForm.billingStatus,
                        notes: financialForm.notes,
                      })
                    }
                    disabled={updateFinancialMutation.isPending}
                  >
                    {updateFinancialMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Financial Data"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <DeleteConfirmDialog />
    </CRMLayout>
  );
}
