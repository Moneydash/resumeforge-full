import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogEyebrow, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { popupDangerClasses, popupGhostClasses, popupPrimaryClasses } from '@/styles/popup-classes';

interface ConfirmDialogProps {
  open: boolean;
  eyebrow: string;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  eyebrow,
  title,
  description,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogEyebrow>{eyebrow}</DialogEyebrow>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className={popupGhostClasses} onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button className={danger ? popupDangerClasses : popupPrimaryClasses} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
