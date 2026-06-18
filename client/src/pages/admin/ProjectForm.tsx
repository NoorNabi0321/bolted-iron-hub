import { Button } from "@/components/ui/button";
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
import { PROJECT_STATUSES, dateToTimestamp, timestampToDateInput } from "@/lib/utils";
import { useState, useEffect } from "react";
import * as React from "react";
import { toast } from "sonner";
import { Plus, X, Edit2, Star } from "lucide-react";

interface ProjectFormProps {
  projectId?: number;
  defaultValues?: {
    name?: string;
    address?: string;
    borough?: string;
    gcCompany?: string;
    gcContactName?: string;
    gcContactPhone?: string;
    gcContactEmail?: string;
    siteSuperName?: string;
    siteSuperPhone?: string;
    status?: string;
    startDate?: Date | null;
    startTime?: string;
    estimatedEndDate?: Date | null;
    estimatedEndTime?: string;
    description?: string;
    isUrgent?: boolean;
  };
  onSuccess?: () => void;
}

interface SubcontractorAssignment {
  assignmentId?: number; // For tracking existing assignments during edit
  subcontractorId: number;
  role: string;
}

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

function toDateInput(date: Date | null | undefined): string {
  if (!date) return "";
  return timestampToDateInput(new Date(date).getTime());
}

export default function ProjectForm({ projectId, defaultValues, onSuccess }: ProjectFormProps) {
  const [form, setForm] = useState({
    name: defaultValues?.name ?? "",
    address: defaultValues?.address ?? "",
    borough: defaultValues?.borough ?? "",
    gcCompany: defaultValues?.gcCompany ?? "",
    gcContactName: defaultValues?.gcContactName ?? "",
    gcContactPhone: defaultValues?.gcContactPhone ?? "",
    gcContactEmail: defaultValues?.gcContactEmail ?? "",
    siteSuperName: defaultValues?.siteSuperName ?? "",
    siteSuperPhone: defaultValues?.siteSuperPhone ?? "",
    status: defaultValues?.status ?? "Shop Drawings",
    startDate: toDateInput(defaultValues?.startDate),
    startTime: defaultValues?.startTime ?? "",
    estimatedEndDate: toDateInput(defaultValues?.estimatedEndDate),
    estimatedEndTime: defaultValues?.estimatedEndTime ?? "",
    description: defaultValues?.description ?? "",
  });
  const [isUrgent, setIsUrgent] = useState(defaultValues?.isUrgent ?? false);

  const [subcontractors, setSubcontractors] = useState<SubcontractorAssignment[]>([]);
  const [tempSubId, setTempSubId] = useState("");
  const [tempRole, setTempRole] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletedAssignmentIds, setDeletedAssignmentIds] = useState<number[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalSubId, setEditModalSubId] = useState("");
  const [editModalRole, setEditModalRole] = useState("");

  const { data: availableSubs = [] } = trpc.subcontractors.list.useQuery();
  const { data: existingAssignments = [] } = trpc.projects.getAssignments.useQuery(
    { projectId: projectId ?? 0 },
    { enabled: !!projectId }
  );

  // Load existing subcontractors when in edit mode
  useEffect(() => {
    if (projectId && existingAssignments.length > 0) {
      setSubcontractors(
        existingAssignments.map((a) => ({
          assignmentId: a.id, // Track the assignment ID for updates
          subcontractorId: a.subcontractorId,
          role: a.role || "",
        }))
      );
    }
  }, [projectId, existingAssignments]);

  // Update isUrgent when defaultValues change (on edit)
  useEffect(() => {
    if (defaultValues?.isUrgent !== undefined) {
      setIsUrgent(defaultValues.isUrgent);
    }
  }, [defaultValues?.isUrgent]);

  const utils = trpc.useUtils();
  const assignMutation = trpc.projects.assign.useMutation({
    onSuccess: async () => {
      // Invalidate the assignments query to refresh the UI
      if (projectId) {
        await utils.projects.getAssignments.invalidate({ projectId });
      }
    },
  });

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: async (result) => {
      // Assign subcontractors after project creation
      if (subcontractors.length > 0) {
        for (const sub of subcontractors) {
          try {
            await assignMutation.mutateAsync({
              projectId: result.id,
              subcontractorId: sub.subcontractorId,
              role: sub.role || undefined,
            });
          } catch (error) {
            console.error("Failed to assign subcontractor:", error);
          }
        }
      }
      toast.success("Project created successfully");
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: async (result) => {
      // Handle subcontractor updates for edit mode
      if (projectId) {
        // Get existing subcontractor IDs
        const existingIds = existingAssignments.map((a) => a.id);
        const currentSubIds = subcontractors.map((s) => s.subcontractorId);
        const existingSubIds = existingAssignments.map((a) => a.subcontractorId);

        // Delete removed subcontractors (track deleted assignments)
        for (const assignmentId of deletedAssignmentIds) {
          try {
            await deleteAssignmentMutation.mutateAsync({ id: assignmentId });
          } catch (error) {
            console.error("Failed to delete assignment:", error);
          }
        }
        // Clear the deleted assignments list after submission
        setDeletedAssignmentIds([]);

        // Add or update subcontractors
        for (const sub of subcontractors) {
          if (sub.assignmentId) {
            // This is an existing assignment - update it
            const existingAssignment = existingAssignments.find((a) => a.id === sub.assignmentId);
            if (existingAssignment) {
              try {
                await updateAssignmentMutation.mutateAsync({
                  assignmentId: sub.assignmentId,
                  subcontractorId: sub.subcontractorId,
                  role: sub.role || undefined,
                });
              } catch (error) {
                console.error("Failed to update assignment:", error);
              }
            }
          } else {
            // This is a new assignment - add it
            try {
              await assignMutation.mutateAsync({
                projectId,
                subcontractorId: sub.subcontractorId,
                role: sub.role || undefined,
              });
            } catch (error) {
              console.error("Failed to assign subcontractor:", error);
            }
          }
        }
      }

      toast.success("Project updated successfully");
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteAssignmentMutation = trpc.projects.deleteAssignment.useMutation({
    onSuccess: async () => {
      // Invalidate the assignments query to refresh the UI
      if (projectId) {
        await utils.projects.getAssignments.invalidate({ projectId });
      }
    },
  });
  const updateAssignmentMutation = trpc.projects.updateAssignment.useMutation({
    onSuccess: async (data) => {
      console.log("[DEBUG] updateAssignmentMutation onSuccess:", data);
      // Invalidate the query to trigger an automatic refetch
      if (projectId) {
        await utils.projects.getAssignments.invalidate({ projectId });
      }
      toast.success("Assignment updated successfully");
    },
    onError: (error) => {
      console.error("[DEBUG] updateAssignmentMutation error:", error);
      toast.error("Failed to update assignment");
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending || assignMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name: form.name,
      address: form.address || undefined,
      borough: form.borough || undefined,
      gcCompany: form.gcCompany || undefined,
      gcContactName: form.gcContactName || undefined,
      gcContactPhone: form.gcContactPhone || undefined,
      gcContactEmail: form.gcContactEmail || undefined,
      siteSuperName: form.siteSuperName || undefined,
      siteSuperPhone: form.siteSuperPhone || undefined,
      status: form.status as any,
      startDate: form.startDate ? dateToTimestamp(form.startDate) : (form.startDate === "" ? null : undefined),
      startTime: form.startTime === "" ? null : (form.startTime || undefined),
      estimatedEndDate: form.estimatedEndDate ? dateToTimestamp(form.estimatedEndDate) : (form.estimatedEndDate === "" ? null : undefined),
      estimatedEndTime: form.estimatedEndTime === "" ? null : (form.estimatedEndTime || undefined),
      description: form.description || undefined,
      isUrgent: isUrgent,
    };

    if (projectId) {
      updateMutation.mutate({ id: projectId, data: data as any });
    } else {
      createMutation.mutate(data as any);
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleAddSubcontractor = () => {
    if (!tempSubId) {
      toast.error("Please select a subcontractor");
      return;
    }

    // Add new (no assignmentId for new assignments)
    setSubcontractors([...subcontractors, { subcontractorId: parseInt(tempSubId), role: tempRole }]);
    setTempSubId("");
    setTempRole("");
  };

  const handleOpenEditModal = (index: number) => {
    const sub = subcontractors[index];
    setEditModalSubId(String(sub.subcontractorId));
    setEditModalRole(sub.role);
    setEditingIndex(index);
    setEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editModalSubId) {
      toast.error("Please select a subcontractor");
      return;
    }

    const updated = [...subcontractors];
    const assignment = updated[editingIndex!];
    updated[editingIndex!] = {
      assignmentId: assignment.assignmentId,
      subcontractorId: parseInt(editModalSubId),
      role: editModalRole,
    };
    
    // If this is an existing assignment (has assignmentId), update it on the server
    if (assignment.assignmentId) {
      console.log("[DEBUG] Calling updateAssignmentMutation with:", {
        assignmentId: assignment.assignmentId,
        subcontractorId: parseInt(editModalSubId),
        role: editModalRole || undefined,
      });
      updateAssignmentMutation.mutate({
        assignmentId: assignment.assignmentId,
        subcontractorId: parseInt(editModalSubId),
        role: editModalRole || undefined,
      });
    } else {
      console.log("[DEBUG] No assignmentId found, skipping server update");
    }
    
    setSubcontractors(updated);
    setEditModalOpen(false);
    setEditingIndex(null);
    setEditModalSubId("");
    setEditModalRole("");
    toast.success("Subcontractor updated");
  };

  const handleCancelEdit = () => {
    setEditModalOpen(false);
    setEditingIndex(null);
    setEditModalSubId("");
    setEditModalRole("");
  };



  const handleRemoveSubcontractor = (index: number) => {
    const removed = subcontractors[index];
    // Track deleted assignments for backend deletion
    if (removed.assignmentId) {
      setDeletedAssignmentIds([...deletedAssignmentIds, removed.assignmentId]);
    }
    setSubcontractors(subcontractors.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setTempSubId("");
      setTempRole("");
    }
  };

  const getSubcontractorName = (id: number) => {
    return availableSubs.find((s) => s.id === id)?.companyName ?? "Unknown";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label>Project Name *</Label>
          <Input
            value={form.name}
            onChange={set("name")}
            placeholder="e.g. 123 Main St – Structural Steel"
            required
            className="bg-card border-border"
          />
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label>Project Address</Label>
          <Input
            value={form.address}
            onChange={set("address")}
            placeholder="Full address"
            className="bg-card border-border"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Borough</Label>
          <Select value={form.borough} onValueChange={(v) => setForm((f) => ({ ...f, borough: v }))}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Select borough" />
            </SelectTrigger>
            <SelectContent>
              {BOROUGHS.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Fields Row */}
        <div className="col-span-2 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={set("startDate")}
                className="bg-card border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Estimated End Date</Label>
              <Input
                type="date"
                value={form.estimatedEndDate}
                onChange={set("estimatedEndDate")}
                className="bg-card border-border"
              />
            </div>
          </div>

          {/* Reset Dates Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setForm((f) => ({ ...f, startDate: "", estimatedEndDate: "" }));
            }}
            className="w-full"
          >
            Reset Dates
          </Button>
        </div>

        {/* Time Fields Row */}
        <div className="col-span-2 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={form.startTime}
                onChange={set("startTime")}
                className="bg-card border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Estimated End Time</Label>
              <Input
                type="time"
                value={form.estimatedEndTime}
                onChange={set("estimatedEndTime")}
                className="bg-card border-border"
              />
            </div>
          </div>

          {/* Reset Times Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setForm((f) => ({ ...f, startTime: "", estimatedEndTime: "" }));
            }}
            className="w-full"
          >
            Reset Times
          </Button>
        </div>
      </div>

      {/* Assign Subcontractor Section */}
      <div className="border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Assign Subcontractors</p>
        <div className="space-y-3">
          {/* Add/Edit Subcontractor UI */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Subcontractor</Label>
              <Select value={tempSubId} onValueChange={setTempSubId}>
                <SelectTrigger className="bg-card border-border">
                  {tempSubId ? (
                    <span>{getSubcontractorName(parseInt(tempSubId))}</span>
                  ) : (
                    <span className="text-muted-foreground">Select subcontractor</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {availableSubs
                    .filter((s) => {
                      // Show subcontractor if:
                      // 1. It's not already selected in the list, OR
                      // 2. It's the one currently being edited
                      const isSelected = subcontractors.some(
                        (sub, idx) => sub.subcontractorId === s.id && idx !== editingIndex
                      );
                      return !isSelected;
                    })
                    .map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.companyName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Role / Scope</Label>
              <Input
                value={tempRole}
                onChange={(e) => setTempRole(e.target.value)}
                placeholder="e.g. Structural Steel"
                className="bg-card border-border"
              />
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddSubcontractor}
            className="w-full gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Subcontractor
          </Button>

          {/* List of Added Subcontractors */}
          {subcontractors.length > 0 && (
            <div className="space-y-2 mt-3">
              {subcontractors.map((sub, idx) => (
                <div key={idx}>
                  {editingIndex === idx ? (
                    /* Inline Edit Mode */
                    <div className="p-3 rounded-lg border-2 border-red-200 bg-red-50/30 space-y-3">
                      {/* Subcontractor Dropdown */}
                      <div className="space-y-1.5">
                        <Label className="text-sm">Subcontractor</Label>
                        <Select value={editModalSubId} onValueChange={setEditModalSubId}>
                          <SelectTrigger className="bg-card border-2 border-red-200 focus:border-red-400">
                            {editModalSubId ? (
                              <span>{getSubcontractorName(parseInt(editModalSubId))}</span>
                            ) : (
                              <span className="text-muted-foreground">Select subcontractor</span>
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {availableSubs
                              .filter((s) => {
                                const isSelected = subcontractors.some(
                                  (sub, idx) => sub.subcontractorId === s.id && idx !== editingIndex
                                );
                                return !isSelected;
                              })
                              .map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                  {s.companyName}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Role / Scope Input */}
                      <div className="space-y-1.5">
                        <Label className="text-sm">Role / Scope</Label>
                        <Input
                          value={editModalRole}
                          onChange={(e) => setEditModalRole(e.target.value)}
                          placeholder="e.g. Structural Steel"
                          className="bg-card border-2 border-red-200 focus:border-red-400"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveEdit}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          OK
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border">
                      <div>
                        <p className="text-sm font-medium text-foreground">{getSubcontractorName(sub.subcontractorId)}</p>
                        <p className="text-xs text-muted-foreground">{sub.role || "—"}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(idx)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit subcontractor"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubcontractor(idx)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete subcontractor"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">General Contractor</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>GC Company</Label>
            <Input value={form.gcCompany} onChange={set("gcCompany")} placeholder="Company name" className="bg-card border-border" />
          </div>
          <div className="space-y-1.5">
            <Label>GC Contact Name</Label>
            <Input value={form.gcContactName} onChange={set("gcContactName")} placeholder="Contact name" className="bg-card border-border" />
          </div>
          <div className="space-y-1.5">
            <Label>GC Contact Phone</Label>
            <Input value={form.gcContactPhone} onChange={set("gcContactPhone")} placeholder="Phone number" className="bg-card border-border" />
          </div>
          <div className="space-y-1.5">
            <Label>Site Super Name</Label>
            <Input value={form.siteSuperName} onChange={set("siteSuperName")} placeholder="Site super" className="bg-card border-border" />
          </div>
          <div className="space-y-1.5">
            <Label>Site Super Phone</Label>
            <Input value={form.siteSuperPhone} onChange={set("siteSuperPhone")} placeholder="Phone number" className="bg-card border-border" />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Description / Notes</Label>
        <Textarea
          value={form.description}
          onChange={set("description")}
          placeholder="Project scope, special requirements..."
          rows={3}
          className="bg-card border-border resize-none"
        />
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button
          type="button"
          variant={isUrgent ? "default" : "outline"}
          size="sm"
          onClick={() => setIsUrgent(!isUrgent)}
          className={isUrgent ? "bg-yellow-400 text-black hover:bg-yellow-500" : ""}
        >
          <Star className="w-4 h-4 mr-2" fill={isUrgent ? "currentColor" : "none"} />
          Urgent Project
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : projectId ? "Update Project" : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
