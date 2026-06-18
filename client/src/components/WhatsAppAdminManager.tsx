import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { trpc } from '@/lib/trpc';
import { Trash2, Plus, Shield, Users, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function WhatsAppAdminManager() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [adminPhoneNumber, setAdminPhoneNumber] = useState('');
  const [adminName, setAdminName] = useState('');
  const [deleteAdminId, setDeleteAdminId] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Fetch groups
  const { data: groups = [] } = trpc.whatsapp.getAuthorizedGroups.useQuery();

  // Fetch admins for selected group
  const { data: groupAdmins = [], refetch: refetchAdmins } = trpc.whatsappAdmins.getGroupAdmins.useQuery(
    { groupId: selectedGroupId || '' },
    { enabled: !!selectedGroupId }
  );

  // Fetch command permissions for selected group
  const { data: commandPermissions = [], refetch: refetchPermissions } = trpc.whatsappAdmins.getGroupCommandPermissions.useQuery(
    { groupId: selectedGroupId || '' },
    { enabled: !!selectedGroupId }
  );

  // Add admin mutation
  const addAdminMutation = trpc.whatsappAdmins.addGroupAdmin.useMutation({
    onSuccess: () => {
      setAdminPhoneNumber('');
      setAdminName('');
      refetchAdmins();
    },
  });

  // Remove admin mutation
  const removeAdminMutation = trpc.whatsappAdmins.removeGroupAdmin.useMutation({
    onSuccess: () => {
      setDeleteAdminId(null);
      refetchAdmins();
    },
  });

  // Update command permission mutation
  const updatePermissionMutation = trpc.whatsappAdmins.updateCommandPermission.useMutation({
    onSuccess: () => {
      refetchPermissions();
    },
  });

  const handleAddAdmin = () => {
    if (!selectedGroupId) {
      alert('Please select a group');
      return;
    }
    if (!adminPhoneNumber.trim()) {
      alert('Please enter a phone number');
      return;
    }

    addAdminMutation.mutate({
      groupId: selectedGroupId,
      adminPhoneNumber,
      adminName: adminName || undefined,
    });
  };

  const handleRemoveAdmin = () => {
    if (deleteAdminId) {
      removeAdminMutation.mutate({ adminId: deleteAdminId });
    }
  };

  const handleTogglePermission = (command: string, type: 'admin' | 'member') => {
    if (!selectedGroupId) return;

    const permission = commandPermissions.find(p => p.command === command);
    if (!permission) return;

    const newAllowedForAdmins = type === 'admin' ? !permission.allowedForAdmins : permission.allowedForAdmins;
    const newAllowedForMembers = type === 'member' ? !permission.allowedForMembers : permission.allowedForMembers;

    updatePermissionMutation.mutate({
      groupId: selectedGroupId,
      command,
      allowedForAdmins: newAllowedForAdmins,
      allowedForMembers: newAllowedForMembers,
      description: permission.description,
    });
  };

  // Initialize selected group if not set
  if (!selectedGroupId && groups.length > 0) {
    setSelectedGroupId(groups[0].id.toString());
  }

  return (
    <div className="space-y-6">
      {/* Group Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Group
          </CardTitle>
          <CardDescription>Choose a group to manage admins and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No groups available. Add groups in the Groups tab first.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => {
                    setSelectedGroupId(group.id.toString());
                    setExpandedGroup(null);
                  }}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    selectedGroupId === group.id.toString()
                      ? 'border-red-600 bg-red-50 dark:bg-red-950/20'
                      : 'border-border hover:border-red-400'
                  }`}
                >
                  <p className="font-medium">{group.groupName}</p>
                  <p className="text-xs text-muted-foreground">{group.groupChatId}</p>
                  <Badge variant={group.isEnabled ? 'default' : 'secondary'} className="mt-2">
                    {group.isEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedGroupId && (
        <>
          {/* Add Admin Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Group Admin
              </CardTitle>
              <CardDescription>Add a WhatsApp user as an admin for this group</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium">Admin Phone Number</label>
                    <Input
                      placeholder="+92xxxxxxxxxx"
                      value={adminPhoneNumber}
                      onChange={(e) => setAdminPhoneNumber(e.target.value)}
                      disabled={addAdminMutation.isPending}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Admin Name (Optional)</label>
                    <Input
                      placeholder="e.g., John Doe"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      disabled={addAdminMutation.isPending}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleAddAdmin}
                      disabled={addAdminMutation.isPending}
                      className="w-full"
                    >
                      {addAdminMutation.isPending ? 'Adding...' : 'Add Admin'}
                    </Button>
                  </div>
                </div>
                {addAdminMutation.error && (
                  <p className="text-sm text-red-600">{addAdminMutation.error.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Group Admins List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Group Admins
              </CardTitle>
              <CardDescription>Manage admins for this group</CardDescription>
            </CardHeader>
            <CardContent>
              {groupAdmins.length === 0 ? (
                <p className="text-sm text-muted-foreground">No admins added yet for this group</p>
              ) : (
                <div className="space-y-3">
                  {groupAdmins.map(admin => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{admin.adminPhoneNumber}</p>
                          {admin.adminName && (
                            <p className="text-sm text-muted-foreground">{admin.adminName}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Added {new Date(admin.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="default" className="bg-green-600">
                          Admin
                        </Badge>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteAdminId(admin.id.toString())}
                        disabled={removeAdminMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Command Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Command Permissions
              </CardTitle>
              <CardDescription>Configure which commands admins and members can use</CardDescription>
            </CardHeader>
            <CardContent>
              {commandPermissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No commands configured yet</p>
              ) : (
                <div className="space-y-4">
                  {commandPermissions.map(permission => (
                    <div key={permission.id} className="rounded-lg border p-4">
                      <div className="mb-3">
                        <p className="font-medium">/{permission.command}</p>
                        {permission.description && (
                          <p className="text-sm text-muted-foreground">{permission.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={permission.allowedForAdmins}
                            onCheckedChange={() => handleTogglePermission(permission.command, 'admin')}
                            disabled={updatePermissionMutation.isPending}
                          />
                          <span className="text-sm font-medium">Allowed for Admins</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={permission.allowedForMembers}
                            onCheckedChange={() => handleTogglePermission(permission.command, 'member')}
                            disabled={updatePermissionMutation.isPending}
                          />
                          <span className="text-sm font-medium">Allowed for Members</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="text-sm">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Admins:</strong> Users whose phone numbers are added as admins can execute all commands marked as "Allowed for Admins".
              </p>
              <p>
                <strong>Members:</strong> Regular group members can only execute commands marked as "Allowed for Members".
              </p>
              <p>
                <strong>Default:</strong> Commands not configured default to admin-only access.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAdminId} onOpenChange={(open) => !open && setDeleteAdminId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Remove Admin</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove this admin from the group? They will no longer be able to use admin-only commands.
          </AlertDialogDescription>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAdmin} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
