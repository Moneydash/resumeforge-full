import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import client from '@/api/axiosInstance';
import AppShell from '@/components/app-shell/AppShell';
import DashboardView from '@/components/dashboard/DashboardView';
import ResumeFormDialog from '@/components/dashboard/ResumeFormDialog';
import DeleteResumeDialog from '@/components/dashboard/DeleteResumeDialog';
import type { DashboardStatus, ViewMode } from '@/components/dashboard/types';
import { usePendingNavigation } from '@/hooks/usePendingNavigation';
import type { ResumeSummary } from '@/types';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useMainStore } from '@/store/useMainStore';
import { getCsrfToken, slugify } from '@/utils/helper';

const STORAGE_KEY = 'resumes';

const Dashboard: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);
  const [status, setStatus] = useState<DashboardStatus>('loading');
  const { pendingKey, go } = usePendingNavigation();

  // resumes - zustand state
  const resumes = useDashboardStore((state) => state.resumes);
  const resumeName = useDashboardStore((state) => state.resumeName);
  const resumeSlug = useDashboardStore((state) => state.resumeSlug);
  const userId = useMainStore((state) => state.userId);
  const editIndex = useMainStore((state) => state.editIndex);

  // set - zustand set state
  const setResumes = useDashboardStore((state) => state.setResumes);
  const setResumeName = useDashboardStore((state) => state.setResumeName);
  const setResumeSlug = useDashboardStore((state) => state.setResumeSlug);
  const setUserId = useMainStore((state) => state.setUserId);
  const setEditIndex = useMainStore((state) => state.setEditIndex);

  const openDeleteDialog = (resumeId: string) => {
    setResumeToDelete(resumeId);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setResumeToDelete(null);
    setDeleteDialogOpen(false);
  };

  const confirmDeleteResume = () => {
    if (resumeToDelete) {
      handleDeleteResume(resumeToDelete);
      closeDeleteDialog();
    }
  };

  const fetchResumes = async () => {
    try {
      const response = await client.get(`/resume/fetch-resumes/${userId}`);
      // set All resumes on localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data?.resumes));
      setResumes(response.data?.resumes);
    } catch (error) {
      console.error('Failed to fetch all resumes: ', error);
      throw error;
    }
  };

  // Only the initial load drives `status`; later refreshes keep the list on screen even if they fail.
  const loadInitial = async () => {
    setStatus('loading');
    try {
      await fetchResumes();
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    toast.dismiss(); // dismiss all toast upon loading
    setUserId(Cookies.get('user.id') || '');
    localStorage.clear();
  }, []);

  // Load resumes from the API
  useEffect(() => {
    getCsrfToken();
    if (userId) {
      loadInitial();
    }
  }, [userId]);

  // Submit the resume => add new or rename
  const handleResumeSubmit = async () => {
    if (!resumeName || !resumeSlug) {
      if (editIndex) {
        toast.error('Please enter a name and slug for your resume.');
      } else {
        toast.error('Please enter a name and slug for your new resume.');
      }
      return;
    }
    try {
      const url = editIndex ? `rename/${resumeToDelete}/${userId}` : `create-init/${userId}`;
      await client.post(`/resume/${url}`, {
        name: resumeName,
        slug: resumeSlug,
      });
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to add new resume: ', error);
      throw error;
    }
    fetchResumes();
  };

  const handleRename = async (resume: ResumeSummary) => {
    setResumeName(resume.resume_name);
    setResumeSlug(resume.resume_slug_name);
    setResumeToDelete(resume.id); // not for deleting, just for renaming
    setEditIndex(true);
    setCreateDialogOpen(true);
  };

  // Edit a resume: go to its templates page (no template yet) or its preview
  const handleEditResume = (resume: ResumeSummary) => {
    const key = `edit:${resume.id}`;
    if (!resume.template) {
      go(key, `/templates?resumeId=${resume.id}`, 'Opening templates...', () => {
        localStorage.removeItem('resumes');
        localStorage.setItem('slug', resume.resume_slug_name);
      });
    } else {
      go(key, `/preview?template=${resume.template}&resumeId=${resume.id}`, 'Opening resume...', () => {
        localStorage.setItem('id', resume.id);
        localStorage.setItem('template', resume.template);
        localStorage.setItem('slug', resume.resume_slug_name);
        localStorage.removeItem('resumes');
      });
    }
  };

  const handleDeleteResume = (resumeId: string) => {
    client.delete(`/resume/delete-resume/${resumeId}/${userId}`)
      .then(res => {
        toast.success(res.data?.message);
        fetchResumes();
      })
      .catch(error => {
        console.error("Failed to delete: ", error);
        throw error;
      });
  };

  const handleClone = (resumeId: string) => {
    client.post(`/resume/clone/${resumeId}/${userId}`)
      .then(res => {
        toast.success(res.data?.message);
        fetchResumes();
      }).catch(err => {
        console.error("Failed to Clone Resume: ", err);
        throw err;
      })
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const slug = slugify(value);
    setResumeSlug(slug);
  };

  const pendingEditId = pendingKey?.startsWith('edit:') ? pendingKey.slice('edit:'.length) : null;

  return (
    <AppShell>
      <DashboardView
        resumes={resumes}
        status={status}
        viewMode={viewMode}
        pendingEditId={pendingEditId}
        onViewModeChange={setViewMode}
        onCreate={() => setCreateDialogOpen(true)}
        onRetry={loadInitial}
        onEdit={handleEditResume}
        onClone={handleClone}
        onRename={handleRename}
        onDelete={openDeleteDialog}
      />

      <DeleteResumeDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setResumeToDelete(null);
        }}
        onCancel={closeDeleteDialog}
        onConfirm={confirmDeleteResume}
      />

      <ResumeFormDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setResumeName('');
            setResumeSlug('');
            setEditIndex(false);
          }
        }}
        isEdit={editIndex}
        name={resumeName}
        slug={resumeSlug}
        onNameChange={setResumeName}
        onSlugChange={handleSlugChange}
        onSubmit={handleResumeSubmit}
      />
    </AppShell>
  );
};

export default Dashboard;
