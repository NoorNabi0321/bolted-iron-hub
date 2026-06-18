/**
 * WhatsApp Bot Message Logs Component
 * Displays real-time message logs with filtering and pagination
 */

import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, RefreshCw, Download } from 'lucide-react';

interface MessageLog {
  id: number;
  groupChatId: string;
  senderPhone: string;
  messageText: string;
  status: 'success' | 'error' | 'unauthorized';
  commandType: string | null;
  responseText: string;
  errorMessage: string | null;
  createdAt: number;
}

interface MessageLogsResponse {
  logs: MessageLog[];
  total: number;
  limit: number;
  offset: number;
}

export function WhatsAppBotMessageLogs() {
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<'success' | 'error' | 'unauthorized' | undefined>();
  const [commandType, setCommandType] = useState<string>('');
  const [groupChatId, setGroupChatId] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch message logs
  const { data: logsData, isLoading, refetch } = trpc.whatsappBot.getMessageLogs.useQuery(
    {
      limit,
      offset,
      status,
      commandType: commandType || undefined,
      groupChatId: groupChatId || undefined,
      senderPhone: senderPhone || undefined,
    },
    { refetchInterval: 5000 } // Auto-refresh every 5 seconds
  );

  const logs = (logsData as MessageLogsResponse)?.logs || [];
  const total = (logsData as MessageLogsResponse)?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handlePreviousPage = () => {
    if (offset >= limit) {
      setOffset(offset - limit);
    }
  };

  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  const handleClearFilters = () => {
    setStatus(undefined);
    setCommandType('');
    setGroupChatId('');
    setSenderPhone('');
    setOffset(0);
  };

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'Sender', 'Command', 'Status', 'Group', 'Message'],
      ...logs.map(log => [
        new Date(log.createdAt).toISOString(),
        log.senderPhone,
        log.commandType || 'N/A',
        log.status,
        log.groupChatId,
        log.messageText.substring(0, 50),
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'unauthorized':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'unauthorized':
        return '⚠️';
      default:
        return '❓';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Message Logs</CardTitle>
            <CardDescription>
              Real-time WhatsApp bot message activity ({total} total messages)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <Select value={status || ''} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="unauthorized">Unauthorized</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Command type"
            value={commandType}
            onChange={(e) => {
              setCommandType(e.target.value);
              setOffset(0);
            }}
            className="text-sm"
          />

          <Input
            placeholder="Sender phone"
            value={senderPhone}
            onChange={(e) => {
              setSenderPhone(e.target.value);
              setOffset(0);
            }}
            className="text-sm"
          />

          <Input
            placeholder="Group ID"
            value={groupChatId}
            onChange={(e) => {
              setGroupChatId(e.target.value);
              setOffset(0);
            }}
            className="text-sm"
          />

          <Button variant="outline" size="sm" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-32">Timestamp</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-20">Command</TableHead>
                <TableHead className="w-32">Sender</TableHead>
                <TableHead className="w-48">Message</TableHead>
                <TableHead className="w-48">Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-gray-50">
                    <TableCell className="text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusBadgeColor(log.status)} text-xs`}>
                        {getStatusIcon(log.status)} {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {log.commandType ? `/${log.commandType}` : '-'}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {log.senderPhone.substring(0, 15)}...
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-xs">
                      {log.messageText.substring(0, 40)}...
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-xs">
                      {log.status === 'error' && log.errorMessage ? (
                        <span className="text-red-600">{log.errorMessage.substring(0, 40)}...</span>
                      ) : (
                        log.responseText.substring(0, 40) + '...'
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} logs
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={offset === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-3 text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={offset + limit >= total}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
