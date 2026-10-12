import type { ChangeEvent } from 'react';
import { Edit, FilePlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RESUME_LABELS } from './labels';
import type { DocLabels } from './types';

interface ResumeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEdit: boolean;
  name: string;
  slug: string;
  onNameChange: (value: string) => void;
  onSlugChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  labels?: DocLabels;
}

// Portaled outside .app-shell, so it uses the global shadcn tokens (bg-foreground / text-background) for the ink button.
// Title and description keep today's wording in both modes (the spec says dialog wording is unchanged).
export default function ResumeFormDialog({ open, onOpenChange, isEdit, name, slug, onNameChange, onSlugChange, onSubmit, labels = RESUME_LABELS }: ResumeFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.formTitle}</DialogTitle>
          <DialogDescription>{labels.formDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-name">{labels.nameLabel}</Label>
            <Input id="doc-name" placeholder={labels.namePlaceholder} value={name} onChange={(event) => onNameChange(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-slug">{labels.slugLabel}</Label>
            <Input id="doc-slug" placeholder={labels.slugPlaceholder} value={slug} onChange={onSlugChange} />
            <small className="text-muted-foreground text-xs">This will be the file name saved on your computer.</small>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} className="bg-foreground text-background hover:bg-foreground/90 flex items-center gap-2">
            {isEdit ? labels.renameSubmit : labels.createSubmit}
            {isEdit ? <Edit className="size-4" /> : <FilePlus2 className="size-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
