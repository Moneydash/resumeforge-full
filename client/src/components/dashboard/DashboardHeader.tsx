import { Grid3X3, List, Plus } from 'lucide-react';
import type { ViewMode } from './types';

interface DashboardHeaderProps {
  count: number | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCreate: () => void;
}

export default function DashboardHeader({ count, viewMode, onViewModeChange, onCreate }: DashboardHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="app-title m-0">Resumes</h1>
        <p className="l-muted m-0 mt-1 text-sm">
          {count === null ? ' ' : `${count} ${count === 1 ? 'resume' : 'resumes'}`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="app-seg" role="group" aria-label="View mode">
          <button type="button" aria-label="Grid view" aria-pressed={viewMode === 'grid'} onClick={() => onViewModeChange('grid')}>
            <Grid3X3 aria-hidden="true" className="size-4" />
          </button>
          <button type="button" aria-label="List view" aria-pressed={viewMode === 'list'} onClick={() => onViewModeChange('list')}>
            <List aria-hidden="true" className="size-4" />
          </button>
        </div>
        <button type="button" className="l-btn l-btn--primary" onClick={onCreate}>
          <Plus aria-hidden="true" className="size-4" />
          New resume
        </button>
      </div>
    </div>
  );
}
