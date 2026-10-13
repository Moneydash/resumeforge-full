import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogEyebrow, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { popupDangerClasses, popupGhostClasses } from '@/styles/popup-classes';
import { RESUME_LABELS } from './labels';
import type { DocLabels } from './types';

interface DeleteResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  labels?: DocLabels;
}

export default function DeleteResumeDialog({ open, onOpenChange, onCancel, onConfirm, labels = RESUME_LABELS }: DeleteResumeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogEyebrow className="text-[#b3261e] dark:text-[#ff8a80]">Permanent action</DialogEyebrow>
          <DialogTitle>{labels.deleteTitle}</DialogTitle>
          <DialogDescription>{labels.deleteDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className={popupGhostClasses} onClick={onCancel}>
            Cancel
          </Button>
          <Button className={popupDangerClasses} onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
