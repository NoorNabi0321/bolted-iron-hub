/**
 * WhatsApp Settings Page
 * Admin dashboard for managing WhatsApp bot settings, authorized groups, and statistics
 */

import { useState } from 'react';
import CRMLayout from '@/components/CRMLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  Settings,
  BarChart3,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Users,
  X,
  Send,
  Loader,
  Wifi,
  WifiOff,
  Smartphone,
  Clock,
} from 'lucide-react';

import { trpc } from '@/lib/trpc';
import { WhatsAppAdminManager } from '@/components/WhatsAppAdminManager';
import { WhatsAppCommandConfig } from '@/components/WhatsAppCommandConfig';
import { WhatsAppQRCodeDisplay } from '@/components/WhatsAppQRCodeDisplay';

interface Group {
  id: string;
  groupChatId: string;
  groupName: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date | null;
  notes: string | null;
}

export default function WhatsAppSettings() {
  const [selectedTab, setSelectedTab] = useState('groups');
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupFormData, setGroupFormData] = useState({
    groupChatId: '',
    groupName: '',
    notes: '',
  });
  const [testMessageStatus, setTestMessageStatus] = useState<{
    isLoading: boolean;
    success: boolean | null;
    message: string;
  }>({
    isLoading: false,
    success: null,
    message: '',
  });

  // Fetch data
  const { data: groups = [], isLoading: groupsLoading } = trpc.whatsapp.getAuthorizedGroups.useQuery();
  const { data: stats } = trpc.whatsapp.getStatistics.useQuery();
  const { data: botStatus, refetch: refetchBotStatus } = trpc.whatsappBot.getBotStatus.useQuery();

  const enableGroupMutation = trpc.whatsapp.enableGroup.useMutation();
  const disableGroupMutation = trpc.whatsapp.disableGroup.useMutation();
  const deleteGroupMutation = trpc.whatsapp.deleteGroup.useMutation();
  const addGroupMutation = trpc.whatsapp.addAuthorizedGroup.useMutation();
  const sendTestMessageMutation = trpc.whatsapp.sendTestMessage.useMutation();

  const handleToggleGroup = async (groupId: string, isEnabled: boolean) => {
    try {
      if (isEnabled) {
        await disableGroupMutation.mutateAsync({ groupId });
      } else {
        await enableGroupMutation.mutateAsync({ groupId });
      }
      // Refetch groups to update UI without page reload
      const utils = trpc.useUtils();
      await utils.whatsapp.getAuthorizedGroups.invalidate();
    } catch (error) {
      console.error('Failed to toggle group:', error);
    }
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroupId(group.id);
    setGroupFormData({
      groupChatId: group.groupChatId,
      groupName: group.groupName,
      notes: group.notes || '',
    });
    setShowEditGroupModal(true);
  };

  const handleUpdateGroup = async () => {
    if (!editingGroupId || !groupFormData.groupChatId || !groupFormData.groupName) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const updateGroupMutation = trpc.whatsapp.updateGroup.useMutation();
      await updateGroupMutation.mutateAsync({
        groupId: editingGroupId,
        groupName: groupFormData.groupName,
        notes: groupFormData.notes || undefined,
      });
      
      // Refetch groups to update UI
      const utils = trpc.useUtils();
      await utils.whatsapp.getAuthorizedGroups.invalidate();
      
      setShowEditGroupModal(false);
      setEditingGroupId(null);
      setGroupFormData({ groupChatId: '', groupName: '', notes: '' });
      alert('Group updated successfully');
    } catch (error) {
      console.error('Failed to update group:', error);
      alert('Failed to update group. Please try again.');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (confirm('Are you sure you want to delete this group?')) {
      try {
        await deleteGroupMutation.mutateAsync({ groupId });
        // Refetch groups to update UI
        const utils = trpc.useUtils();
        await utils.whatsapp.getAuthorizedGroups.invalidate();
      } catch (error) {
        console.error('Failed to delete group:', error);
        alert('Failed to delete group. Please try again.');
      }
    }
  };

  const handleAddGroup = async () => {
    if (!groupFormData.groupChatId || !groupFormData.groupName) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await addGroupMutation.mutateAsync({
        groupChatId: groupFormData.groupChatId,
        groupName: groupFormData.groupName,
        notes: groupFormData.notes || null,
      });
      
      // Refetch groups to update UI
      const utils = trpc.useUtils();
      await utils.whatsapp.getAuthorizedGroups.invalidate();
      
      setShowAddGroupModal(false);
      setGroupFormData({ groupChatId: '', groupName: '', notes: '' });
    } catch (error) {
      console.error('Failed to add group:', error);
      alert('Failed to add group. Please try again.');
    }
  };

  const handleSendTestMessage = async () => {
    const targetGroup = groups.length > 0 ? groups[0] : null;
    
    if (!targetGroup) {
      setTestMessageStatus({
        isLoading: false,
        success: false,
        message: 'Please add a group first',
      });
      return;
    }
    
    setTestMessageStatus({
      isLoading: true,
      success: null,
      message: 'Sending test message...',
    });

    try {
      const result = await sendTestMessageMutation.mutateAsync({
        groupChatId: targetGroup.groupChatId,
      });

      if (result.success) {
        setTestMessageStatus({
          isLoading: false,
          success: true,
          message: '✅ Test message sent successfully! Check your WhatsApp group.',
        });
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setTestMessageStatus({
            isLoading: false,
            success: null,
            message: '',
          });
        }, 5000);
      } else {
        setTestMessageStatus({
          isLoading: false,
          success: false,
          message: `❌ Failed: ${result.message}`,
        });
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      setTestMessageStatus({
        isLoading: false,
        success: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Failed to send test message'}`,
      });
    }
  };

  const enabledCount = groups.filter(g => g.isEnabled).length;
  const successRate = stats?.successRate ?? 0;
  const errorRate = stats?.errorRate ?? 0;

  return (
    <CRMLayout>
      <div className="space-y-6">
        {/* Page Header with Dashboard Link */}
        <div className="flex items-center justify-between">
          <div className="sm:hidden">
            <h1 className="text-2xl font-bold text-foreground">WhatsApp Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage bot configuration and groups</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/whatsapp-bot'}
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Bot Dashboard</span>
            <span className="sm:hidden">Dashboard</span>
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Messages */}
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Total Messages</p>
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-foreground">{stats?.totalMessages ?? 0}</p>
                <p className="text-xs text-muted-foreground">All time</p>
              </div>
            </CardContent>
          </Card>

          {/* Active Groups */}
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Active Groups</p>
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-foreground">{enabledCount}</p>
                <p className="text-xs text-muted-foreground">of {groups.length} total</p>
              </div>
            </CardContent>
          </Card>

          {/* Success Rate */}
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-foreground">{successRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Successful messages</p>
              </div>
            </CardContent>
          </Card>

          {/* Error Rate */}
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-3xl font-bold text-foreground">{errorRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Failed messages</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card className="border-border">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="w-full justify-start border-b border-border bg-transparent rounded-none p-0 h-auto">
              <TabsTrigger
                value="groups"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
              >
                <Users className="w-4 h-4 mr-2" />
                Groups
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger
                value="admins"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
              >
                <Users className="w-4 h-4 mr-2" />
                Authorized Admins
              </TabsTrigger>
              <TabsTrigger
                value="commands"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Commands
              </TabsTrigger>
              <TabsTrigger
                value="qrcode"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Bot Authentication
              </TabsTrigger>
            </TabsList>

            {/* Groups Tab */}
            <TabsContent value="groups" className="space-y-6 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Authorized Groups</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage WhatsApp groups where the bot is active
                  </p>
                </div>
                <Button 
                  className="gap-2"
                  onClick={() => setShowAddGroupModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add Group
                </Button>
              </div>

              {groupsLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading groups...</div>
              ) : groups.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No groups configured yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add your first WhatsApp group to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.map(group => (
                    <Card key={group.id} className="border-border hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-foreground truncate">
                                {group.groupName}
                              </h4>
                              <Badge
                                variant={group.isEnabled ? 'default' : 'secondary'}
                                className="shrink-0"
                              >
                                {group.isEnabled ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono mb-2">
                              {group.groupChatId}
                            </p>
                            {group.notes && (
                              <p className="text-sm text-muted-foreground">{group.notes}</p>
                            )}
                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                              {group.lastActivityAt && (
                                <span>
                                  Last activity:{' '}
                                  {new Date(group.lastActivityAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleGroup(group.id, group.isEnabled)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {group.isEnabled ? (
                                <ToggleRight className="w-5 h-5 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-gray-400" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditGroup(group)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGroup(group.id)}
                              className="text-muted-foreground hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6 p-6">
              {/* Test Bot Message */}
              <Card className="border-border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    Test Bot Message
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-foreground">
                    Send a test message to the admin's WhatsApp group to verify the bot is working correctly.
                  </p>
                  
                  {testMessageStatus.message && (
                    <div className={`p-3 rounded-md text-sm ${
                      testMessageStatus.success
                        ? 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-200'
                        : 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-200'
                    }`}>
                      {testMessageStatus.message}
                    </div>
                  )}
                  
                  <Button
                    onClick={handleSendTestMessage}
                    disabled={testMessageStatus.isLoading}
                    className="gap-2 w-full sm:w-auto"
                  >
                    {testMessageStatus.isLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Test Message
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Bot Status Information */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Bot Connection Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Connection Status</label>
                    <div className="flex items-center gap-2 mt-2">
                      {botStatus?.isConnected ? (
                        <>
                          <Wifi className="w-4 h-4 text-green-600" />
                          <Badge variant="default" className="bg-green-600">Connected</Badge>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-4 h-4 text-red-600" />
                          <Badge variant="destructive">Disconnected</Badge>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {botStatus?.isConnected 
                        ? 'Bot is connected to WhatsApp Web' 
                        : 'Bot is not connected. Check Bot Authentication tab to scan QR code.'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground">Initialization Status</label>
                    <div className="flex items-center gap-2 mt-2">
                      {botStatus?.isInitialized ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <Badge variant="default" className="bg-green-600">Initialized</Badge>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <Badge variant="secondary">Initializing</Badge>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground">Ready Status</label>
                    <div className="flex items-center gap-2 mt-2">
                      {botStatus?.isReady ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <Badge variant="default" className="bg-green-600">Ready</Badge>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-yellow-600" />
                          <Badge variant="secondary">Not Ready</Badge>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {botStatus?.isReady 
                        ? 'Bot is ready to receive and process messages' 
                        : 'Bot is initializing. Please wait or check Bot Authentication tab.'}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchBotStatus()}
                    className="gap-2 mt-4"
                  >
                    <Loader className="w-4 h-4" />
                    Refresh Status
                  </Button>
                </CardContent>
              </Card>

              {/* Bot Implementation Info */}
              <Card className="border-border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="text-sm">Implementation Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <p className="font-medium text-foreground">Library:</p>
                    <p className="text-muted-foreground">whatsapp-web.js</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Authentication Method:</p>
                    <p className="text-muted-foreground">WhatsApp Web QR Code Scanning</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Session Persistence:</p>
                    <p className="text-muted-foreground">Enabled (session data stored on server)</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Authorized Admins Tab */}
            <TabsContent value="admins" className="space-y-6 p-6">
              <WhatsAppAdminManager />
            </TabsContent>

            {/* Commands Tab */}
            <TabsContent value="commands" className="space-y-6 p-6">
              <WhatsAppCommandConfig />
            </TabsContent>

            {/* Bot Authentication Tab */}
            <TabsContent value="qrcode" className="space-y-6 p-6">
              <WhatsAppQRCodeDisplay />
            </TabsContent>
          </Tabs>
        </Card>

        {/* Edit Group Modal */}
        {showEditGroupModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Edit WhatsApp Group</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEditGroupModal(false);
                    setEditingGroupId(null);
                    setGroupFormData({ groupChatId: '', groupName: '', notes: '' });
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Group Chat ID *</label>
                  <input 
                    type="text" 
                    placeholder="e.g., 120363123456789@g.us"
                    value={groupFormData.groupChatId}
                    onChange={(e) => setGroupFormData({...groupFormData, groupChatId: e.target.value})}
                    className="w-full mt-2 px-3 py-2 border border-border rounded-md text-foreground bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Group Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Project Alpha Team"
                    value={groupFormData.groupName}
                    onChange={(e) => setGroupFormData({...groupFormData, groupName: e.target.value})}
                    className="w-full mt-2 px-3 py-2 border border-border rounded-md text-foreground bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Notes (Optional)</label>
                  <textarea 
                    placeholder="Add any notes about this group"
                    value={groupFormData.notes}
                    onChange={(e) => setGroupFormData({...groupFormData, notes: e.target.value})}
                    className="w-full mt-2 px-3 py-2 border border-border rounded-md text-foreground bg-background"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowEditGroupModal(false);
                      setEditingGroupId(null);
                      setGroupFormData({ groupChatId: '', groupName: '', notes: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateGroup}
                  >
                    Update Group
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Group Modal */}
        {showAddGroupModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Add WhatsApp Group</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddGroupModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Group Chat ID *</label>
                  <input 
                    type="text" 
                    placeholder="e.g., 120363123456789@g.us"
                    value={groupFormData.groupChatId}
                    onChange={(e) => setGroupFormData({...groupFormData, groupChatId: e.target.value})}
                    className="w-full mt-2 px-3 py-2 border border-border rounded-md text-foreground bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get this from WhatsApp group info or check bot logs when bot receives first message
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Group Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Project Alpha Team"
                    value={groupFormData.groupName}
                    onChange={(e) => setGroupFormData({...groupFormData, groupName: e.target.value})}
                    className="w-full mt-2 px-3 py-2 border border-border rounded-md text-foreground bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Notes (Optional)</label>
                  <textarea 
                    placeholder="Add any notes about this group"
                    value={groupFormData.notes}
                    onChange={(e) => setGroupFormData({...groupFormData, notes: e.target.value})}
                    className="w-full mt-2 px-3 py-2 border border-border rounded-md text-foreground bg-background"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button 
                    variant="outline"
                    onClick={() => setShowAddGroupModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddGroup}
                    disabled={addGroupMutation.isPending}
                  >
                    {addGroupMutation.isPending ? 'Adding...' : 'Add Group'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
