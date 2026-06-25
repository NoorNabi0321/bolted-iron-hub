import React, { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AddChecklistItemProps {
  projectId: number;
  maxOrder: number;
  onItemAdded?: () => void;
  /** Which list the new item belongs to. Defaults to the manual checklist. */
  source?: "manual" | "extracted";
  /** Mark the new item as user-added (shown green + active). */
  isUserAdded?: boolean;
  /** Custom trigger button label. */
  label?: string;
}

export function AddChecklistItem({
  projectId,
  maxOrder,
  onItemAdded,
  source = "manual",
  isUserAdded = false,
  label,
}: AddChecklistItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [itemText, setItemText] = useState("");

  const createItemMutation = trpc.projects.createChecklistItem.useMutation({
    onSuccess: () => {
      toast.success("Item added to checklist");
      setItemText("");
      setIsOpen(false);
      onItemAdded?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add item");
    },
  });

  const handleAddItem = async () => {
    if (!itemText.trim()) {
      toast.error("Please enter an item description");
      return;
    }

    await createItemMutation.mutateAsync({
      projectId,
      text: itemText.trim(),
      order: maxOrder + 1,
      isCompleted: false,
      source,
      isActive: true,
      isUserAdded,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddItem();
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm flex-shrink-0"
      >
        <Plus className="w-3 h-3 md:w-4 md:h-4" />
        <span className="hidden md:inline">Add Item</span>
        <span className="md:hidden">Add</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Checklist Item</DialogTitle>
            <DialogDescription>
              Enter a new item to add to the project checklist
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Enter item description..."
              value={itemText}
              onChange={(e) => setItemText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={createItemMutation.isPending}
              autoFocus
              className="min-h-10"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={createItemMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={createItemMutation.isPending || !itemText.trim()}
              className="gap-2"
            >
              {createItemMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
