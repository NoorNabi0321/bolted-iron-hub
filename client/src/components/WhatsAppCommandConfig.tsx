import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc';
import { Command } from 'lucide-react';

export function WhatsAppCommandConfig() {
  const { data: commandsData, isLoading, refetch } = trpc.whatsappAdmins.getAllCommands.useQuery();

  const updateCommandMutation = trpc.whatsappAdmins.updateCommandPermission.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleToggleCommand = (command: string, isEnabled: boolean) => {
    updateCommandMutation.mutate({
      command,
      isEnabled: !isEnabled,
    });
  };

  const commands = commandsData?.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Command className="h-5 w-5" />
          WhatsApp Bot Commands
        </CardTitle>
        <CardDescription>
          Manage available commands and their permission requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading commands...</p>
        ) : commands.length === 0 ? (
          <p className="text-sm text-gray-500">No commands configured</p>
        ) : (
          <div className="space-y-4">
            {commands.map((cmd) => (
              <div
                key={cmd.id}
                className="flex items-start justify-between rounded-lg border p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <code className="rounded bg-gray-100 px-2 py-1 font-mono text-sm font-semibold">
                      {cmd.command}
                    </code>
                    <Badge
                      variant={cmd.requiredRole === 'super_admin' ? 'default' : 'secondary'}
                    >
                      {cmd.requiredRole === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                    {!cmd.isEnabled && <Badge variant="outline">Disabled</Badge>}
                  </div>
                  {cmd.description && (
                    <p className="mt-2 text-sm text-gray-600">{cmd.description}</p>
                  )}
                </div>
                <Switch
                  checked={cmd.isEnabled}
                  onCheckedChange={() => handleToggleCommand(cmd.command, cmd.isEnabled)}
                  disabled={updateCommandMutation.isPending}
                />
              </div>
            ))}
          </div>
        )}

        {/* Command Reference */}
        <div className="mt-8 space-y-4 border-t pt-6">
          <h3 className="font-semibold">Command Reference</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="font-mono text-sm font-semibold text-blue-900">/help</p>
              <p className="text-xs text-blue-700">List all available commands</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="font-mono text-sm font-semibold text-blue-900">/status</p>
              <p className="text-xs text-blue-700">Get project status by name</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="font-mono text-sm font-semibold text-blue-900">/project</p>
              <p className="text-xs text-blue-700">Get full project details with PDF</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="font-mono text-sm font-semibold text-blue-900">/list</p>
              <p className="text-xs text-blue-700">List active projects</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="font-mono text-sm font-semibold text-blue-900">/weekly</p>
              <p className="text-xs text-blue-700">Get weekly schedule</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="font-mono text-sm font-semibold text-blue-900">/pending</p>
              <p className="text-xs text-blue-700">List pending approvals</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="font-mono text-sm font-semibold text-blue-900">/report</p>
              <p className="text-xs text-blue-700">Generate project report</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
