/**
 * WhatsApp Analytics Dashboard
 * Component for displaying WhatsApp bot usage statistics and analytics
 */

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';

interface Statistics {
  totalMessages: number;
  totalGroups: number;
  enabledGroups: number;
  disabledGroups: number;
  successCount: number;
  errorCount: number;
  unauthorizedCount: number;
  successRate: number;
  errorRate: number;
  commandCounts: Record<string, number>;
  mostUsedCommand: string | null;
  mostUsedCommandCount: number;
  groupCounts: Record<string, number>;
  mostActiveGroup: string | null;
  mostActiveGroupCount: number;
}

interface WhatsAppAnalyticsProps {
  statistics: Statistics | null;
  isLoading?: boolean;
}

export default function WhatsAppAnalytics({ statistics, isLoading = false }: WhatsAppAnalyticsProps) {
  const commandChartData = useMemo(() => {
    if (!statistics) return [];
    return Object.entries(statistics.commandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, value]) => ({
        name: name.replace('/', ''),
        value,
      }));
  }, [statistics]);

  const statusChartData = useMemo(() => {
    if (!statistics) return [];
    return [
      { name: 'Success', value: statistics.successCount, color: '#10b981' },
      { name: 'Error', value: statistics.errorCount, color: '#ef4444' },
      { name: 'Unauthorized', value: statistics.unauthorizedCount, color: '#f59e0b' },
    ].filter(item => item.value > 0);
  }, [statistics]);

  const groupChartData = useMemo(() => {
    if (!statistics) return [];
    return Object.entries(statistics.groupCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({
        name: name.substring(0, 20) + (name.length > 20 ? '...' : ''),
        value,
      }));
  }, [statistics]);

  if (isLoading || !statistics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Total Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.totalMessages}</div>
            <p className="text-xs text-muted-foreground mt-2">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{statistics.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-2">{statistics.successCount} successful</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{statistics.errorRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-2">{statistics.errorCount} errors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Active Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.enabledGroups}</div>
            <p className="text-xs text-muted-foreground mt-2">of {statistics.totalGroups} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Command Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Command Usage</CardTitle>
            <CardDescription>Top commands used</CardDescription>
          </CardHeader>
          <CardContent>
            {commandChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={commandChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No command data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Message Status</CardTitle>
            <CardDescription>Distribution of message statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No status data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Group Activity */}
      {groupChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Group Activity</CardTitle>
            <CardDescription>Messages per group</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={groupChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Most Used Command */}
      {statistics.mostUsedCommand && (
        <Card>
          <CardHeader>
            <CardTitle>Most Used Command</CardTitle>
            <CardDescription>Command with highest usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">/{statistics.mostUsedCommand}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Used {statistics.mostUsedCommandCount} times
                </p>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {((statistics.mostUsedCommandCount / statistics.totalMessages) * 100).toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
