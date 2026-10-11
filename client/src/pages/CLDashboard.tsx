import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import client from '@/api/axiosInstance';
import AppShell from '@/components/app-shell/AppShell';
import DashboardView from '@/components/dashboard/DashboardView';
import ResumeFormDialog from '@/components/dashboard/ResumeFormDialog';
import DeleteResumeDialog from '@/components/dashboard/DeleteResumeDialog';
import { COVER_LETTER_LABELS } from '@/components/dashboard/labels';
import type { DashboardStatus, ViewMode } from '@/components/dashboard/types';
import { usePendingNavigation } from '@/hooks/usePendingNavigation';
import type { CoverLetterSummary, ResumeSummary } from '@/types';
import { useMainStore } from '@/store/useMainStore';
import { getCsrfToken, slugify } from '@/utils/helper';

const STORAGE_KEY = 'cover-letters';

// The shared dashboard components show ResumeSummary-shaped items; cover letters are adapted to that shape.
const toItem = (letter: CoverLetterSummary): ResumeSummary => ({
  id: letter.id,
  resume_name: letter.cover_letter_name,
  resume_slug_name: letter.cover_letter_slug_name,
  template: letter.template,
  updated_at: letter.updated_at,
});

const CLDashboard: React.FC = () => {
  // UI states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [status, setStatus] = useState<DashboardStatus>('loading');
  const { pendingKey, go } = usePendingNavigation();

  // cover letters and the create/rename form
  const [coverLetters, setCoverLetters] = useState<CoverLetterSummary[]>([]);
  const [coverLetterName, setCoverLetterName] = useState('');
  const [coverLetterSlug, setCoverLetterSlug] = useState('');
  const [coverLetterToDelete, setCoverLetterToDelete] = useState<string | null>(null);

  // zustand states
  const userId = useMainStore(state => state.userId);
  const setUserId = useMainStore(state => state.setUserId);
  const editIndex = useMainStore(state => state.editIndex);
  const setEditIndex = useMainStore(state => state.setEditIndex);

  const openDeleteDialog = (id: string) => {
    setCoverLetterToDelete(id);
    setDeleteDialogOpen(true);
  };
  const closeDeleteDialog = () => {
    setCoverLetterToDelete(null);
    setDeleteDialogOpen(false);
  };
  const confirmDeleteCoverLetter = () => {
    if (coverLetterToDelete) {
      handleDeleteCoverLetter(coverLetterToDelete);
      closeDeleteDialog();
    }
  };
  const handleCoverLetterSubmit = async () => {
    if (editIndex) {
      client.put(`/cover-letter/rename-cl/${coverLetterToDelete}/${userId}`, {
        name: coverLetterName,
        slug: coverLetterSlug
      })
        .then(res => {
          toast.success(res.data?.message);
          fetchCoverLetters();
        })
        .catch(error => {
          console.error("Failed to update your cover letter info: ", error);
          throw error;
        })
        .finally(() => {
          setEditIndex(false);
          setCreateDialogOpen(false);
          setCoverLetterName('');
          setCoverLetterSlug('');
        });
    } else {
      client.post(`/cover-letter/create-init/${userId}`, {
        name: coverLetterName,
        slug: coverLetterSlug,
      }).then(res => {
        toast.success(res.data?.message);
      }).catch((error) => {
        console.error('Failed to create cover letter: ', error);
        throw error;
      })
        .finally(() => {
          setCreateDialogOpen(false);
          fetchCoverLetters();
          setCoverLetterName('');
          setCoverLetterSlug('');
        });
    }
  };
  const handleRename = (item: ResumeSummary) => {
    setCoverLetterName(item.resume_name);
    setCoverLetterSlug(item.resume_slug_name);
    setCoverLetterToDelete(item.id);
    setEditIndex(true);
    setCreateDialogOpen(true);
  };

  // Edit a cover letter: go to its templates page (no template yet) or its preview
  const handleEditCoverLetter = (item: ResumeSummary) => {
    const key = `edit:${item.id}`;
    if (!item.template) {
      go(key, `/cl-templates?coverLetterId=${item.id}`, 'Opening templates...', () => {
        localStorage.removeItem('cover-letters');
        localStorage.setItem('cl-id', item.id);
      });
    } else {
      go(key, `/cl-preview?template=${item.template}&clId=${item.id}`, 'Opening cover letter...', () => {
        localStorage.removeItem('cover-letters');
        localStorage.setItem('cl-id', item.id);
        localStorage.setItem('cl-template', item.template);
        localStorage.setItem('cl-slug', item.resume_slug_name);
      });
    }
  };
  const handleDeleteCoverLetter = (id: string) => {
    client.delete(`/cover-letter/delete/${id}/${userId}`)
      .then(res => {
        toast.success(res.data?.message);
        fetchCoverLetters();
      })
      .catch((error) => {
        console.error('Failed to delete cover letter: ', error);
        throw error;
      });
  };
  const handleClone = (id: string) => {
    client.post(`/cover-letter/clone/${id}/${userId}`)
      .then(res => {
        toast.success(res.data?.message);
        fetchCoverLetters();
      })
      .catch(error => {
        console.error("Failed to clone the Cover Letter: ", error);
        throw error;
      });
  };
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const slug = slugify(value);
    setCoverLetterSlug(slug);
  };

  const fetchCoverLetters = async () => {
    try {
      const response = await client.get(`/cover-letter/fetch-cover-letters/${userId}`);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data?.cover_letters));
      setCoverLetters(response.data?.cover_letters);
    } catch (error) {
      console.error('Failed to fetch cover letters: ', error);
      throw error;
    }
  };

  // Only the initial load drives `status`; later refreshes keep the list on screen even if they fail.
  const loadInitial = async () => {
    setStatus('loading');
    try {
      await fetchCoverLetters();
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    toast.dismiss(); // dismiss all toast upon render
    setUserId(Cookies.get('user.id') || '');
    localStorage.clear();
  }, []);

  useEffect(() => {
    getCsrfToken();
    if (userId) {
      loadInitial();
    }
  }, [userId]);

  const pendingEditId = pendingKey?.startsWith('edit:') ? pendingKey.slice('edit:'.length) : null;

  return (
    <AppShell>
      <DashboardView
        labels={COVER_LETTER_LABELS}
        resumes={coverLetters.map(toItem)}
        status={status}
        viewMode={viewMode}
        pendingEditId={pendingEditId}
        onViewModeChange={setViewMode}
        onCreate={() => setCreateDialogOpen(true)}
        onRetry={loadInitial}
        onEdit={handleEditCoverLetter}
        onClone={handleClone}
        onRename={handleRename}
        onDelete={openDeleteDialog}
      />

      <DeleteResumeDialog
        labels={COVER_LETTER_LABELS}
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setCoverLetterToDelete(null);
        }}
        onCancel={closeDeleteDialog}
        onConfirm={confirmDeleteCoverLetter}
      />

      <ResumeFormDialog
        labels={COVER_LETTER_LABELS}
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setCoverLetterName('');
            setCoverLetterSlug('');
            setEditIndex(false);
          }
        }}
        isEdit={editIndex}
        name={coverLetterName}
        slug={coverLetterSlug}
        onNameChange={setCoverLetterName}
        onSlugChange={handleSlugChange}
        onSubmit={handleCoverLetterSubmit}
      />
    </AppShell>
  );
};

export default CLDashboard;
