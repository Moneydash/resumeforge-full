import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import client from '@/api/axiosInstance';
import AppShell from '@/components/app-shell/AppShell';
import TemplatePicker from '@/components/template-picker/TemplatePicker';
import { usePendingNavigation } from '@/hooks/usePendingNavigation';
import clTemplates from '@/utils/cl-templates-type';
import '@/styles/templates.css';

// Cover letters have a single collection, so there is no filter and no visible group heading.
const GROUPS = [{ id: 'letters', heading: 'Cover letter templates', templates: clTemplates }];

const CLTemplates: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingKey, go } = usePendingNavigation();

  // coverLetterId from localStorage first, else from the URL
  const coverLetterId = localStorage.getItem('cl-id') || new URLSearchParams(location.search).get('coverLetterId') || '';

  const fetchCoverLetterData = async () => {
    if (coverLetterId) {
      const userId = Cookies.get('user.id');
      const request = await client.get(`/cover-letter/fetch-data/${coverLetterId}/${userId}`);
      localStorage.setItem('clFormData', request.data?.cover_letter_data);
    }
  };

  useEffect(() => {
    if (!coverLetterId) {
      navigate('/cl-dashboard');
    }
    fetchCoverLetterData();
  }, [coverLetterId]);

  // Navigates immediately; the clicked card shows "Opening..." and a loading toast until the editor appears
  const handleTemplateSelect = (templateId: string) => {
    const template = clTemplates.find((t) => t.id === templateId);
    if (!template) return;
    go(`template:${templateId}`, `/cl-preview?template=${templateId}`, `Opening "${template.name}"...`, () => {
      localStorage.setItem('cl-id', coverLetterId);
      localStorage.setItem('cl-template', templateId);
    });
  };

  const pendingId = pendingKey?.startsWith('template:') ? pendingKey.slice('template:'.length) : null;

  if (!coverLetterId) return null; // redirecting to the cover letter dashboard

  return (
    <AppShell>
      <TemplatePicker
        title="Choose a template"
        subtitle="Pick a layout for your cover letter. You can change the template later from the editor."
        groups={GROUPS}
        showGroupHeadings={false}
        pendingId={pendingId}
        onSelectTemplate={handleTemplateSelect}
      />
    </AppShell>
  );
};

export default CLTemplates;
