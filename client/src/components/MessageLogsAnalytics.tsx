import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface MessageLogsAnalyticsProps {
  groupChatId?: string;
  startDate?: Date;
  endDate?: Date;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316'];

export default function MessageLogsAnalytics({
  groupChatId,
  startDate,
  endDate,
}: MessageLogsAnalyticsProps) {
  const { data: commandStats } = trpc.whatsappLogs.getCommandStatistics.useQuery({
    groupChatId,
    startDate,
    endDate,
  });

  const { data: errorStats } = trpc.whatsappLogs.getErrorStatistics.useQuery({
    groupChatId,
    startDate,
    endDate,
  });

  const commandChartData = useMemo(() => {
    if (!commandStats) return [];
    return commandStats.map(cmd => ({
      name: cmd.command,
      count: cmd.count,
      success: cmd.successCount,
    }));
  }, [commandStats]);

  const statusChartData = useMemo(() => {
    if (!errorStats) return [];
    return [
      { name: 'Success', value: errorStats.successCount, fill: '#10b981' },
      { name: 'Error', value: errorStats.errorCount, fill: '#ef4444' },
      { name: 'Unauthorized', value: errorStats.unauthorizedCount, fill: '#f59e0b' },
    ].filter(item => item.value > 0);
  }, [errorStats]);

  if (!commandStats || !errorStats) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Command Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Command Usage Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {commandChartData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No command data available
            </div>
          ) : (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commandChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Total Messages" />
                  <Bar dataKey="success" fill="#10b981" name="Successful" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Message Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusChartData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No status data available
            </div>
          ) : (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) =>
                      `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Command Success Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Command Success Rates</CardTitle>
        </CardHeader>
        <CardContent>
          {commandStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No command data available
            </div>
          ) : (
            <div className="space-y-4">
              {commandStats.map((cmd, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">/{cmd.command}</span>
                    <span className="text-sm font-semibold text-green-600">
                      {cmd.successRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${cmd.successRate}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {cmd.successCount} / {cmd.count} successful
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Commands</p>
              <p className="text-3xl font-bold">{commandStats.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Messages</p>
              <p className="text-3xl font-bold">{errorStats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Overall Success Rate</p>
              <p className="text-3xl font-bold text-green-600">
                {errorStats.successRate.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
