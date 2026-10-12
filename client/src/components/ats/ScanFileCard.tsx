import { FileText, X } from 'lucide-react';
import { formatFileSize } from './scan-progress';

interface ScanFileCardProps {
  file: File;
  onRemove?: () => void;
}

export default function ScanFileCard({ file, onRemove }: ScanFileCardProps) {
  return (
    <div className="app-card flex items-center justify-between gap-4 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="ats-filethumb" aria-hidden="true">
          <FileText className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="l-ink m-0 truncate font-semibold">{file.name}</p>
          <p className="l-muted m-0 text-sm">{formatFileSize(file.size)}</p>
        </div>
      </div>
      {onRemove && (
        <button type="button" className="app-iconbtn" aria-label="Remove file" onClick={onRemove}>
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}
