import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import { useLocation } from "wouter";
import { FolderOpen, MapPin, Calendar } from "lucide-react";
import type { Project } from "@/lib/types";

interface ProjectListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  projects: Project[];
  isLoading?: boolean;
}

export function ProjectListDialog({
  open,
  onOpenChange,
  title,
  projects,
  isLoading = false,
}: ProjectListDialogProps) {
  const [, setLocation] = useLocation();

  const handleProjectClick = (projectId: number) => {
    sessionStorage.setItem('projectReferrer', 'dashboard');
    setLocation(`/projects/${projectId}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground">
            {title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''} found
          </p>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-secondary/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No projects found</p>
            </div>
          ) : (
            projects.map((project) => (
              <Card
                key={project.id}
                onClick={() => handleProjectClick(project.id)}
                className="p-4 cursor-pointer hover:shadow-md hover:border-red-300 transition-all border-border group"
              >
                <div className="space-y-2">
                  {/* Project Name and Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-red-600 transition-colors truncate text-sm sm:text-base">
                        {project.name}
                      </h3>
                    </div>
                    <StatusBadge status={project.status} className="flex-shrink-0 text-xs" />
                  </div>

                  {/* Address */}
                  {project.address && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{project.address}</span>
                    </div>
                  )}

                  {/* Updated Date */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>Updated {formatDate(project.updatedAt)}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
