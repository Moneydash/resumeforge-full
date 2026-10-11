import { Plus } from 'lucide-react';
import type { ViewMode } from './types';

const SKELETON_COUNT = 6;

export function ResumeSkeleton({ viewMode }: { viewMode: ViewMode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading resumes</span>
      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center px-4 py-20 text-center">
      <h2 className="m-0 text-xl font-semibold tracking-[-0.02em]">No resumes yet</h2>
      <p className="l-muted m-0 mt-2 max-w-sm">Create your first resume, choose a template and start writing.</p>
      <button type="button" className="l-btn l-btn--primary mt-6" onClick={onCreate}>
        <Plus aria-hidden="true" className="size-4" />
        New resume
      </button>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-4 py-20 text-center">
      <h2 className="m-0 text-xl font-semibold tracking-[-0.02em]">We could not load your resumes</h2>
      <p className="l-muted m-0 mt-2 max-w-sm">Check your connection and try again.</p>
      <button type="button" className="l-btn l-btn--ghost mt-6" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
