/**
 * WhatsApp Credentials Configuration
 * Component for managing WhatsApp API credentials and webhook configuration
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

interface WebhookStatus {
  isConfigured: boolean;
  webhookUrl: string;
  phoneNumberId: string;
  hasToken: boolean;
  hasVerifyToken: boolean;
}

export function WhatsAppCredentials() {
  const { toast } = useToast();
  const [showToken, setShowToken] = useState(false);
  const [showVerifyToken, setShowVerifyToken] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Fetch webhook status
  const { data: statusData, isLoading: statusLoading } = trpc.whatsapp.getWebhookStatus.useQuery();

  // Test webhook mutation
  const testWebhookMutation = trpc.whatsapp.testWebhook.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
      } else {
        toast({
          title: 'Test Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
      setIsTesting(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to test webhook',
        variant: 'destructive',
      });
      setIsTesting(false);
    },
  });

  useEffect(() => {
    if (statusData) {
      setWebhookStatus(statusData);
    }
  }, [statusData]);

  const handleCopyWebhookUrl = () => {
    if (webhookStatus?.webhookUrl) {
      navigator.clipboard.writeText(webhookStatus.webhookUrl);
      toast({
        title: 'Copied',
        description: 'Webhook URL copied to clipboard',
      });
    }
  };

  const handleTestWebhook = () => {
    setIsTesting(true);
    testWebhookMutation.mutate();
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading webhook configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Status</CardTitle>
          <CardDescription>WhatsApp API credentials and webhook setup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone Number ID */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Phone Number ID</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={webhookStatus?.phoneNumberId || 'Not configured'}
                  className="bg-muted"
                />
                {webhookStatus?.phoneNumberId !== 'Not configured' ? (
                  <Badge variant="default" className="bg-green-600 whitespace-nowrap">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="whitespace-nowrap">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Missing
                  </Badge>
                )}
              </div>
            </div>

            {/* API Token */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">API Token</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  type={showToken ? 'text' : 'password'}
                  value={webhookStatus?.hasToken ? '••••••••••••••••' : 'Not configured'}
                  className="bg-muted"
                />
                {webhookStatus?.hasToken ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Badge variant="default" className="bg-green-600 whitespace-nowrap">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  </>
                ) : (
                  <Badge variant="secondary" className="whitespace-nowrap">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Missing
                  </Badge>
                )}
              </div>
            </div>

            {/* Verify Token */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Webhook Verify Token</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  type={showVerifyToken ? 'text' : 'password'}
                  value={webhookStatus?.hasVerifyToken ? '••••••••••••••••' : 'Not configured'}
                  className="bg-muted"
                />
                {webhookStatus?.hasVerifyToken ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowVerifyToken(!showVerifyToken)}
                    >
                      {showVerifyToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Badge variant="default" className="bg-green-600 whitespace-nowrap">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  </>
                ) : (
                  <Badge variant="secondary" className="whitespace-nowrap">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Missing
                  </Badge>
                )}
              </div>
            </div>

            {/* Overall Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Overall Status</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={webhookStatus?.isConfigured ? 'Fully Configured' : 'Incomplete'}
                  className="bg-muted"
                />
                {webhookStatus?.isConfigured ? (
                  <Badge variant="default" className="bg-green-600 whitespace-nowrap">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ready
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="whitespace-nowrap">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Incomplete
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {!webhookStatus?.isConfigured && (
            <div className="border-t pt-4">
              <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Configuration Required</p>
                  <p className="mt-1">
                    Some credentials are missing. Contact your administrator to configure WhatsApp API credentials.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook URL</CardTitle>
          <CardDescription>Configure this URL in your WhatsApp Business Account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Webhook Endpoint</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={webhookStatus?.webhookUrl || 'https://your-domain.com/api/webhooks/whatsapp'}
                className="bg-muted font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyWebhookUrl}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This is the URL where WhatsApp will send incoming messages. Copy this URL and configure it in your WhatsApp Business Account settings.
            </p>
          </div>

          {/* Webhook Events */}
          <div className="border-t pt-4 space-y-2">
            <Label className="text-sm font-medium">Webhook Events</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">messages</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">message_status</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Subscribe to these webhook events in your WhatsApp Business Account
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Testing</CardTitle>
          <CardDescription>Test your webhook connectivity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the button below to test if your WhatsApp API credentials are valid and the webhook is accessible.
          </p>
          <Button
            onClick={handleTestWebhook}
            disabled={isTesting || !webhookStatus?.isConfigured}
            variant={webhookStatus?.isConfigured ? 'default' : 'secondary'}
          >
            {isTesting ? 'Testing...' : 'Test Webhook'}
          </Button>
          {!webhookStatus?.isConfigured && (
            <p className="text-xs text-muted-foreground">
              Complete the configuration above before testing the webhook
            </p>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>How to configure WhatsApp webhook</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="font-semibold text-primary flex-shrink-0">1.</span>
              <span>Go to your WhatsApp Business Account settings</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-primary flex-shrink-0">2.</span>
              <span>Navigate to Webhooks configuration</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-primary flex-shrink-0">3.</span>
              <span>Paste the Webhook URL above</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-primary flex-shrink-0">4.</span>
              <span>Enter the Webhook Verify Token</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-primary flex-shrink-0">5.</span>
              <span>Subscribe to the webhook events: messages and message_status</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-primary flex-shrink-0">6.</span>
              <span>Click "Test Webhook" to verify the connection</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
