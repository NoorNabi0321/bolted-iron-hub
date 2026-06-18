import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_STATUSES } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

type FieldType = "status" | "startDate" | "endDate";

interface ProjectFieldEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fieldType: FieldType;
  currentValue: any;
  projectName: string;
  onSave: (value: any) => Promise<void>;
  isLoading?: boolean;
}

export function ProjectFieldEditDialog({
  isOpen,
  onClose,
  fieldType,
  currentValue,
  projectName,
  onSave,
  isLoading = false,
}: ProjectFieldEditDialogProps) {
  const [value, setValue] = useState(currentValue);
  const [isSaving, setIsSaving] = useState(false);

  const getFieldLabel = () => {
    switch (fieldType) {
      case "status":
        return "Status";
      case "startDate":
        return "Start Date";
      case "endDate":
        return "Estimated End Date";
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(value);
      toast.success(`${getFieldLabel()} updated successfully`);
      onClose();
    } catch (error: any) {
      toast.error(error.message || `Failed to update ${getFieldLabel()}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setValue(currentValue);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {getFieldLabel()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Project: <strong>{projectName}</strong>
            </p>
          </div>

          {fieldType === "status" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={value || ""} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {fieldType === "startDate" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={
                  value
                    ? new Date(value).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) => {
                  if (e.target.value) {
                    setValue(new Date(e.target.value).getTime());
                  } else {
                    setValue(null);
                  }
                }}
              />
            </div>
          )}

          {fieldType === "endDate" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Estimated End Date</label>
              <Input
                type="date"
                value={
                  value
                    ? new Date(value).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) => {
                  if (e.target.value) {
                    setValue(new Date(e.target.value).getTime());
                  } else {
                    setValue(null);
                  }
                }}
              />
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving || isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSaving ? "Updating..." : "Update"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
