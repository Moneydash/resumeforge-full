import { Copy, MoreHorizontal, Pencil, Share2, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ResumeActionsMenuProps {
  name: string;
  onClone: () => void;
  onRename: () => void;
  onDelete: () => void;
  onShare?: () => void;
}

// modal={false}: Rename and Delete open a Dialog from a menu item; a modal menu would leave the page
// with `pointer-events: none` after the dialog closes.
export default function ResumeActionsMenu({ name, onClone, onRename, onShare, onDelete }: ResumeActionsMenuProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="app-iconbtn" aria-label={`More actions for ${name}`}>
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="px-2.5 pt-1.5 pb-1 font-mono text-[9.5px] font-normal uppercase tracking-[0.14em] text-[#5c5b56] dark:text-[#a3a29c]">Actions</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onClone}>
          <Copy aria-hidden="true" />
          Clone
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename}>
          <Pencil aria-hidden="true" />
          Rename
        </DropdownMenuItem>
        {onShare && (
          <DropdownMenuItem onSelect={onShare}>
            <Share2 aria-hidden="true" />
            Share
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
