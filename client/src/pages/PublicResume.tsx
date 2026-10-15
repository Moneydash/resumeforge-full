import React, { useEffect, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { useParams, useSearchParams } from 'react-router-dom';
import client from '@/api/axiosInstance';
import ResumePreview from '@/components/TemplateComponent';
import Loader from '@/components/SuspenseLoader';
import NotFound from '@/pages/NotFound';
import type { TemplateType } from '@/types';
import type { ResumeFormData } from '@/types/interface.resume-form-data';
import { pdfPayload } from '@/utils/helper';
import { convertLayout } from '@/utils/section-layout';
import '@/styles/landing.css';

type PrintWindow = Window & {
  __PRINT_PAYLOAD__?: unknown;
  __PRINT_READY__?: boolean;
  __PRINT_ERROR__?: boolean;
};

type Status = 'loading' | 'ready' | 'notfound' | 'error';

const statusOf = (error: unknown): Status =>
  (error as { response?: { status?: number } })?.response?.status === 404 ? 'notfound' : 'error';

// ?print=1: the server's Puppeteer opens this page and reads the same payload the owner's export posts.
const PrintMode: React.FC<{ token: string }> = ({ token }) => {
  useEffect(() => {
    const w = window as PrintWindow;
    (async () => {
      try {
        const { data: res } = await client.get(`/public/resume/${token}`);
        const parsed: ResumeFormData = JSON.parse(res.resume_data);
        const template = (res.template || 'andromeda') as TemplateType;
        // same carry-over the editor applies when the layout was arranged for another template
        const sectionLayout = parsed.sectionLayout && parsed.sectionLayout.template !== template
          ? convertLayout(parsed.sectionLayout, template, parsed)
          : parsed.sectionLayout;
        const data: ResumeFormData = { ...parsed, sectionLayout };
        const html = renderToString(<ResumePreview data={data} template={template} />);
        w.__PRINT_PAYLOAD__ = pdfPayload(data, html, template);
        w.__PRINT_READY__ = true;
      } catch {
        w.__PRINT_ERROR__ = true;
      }
    })();
  }, [token]);

  return null;
};

const ViewMode: React.FC<{ token: string }> = ({ token }) => {
  const [status, setStatus] = useState<Status>('loading');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Shared resume';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => {
      robots.remove();
    };
  }, []);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const res = await client.get(`/public/resume/${token}/pdf`, { responseType: 'blob' });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        setPdfUrl(objectUrl);
        setStatus('ready');
      } catch (error) {
        if (!cancelled) setStatus(statusOf(error));
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token]);

  if (status === 'notfound') return <NotFound />;
  if (status === 'loading') return <Loader label="Preparing resume" />;
  if (status === 'error' || !pdfUrl) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-semibold">We couldn't load this resume</h1>
        <p className="text-sm opacity-70">Please try again in a moment.</p>
        <button type="button" className="l-btn l-btn--primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </main>
    );
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const canInlinePdf = typeof navigator.pdfViewerEnabled === 'boolean' ? navigator.pdfViewerEnabled : true;
  return (
    <main className="flex min-h-screen flex-col bg-[#f2f1ec] dark:bg-[#1a1a17]">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-sm font-semibold">ResumeForge</span>
        <a className="l-btn l-btn--primary" href={`${apiUrl}/public/resume/${token}/pdf?download=1`}>
          Download PDF
        </a>
      </header>
      {canInlinePdf ? (
        <iframe title="Resume" src={`${pdfUrl}#toolbar=0&zoom=100`} className="w-full flex-1 border-0" style={{ minHeight: '85vh' }} />
      ) : (
        // some mobile browsers (Android Chrome) cannot draw a PDF inside a page: offer it as a file instead
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="max-w-sm text-sm opacity-80">This browser can't show the resume inside the page. Open or download the PDF instead.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a className="l-btn l-btn--primary" href={pdfUrl} target="_blank" rel="noopener noreferrer">
              Open PDF
            </a>
            <a className="l-btn l-btn--ghost" href={`${apiUrl}/public/resume/${token}/pdf?download=1`}>
              Download PDF
            </a>
          </div>
        </div>
      )}
    </main>
  );
};

const PublicResume: React.FC = () => {
  const { token = '' } = useParams();
  const [searchParams] = useSearchParams();
  return searchParams.get('print') === '1' ? <PrintMode token={token} /> : <ViewMode token={token} />;
};

export default PublicResume;
