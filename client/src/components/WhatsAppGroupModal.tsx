/**
 * WhatsApp Group Modal
 * Component for adding or editing authorized WhatsApp groups
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface Group {
  id: string;
  groupChatId: string;
  groupName: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date | null;
  notes: string | null;
}

interface WhatsAppGroupModalProps {
  group?: Group | null;
  onClose: () => void;
}

interface FormData {
  groupChatId: string;
  groupName: string;
  notes: string;
}

interface FormErrors {
  groupChatId?: string;
  groupName?: string;
}

export default function WhatsAppGroupModal({ group, onClose }: WhatsAppGroupModalProps) {
  const [formData, setFormData] = useState<FormData>({
    groupChatId: group?.groupChatId || '',
    groupName: group?.groupName || '',
    notes: group?.notes || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createGroupMutation = trpc.whatsapp.addAuthorizedGroup.useMutation();
  const updateGroupMutation = trpc.whatsapp.updateGroup.useMutation();

  // Reset form when group changes
  useEffect(() => {
    if (group) {
      setFormData({
        groupChatId: group.groupChatId,
        groupName: group.groupName,
        notes: group.notes || '',
      });
    } else {
      setFormData({
        groupChatId: '',
        groupName: '',
        notes: '',
      });
    }
    setErrors({});
  }, [group]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate Group Chat ID (only for new groups)
    if (!group) {
      if (!formData.groupChatId.trim()) {
        newErrors.groupChatId = 'Group Chat ID is required';
      } else if (!/^[0-9-]+@g\.us$/.test(formData.groupChatId)) {
        newErrors.groupChatId = 'Invalid WhatsApp Group Chat ID format (should be like 120363123456789-1234567890@g.us)';
      }
    }

    // Validate Group Name
    if (!formData.groupName.trim()) {
      newErrors.groupName = 'Group Name is required';
    } else if (formData.groupName.trim().length < 2) {
      newErrors.groupName = 'Group Name must be at least 2 characters';
    } else if (formData.groupName.trim().length > 100) {
      newErrors.groupName = 'Group Name must be less than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (group) {
        // Update existing group
        await updateGroupMutation.mutateAsync({
          groupId: group.id,
          groupName: formData.groupName.trim(),
          notes: formData.notes.trim() || null,
        });
      } else {
        // Create new group
        await createGroupMutation.mutateAsync({
          groupChatId: formData.groupChatId.trim(),
          groupName: formData.groupName.trim(),
          notes: formData.notes.trim() || null,
        });
      }

      // Close modal on success
      onClose();
    } catch (error) {
      console.error('Failed to save group:', error);
      // Error will be displayed via toast notification from the mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {group ? 'Edit Group' : 'Add New Group'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {group
              ? 'Update the group details below'
              : 'Add a new WhatsApp group to authorize the bot'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Group Chat ID Field */}
          {!group && (
            <div className="space-y-2">
              <Label htmlFor="groupChatId" className="text-foreground">
                Group Chat ID
              </Label>
              <Input
                id="groupChatId"
                name="groupChatId"
                placeholder="120363123456789-1234567890@g.us"
                value={formData.groupChatId}
                onChange={handleInputChange}
                className="text-foreground placeholder:text-muted-foreground"
              />
              {errors.groupChatId && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {errors.groupChatId}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                The unique identifier for the WhatsApp group (cannot be changed after creation)
              </p>
            </div>
          )}

          {/* Display Group Chat ID for edit mode */}
          {group && (
            <div className="space-y-2">
              <Label className="text-foreground">Group Chat ID</Label>
              <Input
                readOnly
                value={formData.groupChatId}
                className="bg-muted text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                This is the unique identifier for this WhatsApp group
              </p>
            </div>
          )}

          {/* Group Name Field */}
          <div className="space-y-2">
            <Label htmlFor="groupName" className="text-foreground">
              Group Name
            </Label>
            <Input
              id="groupName"
              name="groupName"
              placeholder="e.g., Project Team, Development"
              value={formData.groupName}
              onChange={handleInputChange}
              className="text-foreground placeholder:text-muted-foreground"
            />
            {errors.groupName && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                {errors.groupName}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.groupName.length}/100 characters
            </p>
          </div>

          {/* Notes Field */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Add any notes about this group..."
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="text-foreground placeholder:text-muted-foreground resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {formData.notes.length}/500 characters
            </p>
          </div>

          {/* Metadata for edit mode */}
          {group && (
            <div className="border-t border-border pt-4 space-y-2 text-sm text-muted-foreground">
              <p>Created: {formatDate(group.createdAt)}</p>
              <p>Last updated: {formatDate(group.updatedAt)}</p>
              <p>Last activity: {formatDate(group.lastActivityAt)}</p>
            </div>
          )}
        </form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-foreground"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : group ? 'Update Group' : 'Add Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
