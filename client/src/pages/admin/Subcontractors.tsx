import CRMLayout from "@/components/CRMLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Building2, Edit, Mail, Phone, Plus, Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SubForm {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  trade: string;
  notes: string;
}

const emptyForm: SubForm = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  trade: "",
  notes: "",
};

export default function AdminSubcontractors() {
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SubForm>(emptyForm);

  const utils = trpc.useUtils();
  const { data: subs = [], isLoading } = trpc.subcontractors.list.useQuery();

  const createMutation = trpc.subcontractors.create.useMutation({
    onSuccess: () => {
      utils.subcontractors.list.invalidate();
      toast.success("Subcontractor created");
      setShowDialog(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.subcontractors.update.useMutation({
    onSuccess: () => {
      utils.subcontractors.list.invalidate();
      toast.success("Subcontractor updated");
      setShowDialog(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.subcontractors.delete.useMutation({
    onSuccess: () => {
      utils.subcontractors.list.invalidate();
      toast.success("Subcontractor removed");
    },
  });

  const filtered = subs.filter(
    (s) =>
      s.companyName.toLowerCase().includes(search.toLowerCase()) ||
      s.contactName?.toLowerCase().includes(search.toLowerCase()) ||
      s.trade?.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowDialog(true);
  }

  function openEdit(sub: (typeof subs)[0]) {
    setEditingId(sub.id);
    setForm({
      companyName: sub.companyName,
      contactName: sub.contactName ?? "",
      email: sub.email ?? "",
      phone: sub.phone ?? "",
      trade: sub.trade ?? "",
      notes: sub.notes ?? "",
    });
    setShowDialog(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      companyName: form.companyName,
      contactName: form.contactName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      trade: form.trade || undefined,
      notes: form.notes || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const set = (field: keyof SubForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <CRMLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Subcontractors</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{subs.length} registered subcontractors</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" onClick={openCreate}>
                <Plus className="w-4 h-4" />
                Add Subcontractor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Subcontractor" : "Add Subcontractor"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Company Name *</Label>
                  <Input value={form.companyName} onChange={set("companyName")} required className="bg-card border-border" placeholder="e.g. Allied Steel Inc." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Contact Name</Label>
                    <Input value={form.contactName} onChange={set("contactName")} className="bg-card border-border" placeholder="Primary contact" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Trade</Label>
                    <Input value={form.trade} onChange={set("trade")} className="bg-card border-border" placeholder="e.g. Structural Steel" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={set("email")} className="bg-card border-border" placeholder="email@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={set("phone")} className="bg-card border-border" placeholder="(212) 555-0000" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={set("notes")} rows={2} className="bg-card border-border resize-none" placeholder="Internal notes..." />
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search subcontractors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border h-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-card rounded-xl animate-pulse border border-border" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No subcontractors found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((sub) => (
              <Card key={sub.id} className="bg-card border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(sub)}
                        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${sub.companyName}?`)) {
                            deleteMutation.mutate({ id: sub.id });
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground mb-0.5">{sub.companyName}</h3>
                  {sub.trade && <p className="text-xs text-primary mb-2">{sub.trade}</p>}
                  <div className="space-y-1">
                    {sub.contactName && (
                      <p className="text-xs text-muted-foreground">{sub.contactName}</p>
                    )}
                    {sub.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{sub.email}</span>
                      </div>
                    )}
                    {sub.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {sub.phone}
                      </div>
                    )}
                  </div>
                  {sub.userId && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <span className="text-xs text-emerald-400">Portal access enabled</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
