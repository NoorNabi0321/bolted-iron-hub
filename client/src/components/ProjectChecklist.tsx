import React from "react";
import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChecklistViewMode } from "./ChecklistViewMode";
import { AddChecklistItem } from "./AddChecklistItem";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface ChecklistItem {
  id: number;
  text: string;
  isCompleted: boolean;
  order: number;
}

interface ProjectChecklistProps {
  projectId: number;
  /**
   * Which checklist to show:
   * - "manual"    → hand-managed items (admin Checklist tab). Default.
   * - "extracted" → proposal-extracted items (subcontractor view).
   */
  source?: "manual" | "extracted";
}

export function ProjectChecklist({ projectId, source = "manual" }: ProjectChecklistProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: allItems = [], isLoading, refetch } = trpc.projects.getChecklistItems.useQuery({
    projectId,
    source,
  });

  // Extracted items must be activated before subcontractors work them; hide
  // inactive ones. Legacy rows without the flag default to visible.
  const visibleItems =
    source === "extracted"
      ? allItems.filter((item) => (item as { isActive?: boolean }).isActive ?? true)
      : allItems;

  const maxOrder = visibleItems.length > 0 ? Math.max(...visibleItems.map((item) => item.order)) : 0;

  const handleItemsChange = () => {
    refetch();
  };

  return (
    <Card>
      <CardHeader className="pb-2 md:pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <FileText className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
            <span className="truncate">Checklist & Tasks</span>
          </CardTitle>
          {isAdmin && <AddChecklistItem projectId={projectId} maxOrder={maxOrder} withQuantity onItemAdded={handleItemsChange} />}
        </div>
      </CardHeader>

            <CardContent className="space-y-3 md:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm font-medium text-gray-700 truncate">Project Checklist</p>
            <p className="text-xs text-gray-500 mt-0.5 md:mt-1 truncate">
              {visibleItems.length} of {visibleItems.length} items
              {visibleItems.length > 0 &&
                ` (${Math.round((visibleItems.filter((i) => i.isCompleted).length / visibleItems.length) * 100)}% complete)`}
            </p>
          </div>
        </div>

        <ChecklistViewMode
          projectId={projectId}
          items={visibleItems}
          isLoading={isLoading}
          onItemsChange={handleItemsChange}
          showProgress={source === "extracted"}
        />
      </CardContent>
    </Card>
  );
}
