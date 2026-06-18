import CRMLayout from "@/components/CRMLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import { Building2, Shield, User, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminUsers() {
  const [linkingUserId, setLinkingUserId] = useState<number | null>(null);
  const [selectedSubId, setSelectedSubId] = useState("");

  const utils = trpc.useUtils();
  const { data: users = [], isLoading } = trpc.adminUsers.list.useQuery();
  const { data: subs = [] } = trpc.subcontractors.list.useQuery();

  const updateRoleMutation = trpc.adminUsers.setRole.useMutation({
    onSuccess: () => {
      utils.adminUsers.list.invalidate();
      toast.success("Role updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const linkSubMutation = trpc.subcontractors.linkUser.useMutation({
    onSuccess: () => {
      utils.adminUsers.list.invalidate();
      utils.subcontractors.list.invalidate();
      toast.success("User linked to subcontractor");
      setLinkingUserId(null);
      setSelectedSubId("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <CRMLayout>
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage roles and link users to subcontractor accounts
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-card rounded-xl animate-pulse border border-border" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No users yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {users.map((user) => {
              const linkedSub = subs.find((s) => s.userId === user.id);
              return (
                <Card key={user.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          {user.role === "admin" ? (
                            <Shield className="w-4 h-4 text-primary" />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                            <Badge
                              variant={user.role === "admin" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {user.role}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email ?? "No email"} · Joined {formatDate(user.createdAt)}
                          </p>
                          {linkedSub && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-emerald-400" />
                              <span className="text-xs text-emerald-400">{linkedSub.companyName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Select
                          value={user.role}
                          onValueChange={(v) =>
                            updateRoleMutation.mutate({
                              userId: user.id,
                              role: v as "admin" | "user",
                            })
                          }
                        >
                          <SelectTrigger className="w-28 h-8 text-xs bg-muted/30 border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>

                        {user.role !== "admin" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1"
                            onClick={() => {
                              setLinkingUserId(user.id);
                              setSelectedSubId(linkedSub ? String(linkedSub.id) : "");
                            }}
                          >
                            <Building2 className="w-3 h-3" />
                            {linkedSub ? "Re-link" : "Link Sub"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Link dialog */}
        <Dialog open={linkingUserId !== null} onOpenChange={(o) => !o && setLinkingUserId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link User to Subcontractor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                This grants the user access to the subcontractor portal and shows only their assigned projects.
              </p>
              <Select value={selectedSubId} onValueChange={setSelectedSubId}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Select subcontractor" />
                </SelectTrigger>
                <SelectContent>
                  {subs.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setLinkingUserId(null)}>Cancel</Button>
                <Button
                  disabled={!selectedSubId || linkSubMutation.isPending}
                  onClick={() =>
                    linkingUserId &&
                    linkSubMutation.mutate({
                      subcontractorId: parseInt(selectedSubId),
                      userId: linkingUserId,
                    })
                  }
                >
                  {linkSubMutation.isPending ? "Linking..." : "Link"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CRMLayout>
  );
}
