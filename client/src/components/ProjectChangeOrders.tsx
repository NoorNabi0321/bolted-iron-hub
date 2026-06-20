import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Check, Plus, Trash2, X } from "lucide-react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { toast } from "sonner";

export function ProjectChangeOrders({ projectId }: { projectId: number }) {
  const [showForm, setShowForm] = usePersistedState(`bih:proj:${projectId}:co:showForm`, false);
  const [orderNumber, setOrderNumber] = usePersistedState(`bih:proj:${projectId}:co:orderNumber`, "");
  const [description, setDescription] = usePersistedState(`bih:proj:${projectId}:co:description`, "");
  const [amount, setAmount] = usePersistedState(`bih:proj:${projectId}:co:amount`, "");
  const [notes, setNotes] = usePersistedState(`bih:proj:${projectId}:co:notes`, "");

  const utils = trpc.useUtils();
  const { data: orders = [] } = trpc.changeOrders.list.useQuery({ projectId });

  const createMutation = trpc.changeOrders.create.useMutation({
    onSuccess: () => {
      utils.changeOrders.list.invalidate({ projectId });
      setOrderNumber("");
      setDescription("");
      setAmount("");
      setNotes("");
      setShowForm(false);
      toast.success("Change order created");
    },
    onError: (e) => toast.error(e.message),
  });

  const approveMutation = trpc.changeOrders.approve.useMutation({
    onSuccess: () => {
      utils.changeOrders.list.invalidate({ projectId });
      toast.success("Change order approved");
    },
  });

  const rejectMutation = trpc.changeOrders.reject.useMutation({
    onSuccess: () => {
      utils.changeOrders.list.invalidate({ projectId });
      toast.success("Change order rejected");
    },
  });

  const deleteMutation = trpc.changeOrders.delete.useMutation({
    onSuccess: () => {
      utils.changeOrders.list.invalidate({ projectId });
      toast.success("Change order deleted");
    },
  });

  const totalLength = orders.reduce((sum, o) => sum + (parseFloat(o.amount as any) || 0), 0);
  const approvedLength = orders
    .filter((o) => o.status === "approved")
    .reduce((sum, o) => sum + (parseFloat(o.amount as any) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Change Orders</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total: {totalLength.toFixed(2)} in | Approved: {approvedLength.toFixed(2)} in
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          New Order
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Order #"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="bg-card border-border text-sm"
            />
            <Input
              placeholder="Length (Inches)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-card border-border text-sm"
            />
          </div>
          <Textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="bg-card border-border text-sm resize-none"
          />
          <Textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={1}
            className="bg-card border-border text-sm resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() =>
                createMutation.mutate({
                  projectId,
                  orderNumber,
                  description,
                  amount,
                  notes: notes || undefined,
                })
              }
              disabled={!orderNumber.trim() || !description.trim() || !amount.trim() || createMutation.isPending}
            >
              Create
            </Button>
          </div>
        </div>
      )}

      {/* Orders list */}
      <div className="space-y-2">
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No change orders</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="p-3 rounded-lg bg-card border border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">CO-{order.orderNumber}</span>
                    <Badge
                      variant={
                        order.status === "approved"
                          ? "default"
                          : order.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground">{order.description}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">{parseFloat(order.amount as any).toFixed(2)} in</span>
                    {order.createdBy && <span>by {order.createdBy}</span>}
                    {order.approvedAt && <span className="text-emerald-600">Approved {formatDate(order.approvedAt)}</span>}
                  </div>
                  {order.notes && <p className="text-xs text-muted-foreground mt-1">{order.notes}</p>}
                </div>

                {order.status === "pending" && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => approveMutation.mutate({ id: order.id })}
                      className="p-1.5 rounded hover:bg-emerald-100 text-emerald-600 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate({ id: order.id })}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => deleteMutation.mutate({ id: order.id })}
                  className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
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
