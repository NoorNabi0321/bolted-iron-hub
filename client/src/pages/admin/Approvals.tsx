import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, UserX, Clock, Mail, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ApprovalsPage() {
  const { data: pendingUsers, isLoading, refetch } = trpc.emailAuth.pendingUsers.useQuery();
  const approveMutation = trpc.emailAuth.approve.useMutation({
    onSuccess: () => {
      toast.success("User approved!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const rejectMutation = trpc.emailAuth.reject.useMutation({
    onSuccess: () => {
      toast.success("User rejected.");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <CRMLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">User Approvals</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve new user registrations. Users cannot log in until approved.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !pendingUsers || pendingUsers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <UserCheck className="w-12 h-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">All caught up!</h3>
              <p className="text-muted-foreground text-sm">No pending user registrations to review.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                <Clock className="w-3 h-3 mr-1" />
                {pendingUsers.length} pending
              </Badge>
            </div>

            <div className="grid gap-4">
              {pendingUsers.map((user) => (
                <Card key={user.id} className="border-l-4 border-l-yellow-400">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold text-foreground">{user.name || "No name"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{user.email || "No email"}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Registered: {new Date(user.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => approveMutation.mutate({ userId: user.id })}
                          disabled={approveMutation.isPending}
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => rejectMutation.mutate({ userId: user.id })}
                          disabled={rejectMutation.isPending}
                        >
                          {rejectMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserX className="w-4 h-4 mr-1" />
                              Reject
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
