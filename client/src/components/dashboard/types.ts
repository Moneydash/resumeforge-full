import type { ResumeSummary } from '@/types';

export type ViewMode = 'grid' | 'list';
export type DashboardStatus = 'loading' | 'ready' | 'error';

export interface ResumeHandlers {
  onEdit: (resume: ResumeSummary) => void;
  onClone: (id: string) => void;
  onRename: (resume: ResumeSummary) => void;
  onDelete: (id: string) => void;
}
