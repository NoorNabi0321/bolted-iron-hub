/**
 * WhatsApp Bot Dashboard Page
 * Comprehensive dashboard for managing WhatsApp bot operations
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WhatsAppBotHealthMonitor } from '@/components/WhatsAppBotHealthMonitor';

import { WhatsAppBotStatistics } from '@/components/WhatsAppBotStatistics';

import { LiveConsole } from '@/components/LiveConsole';
import { MessageCircle, BarChart3, Activity, Terminal, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

export function WhatsAppBotDashboard() {
  const [activeTab, setActiveTab] = useState('health');
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setLocation('/whatsapp-settings')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              title="Back to WhatsApp Settings"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <MessageCircle className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp Bot Dashboard</h1>
          </div>
          <p className="text-gray-600">
            Monitor and manage your WhatsApp bot operations
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-8">
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Health</span>
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Statistics</span>
            </TabsTrigger>
            <TabsTrigger value="console" className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              <span className="hidden sm:inline">Console</span>
            </TabsTrigger>
          </TabsList>

          {/* Health Tab */}
          <TabsContent value="health" className="space-y-6">
            <WhatsAppBotHealthMonitor />
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            <WhatsAppBotStatistics />
          </TabsContent>

          {/* Console Tab */}
          <TabsContent value="console" className="space-y-6">
            <LiveConsole />
          </TabsContent>


        </Tabs>
      </div>
    </div>
  );
}
