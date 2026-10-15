import type { ResumeSummary } from '@/types';

export type ViewMode = 'grid' | 'list';
export type DashboardStatus = 'loading' | 'ready' | 'error';

// The items shown are ResumeSummary-shaped; the cover letter page adapts its records to this shape.
export interface ResumeHandlers {
  onEdit: (resume: ResumeSummary) => void;
  onClone: (id: string) => void;
  onRename: (resume: ResumeSummary) => void;
  onDelete: (id: string) => void;
  onShare?: (resume: ResumeSummary) => void; // resumes only; the menu item is hidden when absent
}

// Every user-visible noun on the dashboard, so one set of components serves resumes and cover letters.
export interface DocLabels {
  title: string;
  singular: string;
  plural: string;
  newButton: string;
  emptyTitle: string;
  emptyBody: string;
  errorTitle: string;
  loadingLabel: string;
  tableCaption: string;
  formTitle: string;
  formDescription: string;
  nameLabel: string;
  slugLabel: string;
  namePlaceholder: string;
  slugPlaceholder: string;
  createSubmit: string;
  renameSubmit: string;
  deleteTitle: string;
  deleteDescription: string;
}
