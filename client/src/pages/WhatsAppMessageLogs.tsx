import { useState, useMemo } from 'react';
import CRMLayout from '@/components/CRMLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertCircle,
  CheckCircle2,
  Download,
  Filter,
  Search,
  Clock,
  MessageCircle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/lib/utils';
import MessageLogModal from '@/components/MessageLogModal';

interface FilterState {
  groupChatId: string;
  commandType: string;
  status: 'all' | 'success' | 'error' | 'unauthorized';
  startDate: string;
  endDate: string;
  searchQuery: string;
}

export default function WhatsAppMessageLogs() {
  const [filters, setFilters] = useState<FilterState>({
    groupChatId: '',
    commandType: '',
    status: 'all',
    startDate: '',
    endDate: '',
    searchQuery: '',
  });

  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Fetch groups for filter dropdown
  const { data: groups = [] } = trpc.whatsapp.getAuthorizedGroups.useQuery();

  // Fetch message logs
  const { data: logsData, isLoading } = trpc.whatsappLogs.getMessageLogs.useQuery({
    limit: pageSize,
    offset: page * pageSize,
    groupChatId: filters.groupChatId || undefined,
    commandType: filters.commandType || undefined,
    status: filters.status !== 'all' ? (filters.status as any) : undefined,
    startDate: filters.startDate ? new Date(filters.startDate) : undefined,
    endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    searchQuery: filters.searchQuery || undefined,
  });

  const logs = logsData?.logs || [];
  const total = logsData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // Status badge colors
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3" />
            Success
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertCircle className="w-3 h-3" />
            Error
          </span>
        );
      case 'unauthorized':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <AlertCircle className="w-3 h-3" />
            Unauthorized
          </span>
        );
      default:
        return null;
    }
  };

  const handleExport = async () => {
    try {
      const exportData = await trpc.whatsappLogs.exportLogs.query({
        groupChatId: filters.groupChatId || undefined,
        commandType: filters.commandType || undefined,
        status: filters.status !== 'all' ? (filters.status as any) : undefined,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      });

      // Convert to CSV
      const headers = ['Timestamp', 'Group', 'Sender', 'Command', 'Status', 'Response', 'Error'];
      const rows = exportData.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.group,
        log.sender,
        log.command,
        log.status,
        log.response,
        log.error,
      ]);

      const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whatsapp-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <CRMLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="sm:hidden">
          <h1 className="text-2xl font-bold text-foreground">Message Logs</h1>
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by phone number..."
                  value={filters.searchQuery}
                  onChange={e => setFilters({ ...filters, searchQuery: e.target.value })}
                  className="pl-10"
                />
              </div>

              {/* Group Filter */}
              <Select value={filters.groupChatId} onValueChange={value => setFilters({ ...filters, groupChatId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Groups</SelectItem>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.groupChatId}>
                      {group.groupName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Command Filter */}
              <Select value={filters.commandType} onValueChange={value => setFilters({ ...filters, commandType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Commands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Commands</SelectItem>
                  <SelectItem value="project">/project</SelectItem>
                  <SelectItem value="status">/status</SelectItem>
                  <SelectItem value="team">/team</SelectItem>
                  <SelectItem value="deadline">/deadline</SelectItem>
                  <SelectItem value="checklist">/checklist</SelectItem>
                  <SelectItem value="notes">/notes</SelectItem>
                  <SelectItem value="help">/help</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={filters.status} onValueChange={value => setFilters({ ...filters, status: value as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="unauthorized">Unauthorized</SelectItem>
                </SelectContent>
              </Select>

              {/* Start Date */}
              <Input
                type="date"
                value={filters.startDate}
                onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                placeholder="Start Date"
              />

              {/* End Date */}
              <Input
                type="date"
                value={filters.endDate}
                onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                placeholder="End Date"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setFilters({
                    groupChatId: '',
                    commandType: '',
                    status: 'all',
                    startDate: '',
                    endDate: '',
                    searchQuery: '',
                  })
                }
              >
                Clear Filters
              </Button>
              <Button onClick={handleExport} className="gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Message Logs ({total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No logs found</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold">Timestamp</th>
                        <th className="text-left py-3 px-4 font-semibold">Sender</th>
                        <th className="text-left py-3 px-4 font-semibold">Command</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                        <th className="text-left py-3 px-4 font-semibold">Response</th>
                        <th className="text-left py-3 px-4 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id} className="border-b border-border hover:bg-secondary/30 transition">
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(log.createdAt)}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">{log.senderPhoneNumber}</td>
                          <td className="py-3 px-4 font-mono text-xs">
                            {log.commandType ? `/${log.commandType}` : 'N/A'}
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(log.status)}</td>
                          <td className="py-3 px-4 text-xs text-muted-foreground truncate max-w-xs">
                            {log.responseText?.substring(0, 50) || 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages || 1}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message Details Modal */}
      {selectedLog && (
        <MessageLogModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </CRMLayout>
  );
}
