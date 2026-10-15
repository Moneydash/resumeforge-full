import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogEyebrow, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { inputClasses } from '@/styles/form-classes';
import { popupGhostClasses } from '@/styles/popup-classes';

interface ShareResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeName: string;
  enabled: boolean;
  token: string | null;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
}

// Portaled outside .app-shell, so it uses hex utilities (shared form and popup class strings), not the --l-* tokens.
export default function ShareResumeDialog({ open, onOpenChange, resumeName, enabled, token, busy, onToggle }: ShareResumeDialogProps) {
  const link = token ? `${window.location.origin}/r/${token}` : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link. Select it and copy it manually.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogEyebrow>Public link</DialogEyebrow>
          <DialogTitle>Share {resumeName}</DialogTitle>
          <DialogDescription>
            {enabled
              ? 'Anyone with the link can view and download this resume, signed in or not.'
              : 'Sharing is off. The link is reserved for you, but anyone who opens it sees a 404 page.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <span id="share-switch-label" className="text-sm font-medium text-[#1a1a17] dark:text-[#f2f1ec]">
              {enabled ? 'Sharing is on' : 'Sharing is off'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-labelledby="share-switch-label"
              disabled={busy}
              onClick={() => onToggle(!enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                enabled ? 'bg-[#1a1a17] dark:bg-[#f2f1ec]' : 'bg-[#c9c8c2] dark:bg-[#3a3a36]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block size-5 rounded-full bg-white shadow transition-transform dark:bg-[#1a1a17] ${
                  enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          {enabled && token && (
            <div className="flex items-center gap-2">
              <Input readOnly aria-label="Public link" className={inputClasses} value={link} onFocus={(e) => e.currentTarget.select()} />
              <Button className={popupGhostClasses} onClick={copy}>
                <Copy className="size-4" aria-hidden="true" />
                Copy
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
