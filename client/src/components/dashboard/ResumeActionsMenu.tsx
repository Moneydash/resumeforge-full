import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ResumeActionsMenuProps {
  name: string;
  onClone: () => void;
  onRename: () => void;
  onDelete: () => void;
}

// modal={false}: Rename and Delete open a Dialog from a menu item; a modal menu would leave the page
// with `pointer-events: none` after the dialog closes.
export default function ResumeActionsMenu({ name, onClone, onRename, onDelete }: ResumeActionsMenuProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="app-iconbtn" aria-label={`More actions for ${name}`}>
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onClone}>
          <Copy aria-hidden="true" />
          Clone
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename}>
          <Pencil aria-hidden="true" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
