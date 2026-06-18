/**
 * WhatsApp Bot Health Monitor Component
 * Displays real-time bot connection status and health metrics
 */

import React, { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, CheckCircle, Wifi, WifiOff, Activity } from 'lucide-react';

interface BotStatus {
  isConnected: boolean;
  isInitialized: boolean;
  hasClient: boolean;
  timestamp: number;
}

interface HealthCheck {
  botConnected: boolean;
  botInitialized: boolean;
  hasClient: boolean;
  totalMessages: number;
  successRate: number;
  errorCount: number;
  unauthorizedCount: number;
  timestamp: number;
  health: 'healthy' | 'degraded' | 'unhealthy';
}

interface ActivityData {
  timestamp: string;
  successRate: number;
}

export function WhatsAppBotHealthMonitor() {
  const [activityHistory, setActivityHistory] = useState<ActivityData[]>([]);

  // Fetch bot status
  const { data: botStatus } = trpc.whatsappBot.getBotStatus.useQuery(
    undefined,
    { refetchInterval: 3000 } // Refresh every 3 seconds
  );

  // Fetch health check
  const { data: healthCheck } = trpc.whatsappBot.getHealthCheck.useQuery(
    undefined,
    { refetchInterval: 5000 } // Refresh every 5 seconds
  );

  // Fetch activity summary
  const { data: activitySummary } = trpc.whatsappBot.getActivitySummary.useQuery(
    { hours: 1 },
    { refetchInterval: 10000 } // Refresh every 10 seconds
  );

  const status = botStatus as BotStatus | undefined;
  const health = healthCheck as HealthCheck | undefined;

  // Update activity history
  useEffect(() => {
    if (health) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      setActivityHistory((prev) => {
        const updated = [
          ...prev,
          {
            timestamp: timeStr,
            successRate: health.successRate,
          },
        ];
        // Keep last 20 data points
        return updated.slice(-20);
      });
    }
  }, [health?.timestamp]);

  const getHealthBadgeColor = (healthStatus: string) => {
    switch (healthStatus) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthIcon = (healthStatus: string) => {
    switch (healthStatus) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Health Status Alert */}
      {health && health.health !== 'healthy' && (
        <Alert className={health.health === 'unhealthy' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
          <AlertCircle className={health.health === 'unhealthy' ? 'text-red-600' : 'text-yellow-600'} />
          <AlertDescription className={health.health === 'unhealthy' ? 'text-red-800' : 'text-yellow-800'}>
            {health.health === 'unhealthy'
              ? 'Bot is not connected. Please check the connection and try reconnecting.'
              : 'Bot health is degraded. Success rate is below 80%. Please monitor closely.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Connection Status</CardTitle>
            <CardDescription>Real-time bot connection state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {status?.isConnected ? (
                    <Wifi className="h-5 w-5 text-green-600" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-red-600" />
                  )}
                  <span className="text-sm font-medium">Bot Connected</span>
                </div>
                <Badge className={status?.isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {status?.isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Bot Initialized</span>
                </div>
                <Badge className={status?.isInitialized ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                  {status?.isInitialized ? 'Yes' : 'No'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium">Client Ready</span>
                </div>
                <Badge className={status?.hasClient ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}>
                  {status?.hasClient ? 'Ready' : 'Not Ready'}
                </Badge>
              </div>
            </div>

            <div className="text-xs text-gray-500 pt-2 border-t">
              Last updated: {status ? new Date(status.timestamp).toLocaleTimeString() : 'N/A'}
            </div>
          </CardContent>
        </Card>

        {/* Overall Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Overall Health</CardTitle>
            <CardDescription>Bot system health assessment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2">
              <div className="flex items-center gap-3">
                {getHealthIcon(health?.health || 'unhealthy')}
                <div>
                  <p className="text-sm font-medium">Health Status</p>
                  <p className="text-xs text-gray-600">System overall status</p>
                </div>
              </div>
              <Badge className={`${getHealthBadgeColor(health?.health || 'unhealthy')} text-sm`}>
                {health?.health?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600">Success Rate</p>
                <p className="text-xl font-bold text-blue-600">
                  {health ? `${health.successRate.toFixed(1)}%` : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600">Total Messages</p>
                <p className="text-xl font-bold text-green-600">{health?.totalMessages || 0}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-gray-600">Errors</p>
                <p className="text-xl font-bold text-red-600">{health?.errorCount || 0}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-gray-600">Unauthorized</p>
                <p className="text-xl font-bold text-yellow-600">{health?.unauthorizedCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate Trend */}
      {activityHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Success Rate Trend</CardTitle>
            <CardDescription>Last hour success rate over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(value) => `${(value as number).toFixed(1)}%`}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="successRate"
                  stroke="#10b981"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Hourly Statistics */}
      {activitySummary && (activitySummary as any).hourlyStats && (
        <Card>
          <CardHeader>
            <CardTitle>Hourly Activity</CardTitle>
            <CardDescription>Message processing by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(activitySummary as any).hourlyStats.map((stat: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono">{stat.hour}</span>
                    <div className="flex gap-2">
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        ✅ {stat.success}
                      </Badge>
                      <Badge className="bg-red-100 text-red-800 text-xs">
                        ❌ {stat.error}
                      </Badge>
                      <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                        ⚠️ {stat.unauthorized}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-sm font-bold">
                    {stat.success + stat.error + stat.unauthorized} total
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Bot configuration and details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-gray-600">Bot Framework</p>
              <p className="text-sm font-medium">whatsapp-web.js</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-gray-600">Connection Type</p>
              <p className="text-sm font-medium">Web Client</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-gray-600">Authentication</p>
              <p className="text-sm font-medium">QR Code Scan</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-gray-600">Last Check</p>
              <p className="text-sm font-medium">
                {health ? new Date(health.timestamp).toLocaleTimeString() : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
