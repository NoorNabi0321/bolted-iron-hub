import { cn, getStatusClass } from "@/lib/utils";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

const PROJECT_STATUSES = ["Shop Drawings", "Fabrication", "On-Site", "Installed", "Inspection Passed", "Review"];

interface StatusBadgeProps {
  status: string;
  className?: string;
  projectId?: number;
  onStatusChange?: (newStatus: string) => void;
}

export function StatusBadge({ status, className, projectId, onStatusChange }: StatusBadgeProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [newStatus, setNewStatus] = useState(status);
  const updateStatusMutation = trpc.projects.updateStatus.useMutation();
  const utils = trpc.useUtils();

  const handleSaveStatus = async () => {
    if (projectId && newStatus !== status) {
      try {
        // Call the callback immediately to update the UI optimistically
        onStatusChange?.(newStatus);
        // Then update the server
        await updateStatusMutation.mutateAsync({ id: projectId, status: newStatus });
      } catch (error) {
        console.error('Failed to update status:', error);
        // Revert on error by calling with old status
        onStatusChange?.(status);
      }
    }
    setShowDialog(false);
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (projectId) setShowDialog(true);
        }}
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity",
          getStatusClass(status),
          className,
          projectId && "hover:shadow-md"
        )}
      >
        {status}
      </button>

      {projectId && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change Project Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">New Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveStatus}
                disabled={updateStatusMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {updateStatusMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    "Shop Drawings": "bg-blue-400",
    Fabrication: "bg-amber-400",
    "On-Site": "bg-orange-400",
    Installed: "bg-emerald-400",
    "Inspection Passed": "bg-green-400",
  };
  return (
    <span
      className={cn("inline-block w-2 h-2 rounded-full", colorMap[status] ?? "bg-muted-foreground")}
    />
  );
}
