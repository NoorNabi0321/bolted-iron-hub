import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  MessageSquare,
  Phone,
  X,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';

interface MessageLogModalProps {
  log: any;
  onClose: () => void;
}

export default function MessageLogModal({ log, onClose }: MessageLogModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'unauthorized':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'unauthorized':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(log.status)}
            Message Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Card */}
          <Card className={`border-2 ${getStatusColor(log.status)}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <p className="text-lg font-semibold capitalize">{log.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Timestamp</p>
                  <p className="text-sm font-mono">{formatDate(log.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sender Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    Sender Phone Number
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-mono bg-secondary p-2 rounded flex-1 break-all">
                      {log.senderPhoneNumber}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(log.senderPhoneNumber, 'sender')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  {copied === 'sender' && (
                    <p className="text-xs text-green-600 mt-1">Copied!</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Command Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Command Type</p>
                  <p className="text-sm font-mono bg-secondary p-2 rounded">
                    {log.commandType ? `/${log.commandType}` : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Original Message */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  Original Message
                </p>
                <div className="bg-secondary p-3 rounded text-sm break-words max-h-32 overflow-y-auto">
                  {log.messageText || 'N/A'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bot Response */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  Bot Response
                </p>
                <div className="bg-secondary p-3 rounded text-sm break-words max-h-48 overflow-y-auto">
                  {log.responseText || 'No response'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Message (if any) */}
          {log.errorMessage && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-red-700 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Error Details
                  </p>
                  <div className="bg-white p-3 rounded text-sm text-red-700 break-words max-h-32 overflow-y-auto">
                    {log.errorMessage}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Message ID</p>
                  <p className="font-mono text-xs break-all">{log.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Group Chat ID</p>
                  <p className="font-mono text-xs break-all">{log.groupChatId}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Close Button */}
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
