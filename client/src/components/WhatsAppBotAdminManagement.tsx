/**
 * WhatsApp Bot Admin Management Component
 * Manage authorized admin users and their permissions
 */

import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';

interface AdminUser {
  id: number;
  phoneNumber: string;
  role: 'admin' | 'super_admin';
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export function WhatsAppBotAdminManagement() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Fetch admin users
  const { data: admins = [], isLoading, refetch } = trpc.whatsappBot.getAdminUsers.useQuery(
    undefined,
    { refetchInterval: 10000 }
  );

  // Add admin mutation
  const addAdminMutation = trpc.whatsappBot.addAdminUser.useMutation({
    onSuccess: () => {
      setPhoneNumber('');
      setRole('admin');
      setIsDialogOpen(false);
      refetch();
    },
  });

  // Update admin mutation
  const updateAdminMutation = trpc.whatsappBot.updateAdminUser.useMutation({
    onSuccess: () => {
      setEditingId(null);
      refetch();
    },
  });

  // Delete admin mutation
  const deleteAdminMutation = trpc.whatsappBot.deleteAdminUser.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleAddAdmin = async () => {
    if (!phoneNumber.trim()) {
      alert('Please enter a phone number');
      return;
    }

    await addAdminMutation.mutateAsync({
      phoneNumber: phoneNumber.trim(),
      role,
    });
  };

  const handleUpdateAdmin = async (adminId: number, newRole: 'admin' | 'super_admin') => {
    await updateAdminMutation.mutateAsync({
      adminId,
      role: newRole,
    });
  };

  const handleToggleActive = async (admin: AdminUser) => {
    await updateAdminMutation.mutateAsync({
      adminId: admin.id,
      isActive: !admin.isActive,
    });
  };

  const handleDeleteAdmin = async (adminId: number) => {
    if (confirm('Are you sure you want to delete this admin user?')) {
      await deleteAdminMutation.mutateAsync({ adminId });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    return role === 'super_admin'
      ? 'bg-purple-100 text-purple-800'
      : 'bg-blue-100 text-blue-800';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Admin Management</CardTitle>
            <CardDescription>
              Manage authorized WhatsApp bot administrators ({admins.length} total)
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Admin User</DialogTitle>
                <DialogDescription>
                  Add a new authorized administrator for the WhatsApp bot
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    placeholder="Enter WhatsApp phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <Select value={role} onValueChange={(v) => setRole(v as any)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddAdmin}
                    disabled={addAdminMutation.isPending}
                  >
                    {addAdminMutation.isPending ? 'Adding...' : 'Add Admin'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Phone Number</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Loading admins...
                  </TableCell>
                </TableRow>
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No admin users yet. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin: AdminUser) => (
                  <TableRow key={admin.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">{admin.phoneNumber}</TableCell>
                    <TableCell>
                      <Select
                        value={admin.role}
                        onValueChange={(newRole) =>
                          handleUpdateAdmin(admin.id, newRole as any)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`cursor-pointer ${
                          admin.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                        onClick={() => handleToggleActive(admin)}
                      >
                        {admin.isActive ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAdmin(admin.id)}
                        disabled={deleteAdminMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Role Information */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="flex items-start gap-3">
              <Badge className="bg-blue-100 text-blue-800 mt-1">Admin</Badge>
              <div>
                <h4 className="font-medium text-sm">Admin Role</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Can execute all bot commands and view logs
                </p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-purple-50">
            <div className="flex items-start gap-3">
              <Badge className="bg-purple-100 text-purple-800 mt-1">Super Admin</Badge>
              <div>
                <h4 className="font-medium text-sm">Super Admin Role</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Full access including admin management and settings
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
