/**
 * WhatsApp Bot Statistics Component
 * Displays command usage statistics and message metrics
 */

import React, { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MessageStats {
  totalMessages: number;
  successCount: number;
  errorCount: number;
  unauthorizedCount: number;
  successRate: number;
  uniqueGroups: number;
  uniqueSenders: number;
}

interface CommandStats {
  [key: string]: number;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

export function WhatsAppBotStatistics() {
  // Fetch message statistics
  const { data: messageStats, isLoading: isLoadingStats } = trpc.whatsappBot.getMessageStatistics.useQuery(
    undefined,
    { refetchInterval: 10000 } // Refresh every 10 seconds
  );

  // Fetch command statistics
  const { data: commandStats, isLoading: isLoadingCommands } = trpc.whatsappBot.getCommandStatistics.useQuery(
    undefined,
    { refetchInterval: 10000 }
  );

  const stats = messageStats as MessageStats | undefined;
  const commands = commandStats as CommandStats | undefined;

  // Prepare chart data
  const messageChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Success', value: stats.successCount, fill: '#10b981' },
      { name: 'Error', value: stats.errorCount, fill: '#ef4444' },
      { name: 'Unauthorized', value: stats.unauthorizedCount, fill: '#f59e0b' },
    ].filter(item => item.value > 0);
  }, [stats]);

  const commandChartData = useMemo(() => {
    if (!commands) return [];
    return Object.entries(commands)
      .map(([name, value]) => ({
        name: `/${name}`,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [commands]);

  const isLoading = isLoadingStats || isLoadingCommands;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalMessages || 0}</div>
            <p className="text-xs text-gray-500 mt-1">All message events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats ? `${stats.successRate.toFixed(1)}%` : '0%'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.successCount || 0} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Unique Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.uniqueGroups || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Active groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.uniqueSenders || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Authorized admins</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Message Status Distribution</CardTitle>
            <CardDescription>Breakdown of message processing results</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center text-gray-500">
                Loading...
              </div>
            ) : messageChartData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-500">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={messageChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {messageChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Command Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Command Usage</CardTitle>
            <CardDescription>Most used commands</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center text-gray-500">
                Loading...
              </div>
            ) : commandChartData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-500">
                No command data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={commandChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Error Summary</CardTitle>
          <CardDescription>Message processing errors and issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Processing Errors</p>
                  <p className="text-2xl font-bold text-red-600">{stats?.errorCount || 0}</p>
                </div>
                <Badge className="bg-red-100 text-red-800">❌</Badge>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unauthorized Attempts</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats?.unauthorizedCount || 0}</p>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">⚠️</Badge>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Success Messages</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.successCount || 0}</p>
                </div>
                <Badge className="bg-green-100 text-green-800">✅</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Command Details Table */}
      {commandChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Command Details</CardTitle>
            <CardDescription>Detailed breakdown of command usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {commandChartData.map((cmd, index) => (
                <div key={cmd.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-mono text-sm font-medium">{cmd.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold">{cmd.value}</span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${(cmd.value / (commandChartData[0]?.value || 1)) * 100}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
