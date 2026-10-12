import { Plus } from 'lucide-react';
import { RESUME_LABELS } from './labels';
import type { DocLabels, ViewMode } from './types';

const SKELETON_COUNT = 6;

export function ResumeSkeleton({ viewMode, labels = RESUME_LABELS }: { viewMode: ViewMode; labels?: DocLabels }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{labels.loadingLabel}</span>
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-4">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <div key={index} className="app-card">
              <div className="app-skeleton aspect-[4/3] animate-pulse rounded-none" />
              <div className="flex flex-col gap-3 p-4">
                <div className="app-skeleton h-4 w-2/3 animate-pulse" />
                <div className="app-skeleton h-3 w-1/2 animate-pulse" />
                <div className="app-skeleton h-11 w-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <div key={index} className="app-skeleton h-16 w-full animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}

export function EmptyState({ onCreate, labels = RESUME_LABELS }: { onCreate: () => void; labels?: DocLabels }) {
  return (
    <div className="flex flex-col items-center px-4 py-20 text-center">
      <h2 className="m-0 text-xl font-semibold tracking-[-0.02em]">{labels.emptyTitle}</h2>
      <p className="l-muted m-0 mt-2 max-w-sm">{labels.emptyBody}</p>
      <button type="button" className="l-btn l-btn--primary mt-6" onClick={onCreate}>
        <Plus aria-hidden="true" className="size-4" />
        {labels.newButton}
      </button>
    </div>
  );
}

export function ErrorState({ onRetry, labels = RESUME_LABELS }: { onRetry: () => void; labels?: DocLabels }) {
  return (
    <div role="alert" className="flex flex-col items-center px-4 py-20 text-center">
      <h2 className="m-0 text-xl font-semibold tracking-[-0.02em]">{labels.errorTitle}</h2>
      <p className="l-muted m-0 mt-2 max-w-sm">Check your connection and try again.</p>
      <button type="button" className="l-btn l-btn--ghost mt-6" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
