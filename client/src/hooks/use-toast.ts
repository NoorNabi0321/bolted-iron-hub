import { useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

// Simple toast implementation using browser's native notifications
// For production, consider using a library like sonner or react-hot-toast
export function useToast() {
  const toast = useCallback(
    (props: Omit<Toast, 'id'>) => {
      const { title, description, variant = 'default', duration = 3000 } = props;

      // Create a simple toast notification
      const message = title ? `${title}${description ? ': ' + description : ''}` : description;

      if (message) {
        // Log to console for now
        if (variant === 'destructive') {
          console.error(message);
        } else {
          console.log(message);
        }

        // Try to use browser notification if available
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title || 'Notification', {
            body: description,
            tag: 'bih',
          });
        }
      }
    },
    []
  );

  return { toast };
}
