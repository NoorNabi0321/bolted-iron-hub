import React, { useState, useEffect, useRef } from "react";
import { GripVertical, Trash2, Edit2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ChecklistItem {
  id: number;
  text: string;
  isCompleted: boolean;
  order: number;
}

interface ChecklistEditModeProps {
  projectId: number;
  items: ChecklistItem[];
  onSave?: () => void;
  onCancel?: () => void;
}

export function ChecklistEditMode({
  projectId,
  items: initialItems,
  onSave,
  onCancel,
}: ChecklistEditModeProps) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());

  const updateItemMutation = trpc.projects.updateChecklistItem.useMutation();
  const deleteItemMutation = trpc.projects.deleteChecklistItem.useMutation();

  // Track if items have changed
  useEffect(() => {
    const itemsChanged = JSON.stringify(items) !== JSON.stringify(initialItems);
    setHasChanges(itemsChanged);
  }, [items, initialItems]);

  const handleDragStart = (e: React.DragEvent, itemId: number) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", "");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseY = e.clientY - containerRect.top;

    // Find which item position the user is dragging over
    let targetIndex = items.length;
    for (let i = 0; i < items.length; i++) {
      const itemRef = itemRefsMap.current.get(items[i].id);
      if (itemRef) {
        const itemRect = itemRef.getBoundingClientRect();
        const itemRelativeY = itemRect.top - containerRect.top;
        const itemMiddle = itemRelativeY + itemRect.height / 2;

        if (mouseY < itemMiddle) {
          targetIndex = i;
          break;
        }
      }
    }

    setDropIndicatorIndex(targetIndex);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the container entirely
    if (e.currentTarget === containerRef.current) {
      setDropIndicatorIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedItemId === null || dropIndicatorIndex === null) return;

    const draggedItem = items.find((item) => item.id === draggedItemId);
    if (!draggedItem) return;

    const currentIndex = items.findIndex((item) => item.id === draggedItemId);
    if (currentIndex === dropIndicatorIndex) {
      setDropIndicatorIndex(null);
      setDraggedItemId(null);
      return;
    }

    // Reorder items
    const newItems = items.filter((item) => item.id !== draggedItemId);
    newItems.splice(dropIndicatorIndex, 0, draggedItem);

    // Update order numbers
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    setItems(reorderedItems);
    setDropIndicatorIndex(null);
    setDraggedItemId(null);
  };

  const handleDragEnd = () => {
    setDropIndicatorIndex(null);
    setDraggedItemId(null);
  };

  const handleStartEdit = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const handleSaveEdit = (itemId: number) => {
    if (!editText.trim()) {
      toast.error("Item text cannot be empty");
      return;
    }

    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, text: editText.trim() } : item
      )
    );
    setEditingId(null);
    setEditText("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleDeleteItem = (itemId: number) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit(itemId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // Update all items with new text and order
      for (const item of items) {
        const originalItem = initialItems.find((i) => i.id === item.id);
        if (originalItem) {
          if (item.text !== originalItem.text || item.order !== originalItem.order) {
            await updateItemMutation.mutateAsync({
              projectId,
              itemId: item.id,
              text: item.text,
              order: item.order,
            });
          }
        }
      }

      // Delete items that were removed
      for (const originalItem of initialItems) {
        if (!items.find((i) => i.id === originalItem.id)) {
          await deleteItemMutation.mutateAsync({
            projectId,
            itemId: originalItem.id,
          });
        }
      }

      toast.success("Checklist updated successfully");
      onSave?.();
    } catch (error) {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to discard them?"
      );
      if (!confirmed) return;
    }
    onCancel?.();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: "8px",
          border: "2px solid #e5e7eb",
          minHeight: "200px",
          padding: "8px",
          transition: "all 0.2s ease",
        }}
      >
        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "#6b7280" }}>
            <p style={{ fontSize: "14px" }}>No items to edit</p>
          </div>
        ) : (
          <>
            {/* Drop indicator at the top */}
            {dropIndicatorIndex === 0 && (
              <div
                style={{
                  height: "2px",
                  backgroundColor: "#3b82f6",
                  marginBottom: "8px",
                  borderRadius: "1px",
                  animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
            )}

            {items.map((item, index) => (
              <div key={item.id}>
                <div
                  ref={(el) => {
                    if (el) itemRefsMap.current.set(item.id, el);
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  style={{
                    backgroundColor: draggedItemId === item.id ? "#f0f9ff" : "#ffffff",
                    border: `2px solid ${draggedItemId === item.id ? "#93c5fd" : "#e5e7eb"}`,
                    borderRadius: "6px",
                    padding: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    boxShadow:
                      draggedItemId === item.id
                        ? "0 4px 12px -2px rgba(0, 0, 0, 0.08)"
                        : "none",
                    transition: "all 0.15s ease",
                    opacity: draggedItemId === item.id ? 0.7 : 1,
                    cursor: "grab",
                    marginBottom: "8px",
                  }}
                  onMouseEnter={(e) => {
                    if (draggedItemId !== item.id) {
                      e.currentTarget.style.borderColor = "#d1d5db";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (draggedItemId !== item.id) {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }
                  }}
                >
                  {/* Drag Handle */}
                  <div
                    style={{
                      flexShrink: 0,
                      cursor: "grab",
                      padding: "4px",
                      color: "#9ca3af",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#4b5563";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#9ca3af";
                    }}
                  >
                    <GripVertical style={{ width: "20px", height: "20px" }} />
                  </div>

                  {/* Item Text or Edit Input */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingId === item.id ? (
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        onBlur={() => handleSaveEdit(item.id)}
                        autoFocus
                        style={{ height: "32px" }}
                      />
                    ) : (
                      <p
                        style={{
                          fontSize: "14px",
                          wordBreak: "break-word",
                          cursor: "pointer",
                          color: item.isCompleted ? "#9ca3af" : "#111827",
                          textDecoration: item.isCompleted ? "line-through" : "none",
                          margin: 0,
                          transition: "color 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!item.isCompleted) {
                            e.currentTarget.style.color = "#2563eb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!item.isCompleted) {
                            e.currentTarget.style.color = "#111827";
                          }
                        }}
                        onClick={() => handleStartEdit(item)}
                      >
                        {item.text}
                      </p>
                    )}
                  </div>

                  {/* Edit/Save Buttons */}
                  {editingId === item.id ? (
                    <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        style={{
                          padding: "4px",
                          color: "#16a34a",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background-color 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#dcfce7";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                        aria-label="Save"
                      >
                        <Check style={{ width: "16px", height: "16px" }} />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          padding: "4px",
                          color: "#9ca3af",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f3f4f6";
                          e.currentTarget.style.color = "#4b5563";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "#9ca3af";
                        }}
                        aria-label="Cancel"
                      >
                        <X style={{ width: "16px", height: "16px" }} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartEdit(item)}
                      style={{
                        flexShrink: 0,
                        padding: "4px",
                        color: "#9ca3af",
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#dbeafe";
                        e.currentTarget.style.color = "#2563eb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#9ca3af";
                      }}
                      aria-label="Edit"
                    >
                      <Edit2 style={{ width: "16px", height: "16px" }} />
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    style={{
                      flexShrink: 0,
                      padding: "4px",
                      color: "#9ca3af",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#fee2e2";
                      e.currentTarget.style.color = "#dc2626";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#9ca3af";
                    }}
                    aria-label="Delete"
                  >
                    <Trash2 style={{ width: "16px", height: "16px" }} />
                  </button>
                </div>

                {/* Drop indicator between items */}
                {dropIndicatorIndex === index + 1 && (
                  <div
                    style={{
                      height: "2px",
                      backgroundColor: "#3b82f6",
                      marginBottom: "8px",
                      borderRadius: "1px",
                      animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    }}
                  />
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Save/Cancel Buttons */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          justifyContent: "flex-end",
          paddingTop: "16px",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSaveAll}
          disabled={isSaving || !hasChanges}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {isSaving && <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />}
          Save Changes
        </Button>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
