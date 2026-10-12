import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import client from '@/api/axiosInstance';
import AppShell from '@/components/app-shell/AppShell';
import TemplatesView from '@/components/template-picker/TemplatesView';
import type { CollectionFilterId } from '@/components/template-picker/collections';
import { usePendingNavigation } from '@/hooks/usePendingNavigation';
import templates from '@/utils/templates-type';
import '@/styles/templates.css';

const Templates: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingKey, go } = usePendingNavigation();
  const [selected, setSelected] = useState<CollectionFilterId>('all');

  // resumeId from localStorage first, else from the URL
  const resumeId = localStorage.getItem('id') || new URLSearchParams(location.search).get('resumeId') || '';

  const fetchResumeData = async () => {
    if (resumeId) {
      const userId = Cookies.get('user.id');
      const request = await client.get(`/resume/fetch-data/${resumeId}/${userId}`);
      localStorage.setItem('resumeFormData', request.data?.resume_data);
    }
  };

  useEffect(() => {
    if (!resumeId) {
      navigate('/dashboard');
    }
    fetchResumeData();
  }, [resumeId]);

  // Navigates immediately; the clicked card shows "Opening..." and a loading toast until the editor appears
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    go(`template:${templateId}`, `/preview?template=${templateId}`, `Opening "${template.name}"...`, () => {
      localStorage.setItem('id', resumeId);
      localStorage.setItem('template', templateId);
    });
  };

  const pendingId = pendingKey?.startsWith('template:') ? pendingKey.slice('template:'.length) : null;

  if (!resumeId) return null; // redirecting to the dashboard

  return (
    <AppShell>
      <TemplatesView
        templates={templates}
        selected={selected}
        onSelectedChange={setSelected}
        pendingId={pendingId}
        onSelectTemplate={handleTemplateSelect}
      />
    </AppShell>
  );
};

export default Templates;
