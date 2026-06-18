import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface ErrorTrackingDashboardProps {
  groupChatId?: string;
  startDate?: Date;
  endDate?: Date;
}

export default function ErrorTrackingDashboard({
  groupChatId,
  startDate,
  endDate,
}: ErrorTrackingDashboardProps) {
  const { data: stats } = trpc.whatsappLogs.getErrorStatistics.useQuery({
    groupChatId,
    startDate,
    endDate,
  });

  const errorTypes = useMemo(() => {
    if (!stats?.errorsByType) return [];
    return Object.entries(stats.errorsByType)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count);
  }, [stats?.errorsByType]);

  if (!stats) {
    return <div>Loading error statistics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Messages */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Messages</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-700 font-semibold">Success Rate</p>
              </div>
              <p className="text-3xl font-bold text-green-700">
                {stats.successRate.toFixed(1)}%
              </p>
              <p className="text-xs text-green-600">{stats.successCount} successful</p>
            </div>
          </CardContent>
        </Card>

        {/* Error Rate */}
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-700 font-semibold">Error Rate</p>
              </div>
              <p className="text-3xl font-bold text-red-700">
                {stats.errorRate.toFixed(1)}%
              </p>
              <p className="text-xs text-red-600">{stats.errorCount} errors</p>
            </div>
          </CardContent>
        </Card>

        {/* Unauthorized Rate */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-700 font-semibold">Unauthorized</p>
              </div>
              <p className="text-3xl font-bold text-yellow-700">
                {stats.unauthorizedRate.toFixed(1)}%
              </p>
              <p className="text-xs text-yellow-600">{stats.unauthorizedCount} blocked</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            Error Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errorTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No errors recorded
            </div>
          ) : (
            <div className="space-y-3">
              {errorTypes.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{item.error}</p>
                    <span className="text-sm font-semibold text-red-600">
                      {item.count} error{item.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(item.count / (errorTypes[0]?.count || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Message Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Success */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-600" />
                  <span className="text-sm font-medium">Success</span>
                </div>
                <span className="text-sm font-semibold">{stats.successCount}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${stats.total > 0 ? (stats.successCount / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Error */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-600" />
                  <span className="text-sm font-medium">Error</span>
                </div>
                <span className="text-sm font-semibold">{stats.errorCount}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{
                    width: `${stats.total > 0 ? (stats.errorCount / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Unauthorized */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-600" />
                  <span className="text-sm font-medium">Unauthorized</span>
                </div>
                <span className="text-sm font-semibold">{stats.unauthorizedCount}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full"
                  style={{
                    width: `${stats.total > 0 ? (stats.unauthorizedCount / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
