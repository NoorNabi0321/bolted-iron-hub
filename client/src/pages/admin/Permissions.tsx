import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { PERMISSION_LEVELS } from "@shared/const";
import { Shield, Users } from "lucide-react";
import { toast } from "sonner";

export default function PermissionsPage() {
  const { data: users = [], isLoading } = trpc.adminUsers.list.useQuery();
  const utils = trpc.useUtils();

  const setPermissionMutation = trpc.adminUsers.setPermission.useMutation({
    onSuccess: () => {
      utils.adminUsers.list.invalidate();
      toast.success("Permission updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handlePermissionChange = (userId: number, permission: string) => {
    setPermissionMutation.mutate({ userId, permission: permission as "view" | "edit" | "admin" });
  };

  return (
    <CRMLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Permissions</h1>
            <p className="text-sm text-muted-foreground">Control what each user can see and do</p>
          </div>
        </div>

        {/* Permissions table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">User</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Permission Level</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{user.name || "Unknown"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{user.email || "—"}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === "admin"
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary/10 text-secondary-foreground"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Select
                          value={user.permission || "view"}
                          onValueChange={(value) => handlePermissionChange(user.id, value)}
                          disabled={setPermissionMutation.isPending}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PERMISSION_LEVELS.map((level: string) => (
                              <SelectItem key={level} value={level} className="text-xs">
                                {level.charAt(0).toUpperCase() + level.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Permission descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <h3 className="font-semibold text-sm text-foreground mb-2">View Only</h3>
            <p className="text-xs text-muted-foreground">
              Can view projects, notes, and files. Cannot make any changes or see financial data.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <h3 className="font-semibold text-sm text-foreground mb-2">Edit</h3>
            <p className="text-xs text-muted-foreground">
              Can edit projects, add notes and files, update status. Cannot access financial data.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <h3 className="font-semibold text-sm text-foreground mb-2">Admin</h3>
            <p className="text-xs text-muted-foreground">
              Full access to all features including financial data, user management, and system settings.
            </p>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}
