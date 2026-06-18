/**
 * WhatsApp QR Code Display Component
 * Displays QR code for bot authentication and connection status
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader, RefreshCw, QrCode } from 'lucide-react';

interface BotStatus {
  isConnected: boolean;
  isInitialized: boolean;
  isReady: boolean;
  timestamp: string;
}

export function WhatsAppQRCodeDisplay() {
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch bot status and QR code
  const fetchBotStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/bot/status');
      const data = await response.json();

      if (data.success) {
        setBotStatus(data.status);
        
        // Fetch QR code image if bot is not ready
        if (!data.status.isReady) {
          try {
            setQrImageUrl(`/api/bot/qr-image?t=${Date.now()}`);
          } catch (qrErr) {
            console.error('Error loading QR image:', qrErr);
            setQrImageUrl(null);
          }
        } else {
          setQrImageUrl(null);
        }
      } else {
        setError('Failed to fetch bot status');
      }
    } catch (err) {
      console.error('Error fetching bot status:', err);
      setError('Failed to connect to bot service');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh bot status every 5 seconds
  useEffect(() => {
    fetchBotStatus();

    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchBotStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = () => {
    if (!botStatus) return 'bg-gray-100 dark:bg-gray-900';
    if (botStatus.isReady) return 'bg-green-50 dark:bg-green-950/20';
    if (botStatus.isInitialized) return 'bg-blue-50 dark:bg-blue-950/20';
    return 'bg-yellow-50 dark:bg-yellow-950/20';
  };

  const getStatusBadge = () => {
    if (!botStatus) return { label: 'Unknown', variant: 'secondary' as const };
    if (botStatus.isReady) return { label: 'Connected', variant: 'default' as const };
    if (botStatus.isInitialized) return { label: 'Authenticated', variant: 'default' as const };
    return { label: 'Initializing', variant: 'secondary' as const };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="space-y-6">
      {/* Bot Status Card */}
      <Card className={`border-border ${getStatusColor()}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <QrCode className="w-5 h-5" />
              <div>
                <CardTitle>Bot Authentication Status</CardTitle>
                <CardDescription>Real-time WhatsApp bot connection status</CardDescription>
              </div>
            </div>
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && !botStatus ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-5 h-5 animate-spin text-blue-600 mr-2" />
              <p className="text-sm text-muted-foreground">Loading bot status...</p>
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  Make sure the bot service is running
                </p>
              </div>
            </div>
          ) : botStatus ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-background rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground font-medium">Initialized</p>
                  <div className="flex items-center gap-2 mt-2">
                    {botStatus.isInitialized ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    )}
                    <p className="text-sm font-medium text-foreground">
                      {botStatus.isInitialized ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-background rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground font-medium">Connected</p>
                  <div className="flex items-center gap-2 mt-2">
                    {botStatus.isConnected ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    )}
                    <p className="text-sm font-medium text-foreground">
                      {botStatus.isConnected ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-background rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground font-medium">Ready</p>
                  <div className="flex items-center gap-2 mt-2">
                    {botStatus.isReady ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    )}
                    <p className="text-sm font-medium text-foreground">
                      {botStatus.isReady ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>

              {!botStatus.isReady && (
                <div className="space-y-4">
                  {qrImageUrl && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-4">
                        📱 Scan QR Code to Authenticate
                      </p>
                      <div className="flex justify-center">
                        <img 
                          src={qrImageUrl} 
                          alt="WhatsApp Bot QR Code" 
                          className="w-64 h-64 border-2 border-blue-300 rounded-lg p-2 bg-white"
                          onError={() => setQrImageUrl(null)}
                        />
                      </div>
                      <p className="text-xs text-blue-800 dark:text-blue-300 mt-4 text-center">
                        <strong>Steps:</strong>
                        <br />
                        1. Open WhatsApp on your phone
                        <br />
                        2. Go to Settings → Linked Devices
                        <br />
                        3. Point your camera at the QR code above
                        <br />
                        4. Wait for authentication to complete
                      </p>
                    </div>
                  )}
                  {!qrImageUrl && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-2">
                        ⏳ Generating QR Code...
                      </p>
                      <p className="text-xs text-yellow-800 dark:text-yellow-300">
                        The QR code is being generated. Please wait a moment and it will appear here.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {botStatus.isReady && (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-900 dark:text-green-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Bot is Ready!
                  </p>
                  <p className="text-xs text-green-800 dark:text-green-300 mt-2">
                    The bot is connected and ready to receive messages. You can now test commands in WhatsApp groups.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Last updated: {new Date(botStatus.timestamp).toLocaleTimeString()}
                </p>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="w-3 h-3"
                    />
                    Auto-refresh
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchBotStatus}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* QR Code Instructions */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            How to Authenticate the Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white text-sm font-medium">
                  1
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Check Server Console</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Look for the ASCII QR code displayed in the server console. It will appear when the bot initializes.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white text-sm font-medium">
                  2
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Open WhatsApp on Your Phone</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Open WhatsApp and go to Settings → Linked Devices
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white text-sm font-medium">
                  3
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Scan the QR Code</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Point your phone camera at the QR code in the console and scan it
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white text-sm font-medium">
                  4
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Wait for Authentication</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The bot will authenticate and the status above will change to "Connected"
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-900 dark:text-amber-200">
              <strong>Note:</strong> The QR code expires after a few minutes. If you don't scan it in time, refresh the page to generate a new one.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
