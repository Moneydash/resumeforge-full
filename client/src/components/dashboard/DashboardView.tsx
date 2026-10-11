import { Plus } from 'lucide-react';
import type { ResumeSummary } from '@/types';
import DashboardHeader from './DashboardHeader';
import ResumeCard from './ResumeCard';
import ResumeTable from './ResumeTable';
import { EmptyState, ErrorState, ResumeSkeleton } from './DashboardStates';
import type { DashboardStatus, ResumeHandlers, ViewMode } from './types';

export interface DashboardViewProps extends ResumeHandlers {
  resumes: ResumeSummary[];
  status: DashboardStatus;
  viewMode: ViewMode;
  pendingEditId: string | null;
  onViewModeChange: (mode: ViewMode) => void;
  onCreate: () => void;
  onRetry: () => void;
}

export default function DashboardView({
  resumes,
  status,
  viewMode,
  pendingEditId,
  onViewModeChange,
  onCreate,
  onRetry,
  onEdit,
  onClone,
  onRename,
  onDelete,
}: DashboardViewProps) {
  const handlers = { onEdit, onClone, onRename, onDelete };

  return (
    <div className="w-full px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
      <DashboardHeader
        count={status === 'ready' ? resumes.length : null}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onCreate={onCreate}
      />

      {status === 'loading' && <ResumeSkeleton viewMode={viewMode} />}
      {status === 'error' && <ErrorState onRetry={onRetry} />}
      {status === 'ready' && resumes.length === 0 && <EmptyState onCreate={onCreate} />}

      {status === 'ready' && resumes.length > 0 && viewMode === 'grid' && (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-4 p-0">
          {resumes.map((resume) => (
            <li key={resume.id}>
              <ResumeCard resume={resume} pending={pendingEditId === resume.id} {...handlers} />
            </li>
          ))}
          <li>
            <button type="button" className="app-newtile" onClick={onCreate}>
              <Plus aria-hidden="true" className="size-5" />
              New resume
            </button>
          </li>
        </ul>
      )}

      {status === 'ready' && resumes.length > 0 && viewMode === 'list' && (
        <ResumeTable resumes={resumes} pendingEditId={pendingEditId} {...handlers} />
      )}
    </div>
  );
}
