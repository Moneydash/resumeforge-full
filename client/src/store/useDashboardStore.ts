import type { ResumeSummary } from '@/types';
import { create } from 'zustand';

interface DashboardState {
  resumes: ResumeSummary[];
  resumeName: string;
  resumeSlug: string;
  setResumes: (resumes: ResumeSummary[]) => void;
  setResumeName: (resumeName: string) => void;
  setResumeSlug: (resumeSlug: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  resumes: [],
  resumeName: "",
  resumeSlug: "",
  setResumes: (resumes) => set({ resumes }),
  setResumeName: (resumeName) => set({ resumeName }),
  setResumeSlug: (resumeSlug) => set({ resumeSlug }),
}));