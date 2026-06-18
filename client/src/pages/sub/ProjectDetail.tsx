import CRMLayout from "@/components/CRMLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatDate, formatFileSize } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  Download,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  Paperclip,
  Phone,
  Plus,
  Send,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import ProjectChat from "@/components/ProjectChat";
import { ProposalAndChecklistSection } from "@/components/ProposalAndChecklistSection";

export default function SubProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id ?? "0");
  const [, setLocation] = useLocation();
  const [noteContent, setNoteContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: project, isLoading } = trpc.projects.getForSubcontractor.useQuery({ id: projectId });
  const { data: notes = [] } = trpc.notes.list.useQuery({ projectId });
  const { data: files = [] } = trpc.files.list.useQuery({ projectId });

  const createNoteMutation = trpc.notes.create.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate({ projectId });
      setNoteContent("");
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadFileMutation = trpc.files.upload.useMutation({
    onSuccess: () => {
      utils.files.list.invalidate({ projectId });
      toast.success("File uploaded");
    },
    onError: (e) => toast.error(e.message),
  });

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error("File must be under 16MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadFileMutation.mutate({
        projectId,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        fileDataBase64: base64,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  if (isLoading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </CRMLayout>
    );
  }

  if (!project) {
    return (
      <CRMLayout>
        <div className="p-6 text-center text-muted-foreground">
          Project not found or you don't have access.
        </div>
      </CRMLayout>
    );
  }

  // Filter out admin-only notes for subcontractors
  const visibleNotes = notes.filter((n) => !n.isAdminOnly);
  const visibleFiles = files.filter((f) => !f.isAdminOnly);

  return (
    <CRMLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => setLocation("/")}
            className="mt-1 p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                {project.address && (
                  <p className="flex items-center gap-1 text-muted-foreground text-sm mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {project.address}
                    {project.borough && ` · ${project.borough}`}
                  </p>
                )}
              </div>
              <StatusBadge status={project.status} className="flex-shrink-0 mt-1" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Info */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Current Status</p>
                  <StatusBadge status={project.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Borough</p>
                  <p className="text-foreground">{project.borough ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                  <p className="text-foreground">{formatDate(project.startDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Est. End Date</p>
                  <p className="text-foreground">{formatDate(project.estimatedEndDate)}</p>
                </div>
                {project.description && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-foreground">{project.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Notes & Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {visibleNotes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
                  ) : (
                    visibleNotes.map((note) => (
                      <div key={note.id} className="p-3 rounded-lg bg-muted/30 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-foreground">{note.authorName}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <Textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Add a note or update..."
                    rows={2}
                    className="bg-muted/30 border-border text-sm resize-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() =>
                        noteContent.trim() &&
                        createNoteMutation.mutate({
                          projectId,
                          content: noteContent.trim(),
                          isAdminOnly: false,
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

            {/* Proposal & Auto-Checklist Section */}
            <ProposalAndChecklistSection projectId={projectId} />

            {/* Project Chat */}
            <ProjectChat projectId={projectId} />

            {/* Files */}
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
                  disabled={uploadFileMutation.isPending}
                  className="gap-1.5 h-7 text-xs"
                >
                  {uploadFileMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Upload
                </Button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              </CardHeader>
              <CardContent>
                {visibleFiles.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <Paperclip className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Click to upload files</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">Plans, photos, measurements</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visibleFiles.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.uploaderName} · {formatFileSize(file.fileSize)} · {formatDate(file.createdAt)}
                          </p>
                        </div>
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* GC Contact */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  General Contractor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Company</p>
                  <p className="text-foreground">{project.gcCompany ?? "—"}</p>
                </div>
                {project.gcContactName && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-foreground">{project.gcContactName}</span>
                  </div>
                )}
                {project.gcContactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <a href={`tel:${project.gcContactPhone}`} className="text-primary hover:underline">
                      {project.gcContactPhone}
                    </a>
                  </div>
                )}
                {project.siteSuperName && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Site Super</p>
                    <p className="text-foreground">{project.siteSuperName}</p>
                    {project.siteSuperPhone && (
                      <a href={`tel:${project.siteSuperPhone}`} className="text-primary text-xs hover:underline">
                        {project.siteSuperPhone}
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}
