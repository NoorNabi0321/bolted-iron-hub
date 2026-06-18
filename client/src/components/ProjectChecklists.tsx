import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, DollarSign, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ProjectChecklists({
  projectId,
  canEditCost = false,
}: {
  projectId: number;
  canEditCost?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingCostId, setEditingCostId] = useState<number | null>(null);
  const [costValue, setCostValue] = useState("");

  const utils = trpc.useUtils();
  const { data: checklists = [] } = trpc.checklists.list.useQuery({ projectId });

  const createMutation = trpc.checklists.create.useMutation({
    onSuccess: () => {
      utils.checklists.list.invalidate({ projectId });
      setTitle("");
      setDescription("");
      setShowForm(false);
      toast.success("Checklist item added");
    },
    onError: (e) => toast.error(e.message),
  });

  const markCompleteMutation = trpc.checklists.markComplete.useMutation({
    onSuccess: () => {
      utils.checklists.list.invalidate({ projectId });
      toast.success("Item marked complete");
    },
  });

  const updateCostMutation = trpc.checklists.updateCost.useMutation({
    onSuccess: () => {
      utils.checklists.list.invalidate({ projectId });
      setEditingCostId(null);
      setCostValue("");
      toast.success("Cost updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.checklists.delete.useMutation({
    onSuccess: () => {
      utils.checklists.list.invalidate({ projectId });
      toast.success("Item removed");
    },
  });

  const completedCount = checklists.filter((c) => c.isCompleted).length;
  const progressPercent = checklists.length > 0 ? Math.round((completedCount / checklists.length) * 100) : 0;
  const totalCost = checklists.reduce((sum, c) => sum + (c.cost ? parseFloat(String(c.cost)) : 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Project Checklist</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedCount} of {checklists.length} items complete ({progressPercent}%)
            {totalCost > 0 && (
              <span className="ml-2 text-green-600 font-medium">
                Total: ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            )}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </Button>
      </div>

      {/* Progress bar */}
      {checklists.length > 0 && (
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
          <Input
            placeholder="Item title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-card border-border text-sm"
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="bg-card border-border text-sm resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => createMutation.mutate({ projectId, title, description: description || undefined })}
              disabled={!title.trim() || createMutation.isPending}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Checklist items */}
      <div className="space-y-2">
        {checklists.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No checklist items yet</p>
        ) : (
          checklists.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border transition-all ${
                item.isCompleted
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-card border-border hover:border-primary/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => !item.isCompleted && markCompleteMutation.mutate({ id: item.id })}
                  className={`mt-0.5 flex-shrink-0 ${item.isCompleted ? "text-emerald-600" : "text-muted-foreground hover:text-primary"}`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  )}
                  {item.isCompleted && item.completedBy && (
                    <p className="text-xs text-emerald-600 mt-1">Completed by {item.completedBy}</p>
                  )}

                  {/* Cost display / edit */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {item.cost ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                        <DollarSign className="w-3 h-3" />
                        {parseFloat(String(item.cost)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    ) : null}

                    {item.costUpdatedBy && (
                      <span className="text-xs text-muted-foreground">
                        by {item.costUpdatedBy}
                      </span>
                    )}

                    {canEditCost && editingCostId === item.id ? (
                      <div className="flex items-center gap-1">
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={costValue}
                            onChange={(e) => setCostValue(e.target.value)}
                            className="h-7 w-28 pl-6 text-xs"
                            autoFocus
                          />
                        </div>
                        <Button
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => {
                            if (costValue) {
                              updateCostMutation.mutate({ id: item.id, cost: costValue });
                            }
                          }}
                          disabled={!costValue || updateCostMutation.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2"
                          onClick={() => { setEditingCostId(null); setCostValue(""); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : canEditCost ? (
                      <button
                        onClick={() => {
                          setEditingCostId(item.id);
                          setCostValue(item.cost ? String(parseFloat(String(item.cost))) : "");
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        {item.cost ? "Edit cost" : "+ Add cost"}
                      </button>
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate({ id: item.id })}
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
