import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogEyebrow, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { popupGhostClasses, popupPrimaryClasses } from '@/styles/popup-classes';

interface DraftRecoveryDialogProps {
  open: boolean;
  noun: 'resume' | 'cover letter';
  onKeepLocal: () => void;
  onUseSaved: () => void;
}

/** Shown when a document opens and this device holds edits that were never saved (kept during maintenance). */
export default function DraftRecoveryDialog({ open, noun, onKeepLocal, onUseSaved }: DraftRecoveryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => { /* a choice is required */ }}>
      <DialogContent onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogEyebrow>Unsaved changes</DialogEyebrow>
          <DialogTitle>Keep the edits from this device?</DialogTitle>
          <DialogDescription>
            We found edits to this {noun} that were never saved, most likely because maintenance started while you were
            working. Keep them, or go back to the version saved on our servers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className={popupGhostClasses} onClick={onUseSaved}>
            Use saved version
          </Button>
          <Button className={popupPrimaryClasses} onClick={onKeepLocal}>
            Keep my edits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
