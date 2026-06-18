/**
 * Live Console Component
 * Displays real-time server logs with filtering and search capabilities
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Search, Pause, Play, Download } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  data?: any;
}

export function LiveConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch logs
  const { data: initialLogs, refetch } = trpc.logs.getLogs.useQuery(
    { limit: 100 },
    { refetchInterval: 2000 } // Refresh every 2 seconds
  );

  // Update logs when data changes
  useEffect(() => {
    if (initialLogs && !isPaused) {
      setLogs(initialLogs);
    }
  }, [initialLogs, isPaused]);

  // Filter logs based on search and level
  useEffect(() => {
    let filtered = logs;

    if (selectedLevel) {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    if (searchKeyword) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [logs, searchKeyword, selectedLevel]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const handleClearLogs = async () => {
    await trpc.logs.clearLogs.mutate();
    setLogs([]);
    setFilteredLogs([]);
  };

  const handleDownloadLogs = () => {
    const logText = logs
      .map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(logText));
    element.setAttribute('download', `bot-logs-${new Date().toISOString()}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warn':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'secondary';
      case 'info':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Live Console</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {filteredLogs.length} / {logs.length} logs
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Level Filter */}
            <div className="flex gap-1">
              {(['log', 'info', 'warn', 'error'] as const).map(level => (
                <Button
                  key={level}
                  variant={selectedLevel === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLevel(selectedLevel === level ? null : level)}
                  className="capitalize"
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="gap-2"
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className={autoScroll ? 'bg-blue-50' : ''}
            >
              {autoScroll ? 'Auto-scroll: ON' : 'Auto-scroll: OFF'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadLogs}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearLogs}
              className="gap-2 ml-auto"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>

        {/* Console Output */}
        <div className="border rounded-lg bg-black overflow-hidden">
          <ScrollArea className="h-96" ref={scrollRef}>
            <div className="p-4 font-mono text-sm space-y-1">
              {filteredLogs.length === 0 ? (
                <div className="text-gray-500">
                  {logs.length === 0 ? 'No logs yet...' : 'No logs matching filters'}
                </div>
              ) : (
                filteredLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 text-xs ${
                      log.level === 'error'
                        ? 'text-red-400'
                        : log.level === 'warn'
                          ? 'text-yellow-400'
                          : log.level === 'info'
                            ? 'text-blue-400'
                            : 'text-green-400'
                    }`}
                  >
                    <span className="text-gray-600 flex-shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-gray-700 flex-shrink-0 w-8">
                      [{log.level.toUpperCase().padEnd(5)}]
                    </span>
                    <span className="flex-1 break-words">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="p-2 bg-gray-100 rounded">
            <div className="text-gray-600">Total</div>
            <div className="font-semibold">{logs.length}</div>
          </div>
          <div className="p-2 bg-red-100 rounded">
            <div className="text-red-600">Errors</div>
            <div className="font-semibold">{logs.filter(l => l.level === 'error').length}</div>
          </div>
          <div className="p-2 bg-yellow-100 rounded">
            <div className="text-yellow-600">Warnings</div>
            <div className="font-semibold">{logs.filter(l => l.level === 'warn').length}</div>
          </div>
          <div className="p-2 bg-blue-100 rounded">
            <div className="text-blue-600">Info</div>
            <div className="font-semibold">{logs.filter(l => l.level === 'info').length}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
