import React, { useState } from "react";
import { CheckCircle2, Circle, Trash2, AlertCircle, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { ChecklistProgressSlider } from "@/components/ChecklistProgressSlider";
import { formatChecklistText } from "@/lib/utils";

interface ChecklistItem {
  id: number;
  text: string;
  isCompleted: boolean;
  order: number;
  progress?: number;
}

interface ChecklistViewModeProps {
  projectId: number;
  items: ChecklistItem[];
  isLoading: boolean;
  onItemsChange?: () => void;
  showProgress?: boolean;
}

export function ChecklistViewMode({
  projectId,
  items,
  isLoading,
  onItemsChange,
  showProgress = false,
}: ChecklistViewModeProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [originalText, setOriginalText] = useState<string>("");

  const updateItemMutation = trpc.projects.updateChecklistItem.useMutation({
    onSuccess: () => {
      toast.success("Item updated");
      onItemsChange?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update item");
    },
  });

  const deleteItemMutation = trpc.projects.deleteChecklistItem.useMutation({
    onSuccess: () => {
      toast.success("Item deleted");
      setDeleteConfirmId(null);
      onItemsChange?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete item");
      setDeleteConfirmId(null);
    },
  });

  const handleToggleComplete = async (item: ChecklistItem) => {
    setUpdatingId(item.id);
    try {
      await updateItemMutation.mutateAsync({
        projectId,
        itemId: item.id,
        isCompleted: !item.isCompleted,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteConfirmId) return;

    setDeletingId(deleteConfirmId);
    try {
      await deleteItemMutation.mutateAsync({
        projectId,
        itemId: deleteConfirmId,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartEdit = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditText(item.text);
    setOriginalText(item.text);
  };

  const handleSaveEdit = async (itemId: number) => {
    if (!editText.trim()) {
      toast.error("Item text cannot be empty");
      return;
    }

    setUpdatingId(itemId);
    try {
      await updateItemMutation.mutateAsync({
        projectId,
        itemId,
        text: editText,
      });
      setEditingId(null);
      setEditText("");
      setOriginalText("");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setOriginalText("");
  };

  const completedCount = items.filter((item) => item.isCompleted).length;
  const totalCount = items.length;
  const completionPercentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // Sort items: uncompleted first, then completed
  const sortedItems = [...items].sort((a, b) => {
    if (a.isCompleted === b.isCompleted) {
      // If both have same completion status, maintain order by 'order' field
      return a.order - b.order;
    }
    // Uncompleted items (false) come before completed items (true)
    return a.isCompleted ? 1 : -1;
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No checklist items yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload a proposal to automatically generate checklist items
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 md:space-y-4">
      {/* Progress Bar */}
      <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2 gap-2">
          <span className="text-xs md:text-sm font-medium text-gray-700 flex-shrink-0">Progress</span>
          <span className="text-xs md:text-sm font-semibold text-gray-900 text-right">
            {completedCount} of {totalCount} items complete ({completionPercentage}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-1.5 md:space-y-2">
        {sortedItems.map((item) => (
          <div key={item.id}>
            {editingId === item.id ? (
              /* Edit Mode */
              <div className="flex items-center gap-2 p-3 md:p-4 rounded-lg border bg-blue-50 border-blue-200">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-md text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit(item.id);
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                />
                <button
                  onClick={() => handleSaveEdit(item.id)}
                  disabled={updatingId === item.id}
                  className="flex-shrink-0 p-0.5 md:p-1 text-green-600 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50"
                  aria-label="Save edit"
                >
                  <Check className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={updatingId === item.id}
                  className="flex-shrink-0 p-0.5 md:p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                  aria-label="Cancel edit"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            ) : (
              /* View Mode */
              <div
                className={`p-3 md:p-4 rounded-lg border transition-all ${
                  item.isCompleted
                    ? "bg-gray-50 border-gray-200"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 md:gap-3">
                {/* Tick Icon */}
                <button
                  onClick={() => handleToggleComplete(item)}
                  disabled={updatingId === item.id}
                  className="flex-shrink-0 p-0.5 md:p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
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
                    {formatChecklistText(item.text)}
                  </p>
                </div>

                {/* Edit Icon - Admin Only */}
                {isAdmin && (
                  <button
                    onClick={() => handleStartEdit(item)}
                    disabled={updatingId === item.id}
                    className="flex-shrink-0 p-0.5 md:p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
                    aria-label="Edit item"
                  >
                    <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                )}

                {/* Delete Icon - Admin Only */}
                {isAdmin && (
                  <button
                    onClick={() => setDeleteConfirmId(item.id)}
                    disabled={deletingId === item.id}
                    className="flex-shrink-0 p-0.5 md:p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                    aria-label="Delete item"
                  >
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                )}
                </div>
                {showProgress && (
                  <div className="mt-3 px-1">
                    <ChecklistProgressSlider
                      value={item.isCompleted ? 100 : (item.progress ?? 0)}
                      disabled={item.isCompleted}
                      onCommit={(progress) =>
                        updateItemMutation.mutate({ projectId, itemId: item.id, progress })
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => {
        if (!open) setDeleteConfirmId(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this checklist item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-gray-50 p-3 rounded-lg my-4">
            <p className="text-sm text-gray-700 break-words">
              {items.find((item) => item.id === deleteConfirmId)?.text}
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
