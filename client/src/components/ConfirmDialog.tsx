import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  /** Optional preview of the thing being deleted (e.g. item text). */
  itemLabel?: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

/**
 * Reusable destructive-action confirmation. Defaults to delete wording.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Delete",
  description = "Are you sure you want to delete this? This action cannot be undone.",
  itemLabel,
  confirmLabel = "Delete",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {itemLabel && (
          <div className="bg-gray-50 p-3 rounded-lg my-2">
            <p className="text-sm text-gray-700 break-words">{itemLabel}</p>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
